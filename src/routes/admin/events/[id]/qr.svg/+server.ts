import { error } from '@sveltejs/kit';
import { qrSvg } from '$lib/qr';
import { db } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import { checkinUrl, publicBaseUrl } from '$lib/server/urls';
import type { RequestHandler } from './$types';

/** Print-ready QR for "Printed QR" events. Live-screen events have no fixed code to print. */
export const GET: RequestHandler = ({ params, url }) => {
	const event = getEvent(db, params.id);
	if (!event) error(404, 'Event not found');
	if (event.qr_mode !== 'static')
		error(409, 'This event uses a live QR code on the entrance screen.');

	const svg = qrSvg(checkinUrl(publicBaseUrl(url).base, event.id), { ecc: 'Q', margin: 4 });
	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml',
			'content-disposition': `attachment; filename="checkin-${event.id}.svg"`,
			'cache-control': 'no-store'
		}
	});
};
