import type { Device } from './checkins';

// iPadOS Safari reports itself as a Mac, so iPads land in "desktop"; good enough for stats.
export function deviceFromUserAgent(ua: string | null): Device {
	if (!ua) return 'other';
	if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
	if (/Android/i.test(ua)) return 'android';
	if (/Mobi/i.test(ua)) return 'other';
	return 'desktop';
}
