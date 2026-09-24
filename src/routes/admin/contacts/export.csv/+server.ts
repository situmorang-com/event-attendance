import { listContacts } from '$lib/server/contacts';
import { csvResponse, toCsv } from '$lib/server/csv';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const iso = (ts: number | null) => (ts ? new Date(ts).toISOString() : '');
	const rows = listContacts(db, '', 1_000_000).map((c) => [
		c.name,
		c.email,
		c.phone,
		c.company,
		c.job_title,
		c.events_attended,
		c.last_event_name,
		iso(c.last_seen_at),
		iso(c.created_at)
	]);
	const csv = toCsv(
		[
			'Name',
			'Email',
			'Mobile',
			'Company',
			'Job title',
			'Events attended',
			'Last event',
			'Last seen (UTC)',
			'First seen (UTC)'
		],
		rows
	);
	return csvResponse(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
};
