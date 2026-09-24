const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter kept in memory (one Node process). Limits are generous on purpose:
 * a whole venue can share one Wi-Fi IP address.
 */
export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
	const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	const ok = recent.length < limit;
	if (ok) recent.push(now);
	hits.set(key, recent);

	if (hits.size > 5_000) {
		for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k);
	}
	return ok;
}
