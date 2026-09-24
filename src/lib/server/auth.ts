import { createHash, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { ADMIN_PASSWORD } from './config';
import { secret } from './db';
import { hmac, safeEqual } from './sign';

const ADMIN_COOKIE = 'ea_admin';
const SESSION_DAYS = 14;

const sha256 = (s: string) => createHash('sha256').update(s).digest();

// Part of every session signature, so changing ADMIN_PASSWORD signs everyone out.
const passwordTag = () => sha256(ADMIN_PASSWORD).toString('base64url').slice(0, 12);

export function checkPassword(input: string): boolean {
	if (!ADMIN_PASSWORD || !input) return false;
	return timingSafeEqual(sha256(input), sha256(ADMIN_PASSWORD));
}

export function startSession(cookies: Cookies, url: URL) {
	const exp = (Date.now() + SESSION_DAYS * 86_400_000).toString(36);
	cookies.set(ADMIN_COOKIE, `${exp}.${hmac(secret, `admin:${exp}:${passwordTag()}`)}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// Plain http on a venue laptop (http://192.168.x.x) must still be able to sign in.
		secure: url.protocol === 'https:',
		maxAge: SESSION_DAYS * 86_400
	});
}

export function endSession(cookies: Cookies, url: URL) {
	// Must match how it was set: a Secure delete header is ignored over plain http.
	cookies.delete(ADMIN_COOKIE, { path: '/', secure: url.protocol === 'https:' });
}

export function isAdmin(cookies: Cookies): boolean {
	const value = cookies.get(ADMIN_COOKIE);
	if (!value || !ADMIN_PASSWORD) return false;
	const [exp, sig] = value.split('.');
	const expiresAt = parseInt(exp, 36);
	if (!sig || !Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
	return safeEqual(sig, hmac(secret, `admin:${exp}:${passwordTag()}`));
}
