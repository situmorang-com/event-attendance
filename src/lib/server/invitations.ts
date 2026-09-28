import { companyKey, nameKey, type Reply } from '$lib/invitations';
import type { ContactRow } from './checkins';
import type { DB } from './database';

export interface InvitationRow {
	id: number;
	event_id: string;
	name: string;
	company: string;
	job_title: string;
	email: string | null;
	phone: string | null;
	linkedin: string | null;
	reply: Reply;
	note: string;
	replied_at: number | null;
	created_at: number;
	updated_at: number;
}

export interface GuestDetails {
	name: string;
	company: string;
	jobTitle: string;
	email: string | null;
	phone: string | null;
	linkedin?: string | null;
}

export interface GuestInput extends GuestDetails {
	reply?: Reply;
	note?: string;
}

export function listInvitations(db: DB, eventId: string): InvitationRow[] {
	return db
		.prepare(`SELECT * FROM invitations WHERE event_id = ? ORDER BY id`)
		.all(eventId) as InvitationRow[];
}

export function countInvitations(db: DB, eventId: string): number {
	return (
		db.prepare(`SELECT COUNT(*) AS n FROM invitations WHERE event_id = ?`).get(eventId) as {
			n: number;
		}
	).n;
}

type Identity = { name: string; company: string; email: string | null; linkedin?: string | null };

/**
 * Two entries are the same guest when the email or LinkedIn profile matches, or the name does
 * at the same company.
 */
function identities(guest: Identity): string[] {
	const keys = [`name:${nameKey(guest.name)}@${companyKey(guest.company)}`];
	if (guest.email) keys.push(`email:${guest.email}`);
	if (guest.linkedin) keys.push(`linkedin:${guest.linkedin}`);
	return keys;
}

/** Tells whether someone is already on an event's guest list. */
export function guestListCheck(db: DB, eventId: string) {
	const seen = new Set(listInvitations(db, eventId).flatMap(identities));
	return (guest: Identity) => identities(guest).some((k) => seen.has(k));
}

/** Adds everyone who isn't on the list yet; pasting the same list twice changes nothing. */
export function addInvitations(db: DB, eventId: string, guests: GuestInput[], now = Date.now()) {
	return db.transaction(() => {
		const seen = new Set(listInvitations(db, eventId).flatMap(identities));
		const insert = db.prepare(
			`INSERT INTO invitations
				(event_id, name, company, job_title, email, phone, linkedin, reply, note, replied_at,
					created_at, updated_at)
			VALUES (@eventId, @name, @company, @jobTitle, @email, @phone, @linkedin, @reply, @note,
				@repliedAt, @now, @now)`
		);
		const added: string[] = [];
		const duplicates: string[] = [];
		for (const guest of guests) {
			const keys = identities(guest);
			if (keys.some((k) => seen.has(k))) {
				duplicates.push(guest.name);
				continue;
			}
			keys.forEach((k) => seen.add(k));
			const reply = guest.reply ?? 'pending';
			insert.run({
				eventId,
				name: guest.name,
				company: guest.company,
				jobTitle: guest.jobTitle,
				email: guest.email,
				phone: guest.phone,
				linkedin: guest.linkedin ?? null,
				reply,
				note: guest.note ?? '',
				repliedAt: reply === 'pending' ? null : now,
				now
			});
			added.push(guest.name);
		}
		return { added, duplicates };
	})();
}

/** Someone who checked in without being invited, put on the list as attending. */
export function addWalkIn(db: DB, eventId: string, checkinId: number, now = Date.now()) {
	const person = db
		.prepare(
			`SELECT p.* FROM checkins c JOIN contacts p ON p.id = c.contact_id
			WHERE c.id = ? AND c.event_id = ?`
		)
		.get(checkinId, eventId) as ContactRow | undefined;
	if (!person) return null;
	const guest: GuestInput = {
		name: person.name,
		company: person.company,
		jobTitle: person.job_title,
		email: person.email,
		phone: person.phone,
		reply: 'yes'
	};
	addInvitations(db, eventId, [guest], now);
	return person.name;
}

export function setReply(db: DB, eventId: string, id: number, reply: Reply, now = Date.now()) {
	db.prepare(
		`UPDATE invitations SET
			reply = @reply,
			replied_at = CASE WHEN @reply = 'pending' THEN NULL
				WHEN reply = @reply THEN replied_at ELSE @now END,
			updated_at = @now
		WHERE id = @id AND event_id = @eventId`
	).run({ reply, now, id, eventId });
}

export function setNote(db: DB, eventId: string, id: number, note: string, now = Date.now()) {
	db.prepare(`UPDATE invitations SET note = ?, updated_at = ? WHERE id = ? AND event_id = ?`).run(
		note,
		now,
		id,
		eventId
	);
}

export function updateInvitation(
	db: DB,
	eventId: string,
	id: number,
	details: GuestDetails,
	now = Date.now()
) {
	db.prepare(
		`UPDATE invitations SET name = @name, company = @company, job_title = @jobTitle,
			email = @email, phone = @phone, linkedin = @linkedin, updated_at = @now
		WHERE id = @id AND event_id = @eventId`
	).run({ ...details, linkedin: details.linkedin ?? null, now, id, eventId });
}

