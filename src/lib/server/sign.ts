import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { DB } from './database';

export function hmac(secret: string, message: string): string {
	return createHmac('sha256', secret).update(message).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** `value.signature` — tamper-evident, not encrypted. */
export function signValue(secret: string, value: string): string {
	return `${value}.${hmac(secret, `value:${value}`).slice(0, 22)}`;
}

export function unsignValue(secret: string, signed: string | undefined): string | null {
	if (!signed) return null;
	const dot = signed.lastIndexOf('.');
	if (dot <= 0) return null;
	const value = signed.slice(0, dot);
	return safeEqual(signed, signValue(secret, value)) ? value : null;
}

/**
 * The app-wide signing secret: SESSION_SECRET if set, otherwise generated once and kept in
 * the database so sessions and QR passes survive restarts without any configuration.
 */
export function loadSecret(db: DB, fromEnv?: string): string {
	if (fromEnv) return fromEnv;
	const row = db.prepare(`SELECT value FROM settings WHERE key = 'secret'`).get() as
		{ value: string } | undefined;
	if (row) return row.value;
	const secret = randomBytes(32).toString('base64url');
	db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('secret', ?)`).run(secret);
	return (db.prepare(`SELECT value FROM settings WHERE key = 'secret'`).get() as { value: string })
		.value;
}
