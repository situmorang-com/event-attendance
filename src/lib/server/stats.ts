import type { AttendeeRow, Method } from './checkins';

export interface ArrivalBucket {
	start: number;
	count: number;
}

export interface EventStats {
	total: number;
	/** Already in the database from an earlier event. */
	returning: number;
	newContacts: number;
	devices: { ios: number; android: number; other: number };
	methods: Record<Method, number>;
	bucketMinutes: number;
	arrivals: ArrivalBucket[];
	peak: ArrivalBucket | null;
}

const BUCKET_MINUTES = [5, 10, 15, 30, 60, 120, 240, 720, 1440];
const MAX_BARS = 36;

export function computeStats(rows: AttendeeRow[], opts: { now: number; isOpen: boolean }) {
	const stats: EventStats = {
		total: rows.length,
		returning: 0,
		newContacts: 0,
		devices: { ios: 0, android: 0, other: 0 },
		methods: { form: 0, picker: 0, returning: 0, staff: 0 },
		bucketMinutes: 10,
		arrivals: [],
		peak: null
	};

	for (const r of rows) {
		if (r.is_returning) stats.returning++;
		if (r.device === 'ios' || r.device === 'android') stats.devices[r.device]++;
		else stats.devices.other++;
		stats.methods[r.method] = (stats.methods[r.method] ?? 0) + 1;
	}
	stats.newContacts = stats.total - stats.returning;
	if (!rows.length) return stats;

	const times = rows.map((r) => r.checked_in_at).sort((a, b) => a - b);
	const first = times[0];
	let last = times[times.length - 1];
	// While the doors are open, run the axis up to now so a lull shows as empty bars.
	if (opts.isOpen && opts.now > last && opts.now - last < 6 * 3600_000) last = opts.now;

	const minutes =
		BUCKET_MINUTES.find((m) => (last - first) / (m * 60_000) < MAX_BARS) ??
		BUCKET_MINUTES[BUCKET_MINUTES.length - 1];
	const size = minutes * 60_000;
	const start = Math.floor(first / size) * size;
	const end = Math.floor(last / size) * size;

	const buckets: ArrivalBucket[] = [];
	for (let t = start; t <= end; t += size) buckets.push({ start: t, count: 0 });
	for (const t of times) buckets[Math.floor((t - start) / size)].count++;

	stats.bucketMinutes = minutes;
	stats.arrivals = buckets;
	stats.peak = buckets.reduce((a, b) => (b.count > a.count ? b : a));
	return stats;
}
