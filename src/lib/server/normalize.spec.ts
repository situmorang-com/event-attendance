import { describe, expect, it } from 'vitest';
import { cleanText, isValidEmail, normalizeEmail, normalizePhone } from './normalize';
import { toCsv } from './csv';

describe('normalizePhone', () => {
	it('turns local contact-card formats into E.164', () => {
		expect(normalizePhone('0812-3456-7890', 'ID')).toBe('+6281234567890');
		expect(normalizePhone('+60 12-345 6789', 'ID')).toBe('+60123456789');
		expect(normalizePhone('012-345 6789', 'MY')).toBe('+60123456789');
	});

	it('keeps unparseable numbers as digits rather than dropping them', () => {
		expect(normalizePhone('ext. 12345678', 'ID')).toBe('12345678');
		expect(normalizePhone('', 'ID')).toBeNull();
		expect(normalizePhone('123', 'ID')).toBeNull();
	});
});

describe('text and email', () => {
	it('cleans whitespace and case', () => {
		expect(cleanText('  Rina \n Wijaya ')).toBe('Rina Wijaya');
		expect(normalizeEmail(' Rina@Example.COM ')).toBe('rina@example.com');
		expect(normalizeEmail('   ')).toBeNull();
		expect(isValidEmail('rina@example.com')).toBe(true);
		expect(isValidEmail('rina@example')).toBe(false);
	});
});

describe('toCsv', () => {
	it('neutralises spreadsheet formulas but leaves phone numbers readable', () => {
		const csv = toCsv(['name', 'phone'], [['=HYPERLINK("x")', '+6281234567890']]);
		expect(csv).toContain(`"'=HYPERLINK(""x"")",+6281234567890`);
	});
});
