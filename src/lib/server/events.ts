import type { DB } from './database';
import { shortId } from './ids';

export type QrMode = 'rotating' | 'static';

export interface EventRow {
	id: string;
	name: string;
	venue: string;
	starts_at: number | null;
	timezone: string;
	qr_mode: QrMode;
	is_open: 0 | 1;
	created_at: number;
}

export interface EventInput {
	name: string;
	venue: string;
	startsAt: number | null;
	timezone: string;
	qrMode: QrMode;
}

export function getEvent(db: DB, id: string): EventRow | undefined {
	return db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as EventRow | undefined;
}

export type EventListRow = EventRow & {
	checkins: number;
	last_checkin_at: number | null;
	/** Guest-list size, and how many of them said yes. */
	invited: number;
	attending: number;
};

export function listEvents(db: DB) {
	return db
		.prepare(
			`SELECT e.*, COUNT(c.id) AS checkins, MAX(c.checked_in_at) AS last_checkin_at,
				(SELECT COUNT(*) FROM invitations i WHERE i.event_id = e.id) AS invited,
				(SELECT COUNT(*) FROM invitations i WHERE i.event_id = e.id AND i.reply = 'yes')
					AS attending
			FROM events e LEFT JOIN checkins c ON c.event_id = e.id
			GROUP BY e.id
			ORDER BY COALESCE(e.starts_at, e.created_at) DESC`
		)
		.all() as EventListRow[];
}

export function createEvent(db: DB, input: EventInput, now = Date.now()): string {
	const id = shortId();
	db.prepare(
		`INSERT INTO events (id, name, venue, starts_at, timezone, qr_mode, is_open, created_at)
		VALUES (@id, @name, @venue, @startsAt, @timezone, @qrMode, 1, @now)`
	).run({ ...input, id, now });
	return id;
}

export function updateEvent(db: DB, id: string, input: EventInput) {
	db.prepare(
		`UPDATE events SET name = @name, venue = @venue, starts_at = @startsAt,
			timezone = @timezone, qr_mode = @qrMode
		WHERE id = @id`
	).run({ ...input, id });
}

export function setEventOpen(db: DB, id: string, open: boolean) {
	db.prepare(`UPDATE events SET is_open = ? WHERE id = ?`).run(open ? 1 : 0, id);
}

export function deleteEvent(db: DB, id: string) {
	db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
}