export function removeInvitation(db: DB, eventId: string, id: number) {
	db.prepare(`DELETE FROM invitations WHERE id = ? AND event_id = ?`).run(id, eventId);
}

/** Renames every spelling of one company on the list, e.g. to fold "PT Batavia" into "Batavia Foods". */
export function renameCompany(
	db: DB,
	eventId: string,
	fromKey: string,
	to: string,
	now = Date.now()
) {
	const rows = db
		.prepare(`SELECT id, company FROM invitations WHERE event_id = ?`)
		.all(eventId) as {
		id: number;
		company: string;
	}[];
	const update = db.prepare(`UPDATE invitations SET company = ?, updated_at = ? WHERE id = ?`);
	db.transaction(() => {
		for (const row of rows) if (companyKey(row.company) === fromKey) update.run(to, now, row.id);
	})();
}

function mostCommon(spellings: Map<string, number>): string {
	let best = '';
	let count = 0;
	// Map order is first-seen order, so a tie goes to the spelling used first.
	for (const [spelling, n] of spellings) if (n > count) [best, count] = [spelling, n];
	return best;
}

export interface CompanyGroup<T> {
	/** companyKey(); '' for guests without a company. */
	key: string;
	name: string;
	guests: T[];
}

/** Guests by company, however each one's company was spelled. "No company" comes last. */
export function groupByCompany<T extends { company: string }>(guests: T[]): CompanyGroup<T>[] {
	const groups = new Map<string, { guests: T[]; spellings: Map<string, number> }>();
	for (const guest of guests) {
		const key = companyKey(guest.company);
		let group = groups.get(key);
		if (!group) groups.set(key, (group = { guests: [], spellings: new Map() }));
		group.guests.push(guest);
		if (key) group.spellings.set(guest.company, (group.spellings.get(guest.company) ?? 0) + 1);
	}
	return [...groups]
		.map(([key, { guests, spellings }]) => ({ key, name: mostCommon(spellings), guests }))
		.sort((a, b) =>
			!a.key ? 1 : !b.key ? -1 : a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
		);
}

/** Company names to suggest, from the contact database and every guest list, one spelling each. */
export function companySuggestions(db: DB) {
	const rows = db
		.prepare(
			`SELECT company, 1 AS contact FROM contacts WHERE company <> ''
			UNION ALL SELECT company, 0 FROM invitations WHERE company <> ''`
		)
		.all() as { company: string; contact: 0 | 1 }[];
	const byKey = new Map<string, { spellings: Map<string, number>; contacts: number }>();
	for (const { company, contact } of rows) {
		const key = companyKey(company);
		let entry = byKey.get(key);
		if (!entry) byKey.set(key, (entry = { spellings: new Map(), contacts: 0 }));
		entry.spellings.set(company, (entry.spellings.get(company) ?? 0) + 1);
		entry.contacts += contact;
	}
	return [...byKey.values()]
		.map((e) => ({ name: mostCommon(e.spellings), contacts: e.contacts }))
		.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

/** Everyone in the contact database at one company, however they spelled it at check-in. */
export function contactsAtCompany(db: DB, company: string) {
	const key = companyKey(company);
	if (!key) return [];
	const rows = db
		.prepare(
			`SELECT id, name, email, phone, company, job_title FROM contacts
			WHERE company <> '' ORDER BY name COLLATE NOCASE`
		)
		.all() as Pick<ContactRow, 'id' | 'name' | 'email' | 'phone' | 'company' | 'job_title'>[];
	return rows.filter((c) => companyKey(c.company) === key);
}

type Person = { name: string; company: string; email: string | null; phone: string | null };

/**
 * Pairs invitees with their check-ins at the event. Email and mobile match exactly; a name
 * match only counts when the companies don't contradict it. Check-ins left over are walk-ins.
 */
export function matchArrivals<
	I extends Person & { id: number },
	A extends Person & { checkin_id: number }
>(invitees: I[], checkins: A[]) {
	const arrived = new Map<number, A>();
	const taken = new Set<number>();

	const pair = (key: (p: Person) => string | null, fits: (i: I, a: A) => boolean = () => true) => {
		const index = new Map<string, A[]>();
		for (const a of checkins) {
			const k = taken.has(a.checkin_id) ? null : key(a);
			if (k) index.set(k, [...(index.get(k) ?? []), a]);
		}
		for (const i of invitees) {
			const k = arrived.has(i.id) ? null : key(i);
			if (!k) continue;
			const options = (index.get(k) ?? []).filter((a) => !taken.has(a.checkin_id) && fits(i, a));
			const best =
				options.find((a) => companyKey(a.company) === companyKey(i.company)) ?? options[0];
			if (best) {
				arrived.set(i.id, best);
				taken.add(best.checkin_id);
			}
		}
	};

	pair((p) => p.email);
	pair((p) => p.phone);
	pair(
		(p) => nameKey(p.name) || null,
		(i, a) => {
			const [x, y] = [companyKey(i.company), companyKey(a.company)];
			return !x || !y || x === y;
		}
	);

	return { arrived, walkIns: checkins.filter((a) => !taken.has(a.checkin_id)) };
}
