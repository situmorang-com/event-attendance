import { hmac, safeEqual } from './sign';

/** How often the live QR on the entrance screen changes. */
export const QR_ROTATE_SECONDS = 20;
/** A scanned code keeps working for this many extra rotations (slow cameras, bad Wi-Fi). */
const QR_GRACE_ROTATIONS = 4;
/** Once a valid code is scanned, the attendee has this long to fill in the form. */
export const PASS_TTL_MS = 30 * 60 * 1000;

export function qrSlot(now = Date.now()): number {
	return Math.floor(now / 1000 / QR_ROTATE_SECONDS);
}

export function nextRotationAt(now = Date.now()): number {
	return (qrSlot(now) + 1) * QR_ROTATE_SECONDS * 1000;
}

export function qrToken(secret: string, eventId: string, slot = qrSlot()): string {
	const s = slot.toString(36);
	return `${s}.${hmac(secret, `qr:${eventId}:${s}`).slice(0, 10)}`;
}

export function verifyQrToken(
	secret: string,
	eventId: string,
	token: string | null | undefined,
	now = Date.now()
): boolean {
	if (!token) return false;
	const slot = parseInt(token.split('.')[0], 36);
	if (!Number.isSafeInteger(slot)) return false;
	const current = qrSlot(now);
	if (slot > current || current - slot > QR_GRACE_ROTATIONS) return false;
	return safeEqual(token, qrToken(secret, eventId, slot));
}

/** Proof that this browser scanned a live code recently; carried in a hidden form field. */
export function issuePass(secret: string, eventId: string, now = Date.now()): string {
	const t = Math.floor(now / 1000).toString(36);
	return `${t}.${hmac(secret, `pass:${eventId}:${t}`).slice(0, 16)}`;
}

export function verifyPass(
	secret: string,
	eventId: string,
	pass: string | null | undefined,
	now = Date.now()
): boolean {
	if (!pass) return false;
	const t = pass.split('.')[0];
	const issuedAt = parseInt(t, 36) * 1000;
	if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 5_000 || now - issuedAt > PASS_TTL_MS)
		return false;
	return safeEqual(pass, `${t}.${hmac(secret, `pass:${eventId}:${t}`).slice(0, 16)}`);
}
