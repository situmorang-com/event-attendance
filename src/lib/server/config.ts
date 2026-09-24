import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/** Shown in the consent line: "I agree that <ORG_NAME> may store…" */
export const ORG_NAME = env.ORG_NAME?.trim() || 'the organizer';
export const PRIVACY_URL = env.PRIVACY_URL?.trim() || '';

/** Country used to read local phone formats such as 0812-3456-7890. */
export const DEFAULT_PHONE_COUNTRY = (env.DEFAULT_PHONE_COUNTRY?.trim() || 'ID').toUpperCase();
export const DEFAULT_TIMEZONE = env.DEFAULT_TIMEZONE?.trim() || 'Asia/Jakarta';

/** Where attendees' phones reach the app, e.g. https://checkin.example.com. */
// ORIGIN is adapter-node's own setting; reuse it when it's already there.
const vars = env as Record<string, string | undefined>;
export const PUBLIC_BASE_URL = (vars.PUBLIC_BASE_URL?.trim() || vars.ORIGIN?.trim() || '').replace(
	/\/+$/,
	''
);

export const DB_PATH = env.DB_PATH?.trim() || 'data/attendance.db';

/** Local development falls back to "admin"; production refuses to log anyone in without one. */
export const ADMIN_PASSWORD = env.ADMIN_PASSWORD || (dev ? 'admin' : '');
export const USING_DEV_PASSWORD = dev && !env.ADMIN_PASSWORD;
