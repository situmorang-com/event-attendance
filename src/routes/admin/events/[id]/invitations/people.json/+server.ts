import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import { contactsAtCompany, guestListCheck } from '$lib/server/invitations';
import type { RequestHandler } from './$types';

/** People in the contact database at one company, for "add from your contacts". */
export const GET: RequestHandler = ({ params, url }) => {
	const event = getEvent(db, params.id);
	if (!event) error(404, 'Event not found');

	const company = url.searchParams.get('company') ?? '';
	const onList = guestListCheck(db, event.id);
	const people = contactsAtCompany(db, company)
		.slice(0, 300)
		.map((c) => ({
			id: c.id,
			name: c.name,
			jobTitle: c.job_title,
			email: c.email,
			invited: onList({ name: c.name, company, email: c.email })
		}));
	return json({ people }, { headers: { 'cache-control': 'no-store' } });
};
