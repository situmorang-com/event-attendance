import { randomUUID } from 'node:crypto';
import type { DB } from './database';

export type Method = 'form' | 'picker' | 'returning' | 'staff';
export type Device = 'ios' | 'android' | 'desktop' | 'other';

export interface ContactInput {
	name: string;
	email: string | null;
	phone: string | null;
	company: string;
	jobTitle: string;
}

export interface ContactRow {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	company: string;
	job_title: string;
	created_at: number;
	updated_at: number;
}

export interface CheckinResult {
	status: 'created' | 'existing';
	contactId: string;
	checkinId: number;
	checkedInAt: number;
	/** Arrival position within the event: "you're attendee #42". */
	number: number;
	isNewContact: boolean;
}

/**
 * Email is the identity. A phone match only counts when it can't be a different person,
 * i.e. the stored contact has no email or the new submission has none.
 */
export function findContact(db: DB, input: Pick<ContactInput, 'email' | 'phone'>) {
	if (input.email) {
		const byEmail = db.prepare(`SELECT * FROM contacts WHERE email = ?`).get(input.email);
		if (byEmail) return byEmail as ContactRow;
	}
	if (input.phone) {
		const byPhone = db
			.prepare(`SELECT * FROM contacts WHERE phone = ? ORDER BY updated_at DESC LIMIT 1`)
			.get(input.phone) as ContactRow | undefined;
		if (byPhone && (!byPhone.email || !input.email)) return byPhone;
	}
	return undefined;
}

/** Latest non-empty details win, so the database improves every time someone checks in. */
export function upsertContact(db: DB, input: ContactInput, now = Date.now()) {
	const existing = findContact(db, input);
	if (existing) {
		db.prepare(
			`UPDATE contacts SET
				name = @name,
				email = COALESCE(@email, email),
				phone = COALESCE(@phone, phone),
				company = CASE WHEN @company <> '' THEN @company ELSE company END,
				job_title = CASE WHEN @jobTitle <> '' THEN @jobTitle ELSE job_title END,
				updated_at = @now
			WHERE id = @id`
		).run({ ...input, name: input.name || existing.name, now, id: existing.id });
		return { id: existing.id, isNew: false };
	}
	const id = randomUUID();
	db.prepare(
		`INSERT INTO contacts (id, name, email, phone, company, job_title, created_at, updated_at)
		VALUES (@id, @name, @email, @phone, @company, @jobTitle, @now, @now)`
	).run({ ...input, id, now });
	return { id, isNew: true };
}

export function checkIn(
	db: DB,
	eventId: string,
	input: ContactInput,
	meta: { method: Method; device: Device; consent: boolean },
	now = Date.now()
): CheckinResult {
	return db.transaction((): CheckinResult => {
		const { id: contactId, isNew } = upsertContact(db, input, now);
		const position = db.prepare(
			`SELECT COUNT(*) AS n FROM checkins WHERE event_id = ? AND id <= ?`
		);

		const existing = db
			.prepare(`SELECT id, checked_in_at FROM checkins WHERE event_id = ? AND contact_id = ?`)
			.get(eventId, contactId) as { id: number; checked_in_at: number } | undefined;
		if (existing) {
			const { n } = position.get(eventId, existing.id) as { n: number };
			return {
				status: 'existing',
				contactId,
				checkinId: existing.id,
				checkedInAt: existing.checked_in_at,
				number: n,
				isNewContact: false
			};
		}

		const { lastInsertRowid } = db
			.prepare(
				`INSERT INTO checkins (event_id, contact_id, checked_in_at, method, device, consent_at)
				VALUES (?, ?, ?, ?, ?, ?)`
			)
			.run(eventId, contactId, now, meta.method, meta.device, meta.consent ? now : null);
		const { n } = position.get(eventId, lastInsertRowid) as { n: number };
		return {
			status: 'created',
			contactId,
			checkinId: Number(lastInsertRowid),
			checkedInAt: now,
			number: n,
			isNewContact: isNew
		};
	})();
}

export function removeCheckin(db: DB, eventId: string, checkinId: number) {
	db.prepare(`DELETE FROM checkins WHERE id = ? AND event_id = ?`).run(checkinId, eventId);
}

export interface AttendeeRow {
	checkin_id: number;
	contact_id: string;
	name: string;
	email: string | null;
	phone: string | null;
	company: string;
	job_title: string;
	checked_in_at: number;
	method: Method;
	device: Device;
	consent_at: number | null;
	/** Attended an earlier event, i.e. was already in the database. */
	is_returning: 0 | 1;
}

export function listAttendees(db: DB, eventId: string): AttendeeRow[] {
	return db
		.prepare(
			`SELECT c.id AS checkin_id, p.id AS contact_id, p.name, p.email, p.phone, p.company,
				p.job_title, c.checked_in_at, c.method, c.device, c.consent_at,
				EXISTS (
					SELECT 1 FROM checkins prev
					WHERE prev.contact_id = c.contact_id AND prev.event_id <> c.event_id
						AND prev.checked_in_at < c.checked_in_at
				) AS is_returning
			FROM checkins c JOIN contacts p ON p.id = c.contact_id
			WHERE c.event_id = ?
			ORDER BY c.checked_in_at DESC`
		)
		.all(eventId) as AttendeeRow[];
}

export interface RecentArrival {
	id: number;
	name: string;
	company: string;
	at: number;
}

export function recentArrivals(db: DB, eventId: string, limit = 12): RecentArrival[] {
	return db
		.prepare(
			`SELECT c.id, p.name, p.company, c.checked_in_at AS at
			FROM checkins c JOIN contacts p ON p.id = c.contact_id
			WHERE c.event_id = ? ORDER BY c.checked_in_at DESC, c.id DESC LIMIT ?`
		)
		.all(eventId, limit) as RecentArrival[];
}

export function countCheckins(db: DB, eventId: string): number {
	return (
		db.prepare(`SELECT COUNT(*) AS n FROM checkins WHERE event_id = ?`).get(eventId) as {
			n: number;
		}
	).n;
}
