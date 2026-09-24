import { networkInterfaces } from 'node:os';
import { PUBLIC_BASE_URL } from './config';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

function lanAddress(): string | null {
	for (const list of Object.values(networkInterfaces())) {
		for (const i of list ?? []) {
			if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) return i.address;
		}
	}
	return null;
}

/**
 * The base URL printed into QR codes. Phones can't open "localhost", so when the organizer is
 * browsing on localhost we swap in this machine's Wi-Fi address; phones on the same network
 * can then scan straight away.
 */
export function publicBaseUrl(url: URL): { base: string; reachable: boolean } {
	if (PUBLIC_BASE_URL) return { base: PUBLIC_BASE_URL, reachable: true };
	if (LOOPBACK.has(url.hostname)) {
		const ip = lanAddress();
		if (ip)
			return { base: `${url.protocol}//${ip}${url.port ? `:${url.port}` : ''}`, reachable: true };
		return { base: url.origin, reachable: false };
	}
	return { base: url.origin, reachable: true };
}

export function checkinUrl(base: string, eventId: string, token?: string) {
	return `${base}/c/${eventId}${token ? `?t=${token}` : ''}`;
}
