import type { DB } from './database';

export interface ContactListRow {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	company: string;
	job_title: string;
	created_at: number;
	events_attended: number;
	last_seen_at: number | null;
	last_event_name: string | null;
}

function likePattern(q: string) {
	return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function listContacts(db: DB, q = '', limit = 1000): ContactListRow[] {
	const search = q.trim();
	return db
		.prepare(
			`SELECT p.id, p.name, p.email, p.phone, p.company, p.job_title, p.created_at,
				COUNT(c.id) AS events_attended,
				MAX(c.checked_in_at) AS last_seen_at,
				(SELECT e.name FROM checkins c2 JOIN events e ON e.id = c2.event_id
					WHERE c2.contact_id = p.id ORDER BY c2.checked_in_at DESC LIMIT 1) AS last_event_name
			FROM contacts p LEFT JOIN checkins c ON c.contact_id = p.id
			WHERE @q = '' OR p.name LIKE @like ESCAPE '\\' OR p.email LIKE @like ESCAPE '\\'
				OR p.company LIKE @like ESCAPE '\\' OR p.phone LIKE @like ESCAPE '\\'
			GROUP BY p.id
			ORDER BY COALESCE(MAX(c.checked_in_at), p.created_at) DESC
			LIMIT @limit`
		)
		.all({ q: search, like: likePattern(search), limit }) as ContactListRow[];
}

export function countContacts(db: DB): number {
	return (db.prepare(`SELECT COUNT(*) AS n FROM contacts`).get() as { n: number }).n;
}

export function deleteContact(db: DB, id: string) {
	db.prepare(`DELETE FROM contacts WHERE id = ?`).run(id);
}
