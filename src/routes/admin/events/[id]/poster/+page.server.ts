import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import { checkinUrl, publicBaseUrl } from '$lib/server/urls';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const event = getEvent(db, params.id);
	if (!event) error(404, 'Event not found');
	const link = checkinUrl(publicBaseUrl(url).base, event.id);
	return {
		event: {
			id: event.id,
			name: event.name,
			venue: event.venue,
			rotating: event.qr_mode === 'rotating'
		},
		link,
		shortLink: link.replace(/^https?:\/\//, '')
	};
};
