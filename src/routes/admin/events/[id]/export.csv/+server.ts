import { error } from '@sveltejs/kit';
import { listAttendees } from '$lib/server/checkins';
import { csvResponse, toCsv } from '$lib/server/csv';
import { db } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const event = getEvent(db, params.id);
	if (!event) error(404, 'Event not found');

	const iso = (ts: number | null) => (ts ? new Date(ts).toISOString() : '');
	const rows = listAttendees(db, event.id)
		.reverse()
		.map((a, i) => [
			i + 1,
			a.name,
			a.email,
			a.phone,
			a.company,
			a.job_title,
			iso(a.checked_in_at),
			a.method,
			a.device,
			a.is_returning ? 'yes' : 'no',
			iso(a.consent_at)
		]);

	const csv = toCsv(
		[
			'#',
			'Name',
			'Email',
			'Mobile',
			'Company',
			'Job title',
			'Checked in (UTC)',
			'Method',
			'Device',
			'Returning',
			'Consent given (UTC)'
		],
		rows
	);
	return csvResponse(`${event.name}-attendees.csv`, csv);
};
