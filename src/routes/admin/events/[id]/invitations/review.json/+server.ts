import { error, json } from '@sveltejs/kit';
import { DEFAULT_PHONE_COUNTRY } from '$lib/server/config';
import { db } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import { parseGuestList } from '$lib/server/guest-list';
import { cleanText } from '$lib/server/normalize';
import type { RequestHandler } from './$types';

/**
 * Splits typed or pasted lines into fields for the organizer to check before anything is
 * saved. Lines without a name come back too, named '', so they can be filled in.
 */
export const POST: RequestHandler = async ({ params, request }) => {
	if (!getEvent(db, params.id)) error(404, 'Event not found');
	const body = (await request.json().catch(() => ({}))) as { company?: unknown; names?: unknown };
	const { guests, truncated } = parseGuestList(String(body.names ?? ''), {
		company: cleanText(body.company, 120),
		country: DEFAULT_PHONE_COUNTRY,
		keepNameless: true
	});
	return json({ guests, truncated }, { headers: { 'cache-control': 'no-store' } });
};
