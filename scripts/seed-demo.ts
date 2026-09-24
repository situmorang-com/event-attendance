// Fills the database with a demo event and ~60 realistic check-ins so the dashboard and
// entrance screen have something to show. Contacts use @example.com addresses.
//
//   npm run demo:seed            (uses DB_PATH or data/attendance.db)
//
// Runs on Node's built-in TypeScript support and reuses the app's real check-in logic.
import { checkIn, type Device, type Method } from '../src/lib/server/checkins.ts';
import { createDb } from '../src/lib/server/database.ts';
import { shortId } from '../src/lib/server/ids.ts';

const db = createDb(process.env.DB_PATH ?? 'data/attendance.db');

const PEOPLE = [
	'Rina Wijaya',
	'Andi Pratama',
	'Putri Maharani',
	'Ahmad Faiz',
	'Nur Aisyah',
	'Kevin Tan',
	'Mei Ling Chong',
	'Rizky Hidayat',
	'Anisa Rahma',
	'Hendra Gunawan',
	'Farah Nabila',
	'Jason Lim',
	'Aditya Nugroho',
	'Sarah Chen',
	'Bayu Saputra',
	'Lina Marlina',
	'Daniel Wong',
	'Yusuf Hakim',
	'Wulan Sari',
	'Arif Rahman',
	'Nadia Putri',
	'Eko Prasetyo',
	'Grace Tan',
	'Fajar Ramadhan',
	'Intan Permata',
	'Raj Kumar',
	'Priya Nair',
	'Hafiz Ismail',
	'Aina Sofea',
	'Marcus Lee',
	'Teguh Wibowo',
	'Maya Anggraini',
	'Irfan Hakim',
	'Clara Setiawan',
	'Samuel Lau',
	'Dina Oktaviani',
	'Reza Firmansyah',
	'Tasha Kaur',
	'Gilang Mahesa',
	'Vivian Ong',
	'Hadi Susanto',
	'Laras Ayu',
	'Benny Halim',
	'Sofia Rahim',
	'Yoga Permana',
	'Michelle Goh',
	'Taufik Hidayat',
	'Ayu Lestiani',
	'Rudi Hartono',
	'Amira Zulkifli',
	'Denny Kurnia',
	'Joanne Yap',
	'Galih Santosa',
	'Nabila Husna',
	'Wira Adinata',
	'Esther Koh',
	'Iqbal Maulana',
	'Siska Amelia',
	'Hanif Azhar',
	'Ratna Dewi'
];
const COMPANIES = [
	'Nusantara Logistik',
	'Batavia Foods',
	'Selat Energy',
	'Kopi Kita',
	'Garuda Retail',
	'Tanjung Health',
	'Borneo Timber Co',
	'Merdeka Finance',
	'Sinar Digital',
	'Pelita Manufacturing'
];
const TITLES = [
	'CIO',
	'IT Manager',
	'Finance Director',
	'Head of Operations',
	'CFO',
	'ERP Manager',
	''
];

const pick = <T>(list: T[], i: number) => list[i % list.length];
const person = (name: string, i: number) => ({
	name,
	email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
	phone: `+6281${String(200000000 + i * 7919).slice(0, 9)}`,
	company: pick(COMPANIES, i * 3),
	jobTitle: pick(TITLES, i * 5)
});

function createEvent(name: string, venue: string, startsAt: number, qrMode: 'rotating' | 'static') {
	const id = shortId();
	db.prepare(
		`INSERT INTO events (id, name, venue, starts_at, timezone, qr_mode, is_open, created_at)
		VALUES (?, ?, ?, ?, 'Asia/Jakarta', ?, 1, ?)`
	).run(id, name, venue, startsAt, qrMode, startsAt - 7 * 86_400_000);
	return id;
}

const now = Date.now();

// An earlier event, so some of today's attendees show up as "returning".
const earlier = createEvent(
	'Q2 Customer Meetup (demo)',
	'Jakarta',
	now - 90 * 86_400_000,
	'static'
);
PEOPLE.slice(0, 18).forEach((name, i) => {
	checkIn(
		db,
		earlier,
		person(name, i),
		{ method: 'form', device: 'ios', consent: true },
		now - 90 * 86_400_000 + i * 60_000
	);
});

// Today's event: arrivals over the last ~95 minutes, peaking about an hour ago.
const today = createEvent(
	'Partner Summit 2026 (demo)',
	'Grand Ballroom, Jakarta',
	now - 100 * 60_000,
	'rotating'
);
PEOPLE.forEach((name, i) => {
	const u = (i + 0.5) / PEOPLE.length;
	// Cosine-shaped arrival curve: a trickle, a rush in the middle, then stragglers.
	const jitter = (((i * 37) % 11) - 5) * 20_000;
	const offset = Math.min(
		94 * 60_000,
		Math.max(0, 95 * 60_000 * (0.5 + Math.asin(2 * u - 1) / Math.PI) + jitter)
	);
	const device: Device = i % 17 === 0 ? 'other' : i % 3 === 1 ? 'android' : 'ios';
	const method: Method = i < 18 && i % 2 === 0 ? 'returning' : i % 7 === 3 ? 'picker' : 'form';
	checkIn(
		db,
		today,
		person(name, i),
		{ method, device, consent: true },
		now - 95 * 60_000 + offset
	);
});

console.log(`Demo data added. Open /admin/events/${today} (and /admin/events/${today}/display).`);
