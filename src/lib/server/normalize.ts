import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/** Collapses whitespace and caps length; safe for anything a browser or autofill sends us. */
export function cleanText(raw: unknown, max = 120): string {
	return String(raw ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
}

export function normalizeEmail(raw: unknown): string | null {
	const email = cleanText(raw, 254).toLowerCase();
	return email || null;
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * E.164 (+628123456789) when the number parses for `country`, otherwise digits and a leading +.
 * Contact cards often store local formats like "0812-3456-7890", hence the default country.
 */
export function normalizePhone(raw: unknown, country: string): string | null {
	const input = cleanText(raw, 40);
	if (!input) return null;
	const parsed = parsePhoneNumberFromString(input, country.toUpperCase() as CountryCode);
	if (parsed?.isValid()) return parsed.number;
	const cleaned = input.replace(/(?!^\+)[^\d]/g, '');
	return cleaned.replace(/\D/g, '').length >= 6 ? cleaned : null;
}
