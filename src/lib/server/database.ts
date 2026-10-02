import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type DB = Database.Database;

const SCHEMA = `
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		venue TEXT NOT NULL DEFAULT '',
		starts_at INTEGER,
		timezone TEXT NOT NULL DEFAULT 'UTC',
		qr_mode TEXT NOT NULL DEFAULT 'rotating' CHECK (qr_mode IN ('rotating', 'static')),
		is_open INTEGER NOT NULL DEFAULT 1,
		created_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS contacts (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT UNIQUE,
		phone TEXT,
		company TEXT NOT NULL DEFAULT '',
		job_title TEXT NOT NULL DEFAULT '',
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

	CREATE TABLE IF NOT EXISTS checkins (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
		checked_in_at INTEGER NOT NULL,
		method TEXT NOT NULL,
		device TEXT NOT NULL,
		consent_at INTEGER,
		UNIQUE (event_id, contact_id)
	);
	CREATE INDEX IF NOT EXISTS idx_checkins_event ON checkins(event_id, checked_in_at);
	CREATE INDEX IF NOT EXISTS idx_checkins_contact ON checkins(contact_id);

	-- The guest list an organizer plans before the event. Deliberately not tied to contacts:
	-- people are often invited by name alone, long before they ever check in.
	CREATE TABLE IF NOT EXISTS invitations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		company TEXT NOT NULL DEFAULT '',
		job_title TEXT NOT NULL DEFAULT '',
		email TEXT,
		phone TEXT,
		linkedin TEXT,
		reply TEXT NOT NULL DEFAULT 'pending' CHECK (reply IN ('pending', 'yes', 'maybe', 'no')),
		note TEXT NOT NULL DEFAULT '',
		replied_at INTEGER,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_invitations_event ON invitations(event_id);
	CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

	-- Who an event is for, answered on the planning page; it briefs the research agent.
	CREATE TABLE IF NOT EXISTS invite_briefs (
		event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
		goal TEXT NOT NULL DEFAULT '',
		roles TEXT NOT NULL DEFAULT '',
		seniority TEXT NOT NULL DEFAULT '[]',
		departments TEXT NOT NULL DEFAULT '[]',
		per_company INTEGER NOT NULL DEFAULT 3,
		avoid TEXT NOT NULL DEFAULT '',
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS target_companies (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		website TEXT NOT NULL DEFAULT '',
		-- Overrides the brief for this company: "only their finance team".
		focus TEXT NOT NULL DEFAULT '',
		created_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_targets_event ON target_companies(event_id);

	-- People the research agent proposes. Nothing reaches the guest list until approved, and a
	-- dismissed person stays here so they aren't proposed again.
	CREATE TABLE IF NOT EXISTS suggestions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		company TEXT NOT NULL,
		name TEXT NOT NULL,
		job_title TEXT NOT NULL DEFAULT '',
		linkedin TEXT,
		source_url TEXT NOT NULL DEFAULT '',
		reason TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'added', 'dismissed')),
		created_at INTEGER NOT NULL,
		decided_at INTEGER
	);
	CREATE INDEX IF NOT EXISTS idx_suggestions_event ON suggestions(event_id, status);

	-- Bearer tokens for the research API. Only a hash is kept; the token is shown once.
	CREATE TABLE IF NOT EXISTS api_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		label TEXT NOT NULL,
		hash TEXT NOT NULL UNIQUE,
		created_at INTEGER NOT NULL,
		last_used_at INTEGER,
		revoked_at INTEGER
	);
`;

/** Brings a database up to date. Safe to run on every start, and on a reused connection. */
export function migrate(db: DB) {
	db.exec(SCHEMA);
	// Columns added after their table first shipped: CREATE TABLE IF NOT EXISTS won't add them.
	const has = (table: string, column: string) =>
		(db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some(
			(c) => c.name === column
		);
	if (!has('invitations', 'linkedin')) db.exec(`ALTER TABLE invitations ADD COLUMN linkedin TEXT`);
}

/** Opens (and migrates) a SQLite database. Pass ':memory:' for tests. */
export function createDb(path: string): DB {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	migrate(db);
	return db;
}
