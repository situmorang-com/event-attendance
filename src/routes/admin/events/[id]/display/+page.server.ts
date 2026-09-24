import { error } from '@sveltejs/kit';
import { publicName } from '$lib/names';
import { countCheckins, recentArrivals } from '$lib/server/checkins';
import { db, secret } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import { nextRotationAt, QR_ROTATE_SECONDS, qrToken } from '$lib/server/qr-token';
import { checkinUrl, publicBaseUrl } from '$lib/server/urls';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const event = getEvent(db, params.id);
	if (!event) error(404, 'Event not found');

	const { base, reachable } = publicBaseUrl(url);
	const rotating = event.qr_mode === 'rotating';

	return {
		event: {
			id: event.id,
			name: event.name,
			venue: event.venue,
			timezone: event.timezone,
			isOpen: !!event.is_open,
			rotating
		},
		count: countCheckins(db, event.id),
		// The entrance screen is public: first name and last initial only.
		recent: recentArrivals(db, event.id, 7).map((a) => ({ ...a, name: publicName(a.name) })),
		qr: {
			url: checkinUrl(base, event.id, rotating ? qrToken(secret, event.id) : undefined),
			rotatesAt: rotating ? nextRotationAt() : null
		},
		rotateSeconds: QR_ROTATE_SECONDS,
		shortLink: `${base.replace(/^https?:\/\//, '')}/c/${event.id}`,
		reachable,
		serverNow: Date.now()
	};
};
