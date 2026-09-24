import { describe, expect, it } from 'vitest';
import { formatTime, fromLocalInput, toLocalInput } from './time';
import { publicName, initials } from './names';

describe('event timezone helpers', () => {
	it('reads datetime-local values as wall-clock time in the event timezone', () => {
		const ts = fromLocalInput('2026-10-01T09:00', 'Asia/Jakarta');
		expect(new Date(ts!).toISOString()).toBe('2026-10-01T02:00:00.000Z');
		expect(toLocalInput(ts!, 'Asia/Jakarta')).toBe('2026-10-01T09:00');
		expect(formatTime(ts!, 'Asia/Jakarta')).toBe('9:00 AM');
	});

	it('handles daylight-saving zones', () => {
		const ts = fromLocalInput('2026-07-01T09:00', 'Europe/London');
		expect(new Date(ts!).toISOString()).toBe('2026-07-01T08:00:00.000Z');
		expect(fromLocalInput('nope', 'UTC')).toBeNull();
	});
});

describe('names', () => {
	it('shortens names for the public screen', () => {
		expect(publicName('Rina Wijaya')).toBe('Rina W.');
		expect(publicName('Budi')).toBe('Budi');
		expect(initials('Rina Wijaya')).toBe('RW');
	});
});
