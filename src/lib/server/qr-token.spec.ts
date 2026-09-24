import { describe, expect, it } from 'vitest';
import {
	issuePass,
	PASS_TTL_MS,
	QR_ROTATE_SECONDS,
	qrSlot,
	qrToken,
	verifyPass,
	verifyQrToken
} from './qr-token';

const secret = 'test-secret';
const now = 1_790_000_000_000;
const rotation = QR_ROTATE_SECONDS * 1000;

describe('rotating QR tokens', () => {
	it('accepts the code on screen and one scanned a little while ago', () => {
		const token = qrToken(secret, 'evt1', qrSlot(now));
		expect(verifyQrToken(secret, 'evt1', token, now)).toBe(true);
		expect(verifyQrToken(secret, 'evt1', token, now + 3 * rotation)).toBe(true);
	});

	it('rejects a forwarded screenshot once it is a couple of minutes old', () => {
		const token = qrToken(secret, 'evt1', qrSlot(now));
		expect(verifyQrToken(secret, 'evt1', token, now + 10 * rotation)).toBe(false);
	});

	it('rejects tokens for another event, from the future, or tampered with', () => {
		const token = qrToken(secret, 'evt1', qrSlot(now));
		expect(verifyQrToken(secret, 'evt2', token, now)).toBe(false);
		expect(verifyQrToken(secret, 'evt1', qrToken(secret, 'evt1', qrSlot(now) + 1), now)).toBe(
			false
		);
		expect(verifyQrToken(secret, 'evt1', token.slice(0, -1) + 'x', now)).toBe(false);
		expect(verifyQrToken(secret, 'evt1', 'garbage', now)).toBe(false);
		expect(verifyQrToken(secret, 'evt1', null, now)).toBe(false);
	});
});

describe('check-in passes', () => {
	it('lasts long enough to fill in the form, then expires', () => {
		const pass = issuePass(secret, 'evt1', now);
		expect(verifyPass(secret, 'evt1', pass, now + 60_000)).toBe(true);
		expect(verifyPass(secret, 'evt1', pass, now + PASS_TTL_MS + 1_000)).toBe(false);
		expect(verifyPass(secret, 'evt2', pass, now)).toBe(false);
	});
});
