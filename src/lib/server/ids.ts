import { randomBytes } from 'node:crypto';

// No 0/o/1/l/i so ids survive being read aloud or typed from a poster.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function shortId(length = 8): string {
	const bytes = randomBytes(length);
	let out = '';
	for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
	return out;
}
