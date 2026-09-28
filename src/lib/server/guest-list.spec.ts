import { describe, expect, it } from 'vitest';
import { parseGuestList, parseReply } from './guest-list';

const opts = { company: 'Batavia Foods', country: 'ID' };

describe('parseGuestList', () => {
	it('reads one person per line, details in any order after the name', () => {
		const text =
			'Rina Wijaya\n\n  \nAndi Pratama, IT Manager, ANDI@batavia.co.id, 0812-3456-7890\n';
		expect(parseGuestList(text, opts)).toEqual({
			guests: [
				{
					name: 'Rina Wijaya',
					company: 'Batavia Foods',
					jobTitle: '',
					email: null,
					phone: null,
					linkedin: null,
					reply: 'pending',
					note: ''
				},
				{
					name: 'Andi Pratama',
					company: 'Batavia Foods',
					jobTitle: 'IT Manager',
					email: 'andi@batavia.co.id',
					phone: '+6281234567890',
					linkedin: null,
					reply: 'pending',
					note: ''
				}
			],
			skipped: [],
			truncated: false
		});
	});

	it('keeps degrees with the name and picks up a reply', () => {
		const { guests } = parseGuestList(
			'1. Budi Santoso, S.Kom., M.M., Head of IT, APAC, hadir',
			opts
		);
		expect(guests[0]).toMatchObject({
			name: 'Budi Santoso, S.Kom., M.M.',
			jobTitle: 'Head of IT, APAC',
			reply: 'yes'
		});
	});

	it('reads a spreadsheet paste by its header row', () => {
		const text = [
			'No.\tNama\tPerusahaan\tJabatan\tNo. HP\tKonfirmasi',
			'1\tRina Wijaya\tSelat Energy\tCFO\t0812 3456 7890\tHadir',
			'2\tAndi Pratama\t\t"Head of IT, APAC"\t\tYes, with a colleague',
			'3\t\t\t\t\t'
		].join('\n');
		const { guests, skipped } = parseGuestList(text, opts);
		expect(guests).toEqual([
			expect.objectContaining({
				name: 'Rina Wijaya',
				company: 'Selat Energy',
				jobTitle: 'CFO',
				phone: '+6281234567890',
				reply: 'yes',
				note: ''
			}),
			expect.objectContaining({
				name: 'Andi Pratama',
				company: 'Batavia Foods',
				jobTitle: 'Head of IT, APAC',
				reply: 'pending',
				note: 'Yes, with a colleague'
			})
		]);
		expect(skipped).toEqual(['3']);
	});

	it('joins first and last names and prefers the job title in an Outlook export', () => {
		const text =
			'Title,First Name,Last Name,Company,Job Title,E-mail Address,Mobile Phone\n' +
			'Ms,Mei Ling,Chong,Sinar Digital,CTO,meiling@sinar.my,012-345 6789';
		const { guests } = parseGuestList(text, { company: '', country: 'MY' });
		expect(guests).toEqual([
			{
				name: 'Mei Ling Chong',
				company: 'Sinar Digital',
				jobTitle: 'CTO',
				email: 'meiling@sinar.my',
				phone: '+60123456789',
				linkedin: null,
				reply: 'pending',
				note: ''
			}
		]);
	});

	it('takes a LinkedIn link, on its own or with details, and reads the name from it', () => {
		const text = [
			'https://www.linkedin.com/in/rina-wijaya-4a1b2c',
			'Andi Pratama, CFO, linkedin.com/in/andi-p',
			'https://www.linkedin.com/in/rinaw88'
		].join('\n');
		const { guests, skipped } = parseGuestList(text, opts);
		expect(guests.map((g) => [g.name, g.jobTitle, g.linkedin])).toEqual([
			['Rina Wijaya', '', 'https://www.linkedin.com/in/rina-wijaya-4a1b2c'],
			['Andi Pratama', 'CFO', 'https://www.linkedin.com/in/andi-p']
		]);
		expect(skipped).toEqual(['https://www.linkedin.com/in/rinaw88']);
	});

	it('reads a LinkedIn column, and keeps nameless rows when asked to', () => {
		const text = 'Name\tLinkedIn\n\thttps://linkedin.com/in/rinaw88\nPutri\t';
		const { guests } = parseGuestList(text, { ...opts, keepNameless: true });
		expect(guests.map((g) => [g.name, g.linkedin])).toEqual([
			['', 'https://www.linkedin.com/in/rinaw88'],
			['Putri', null]
		]);
	});

	it('reports lines it has no name for', () => {
		expect(parseGuestList('rina@example.com\n0812 3456 7890', opts)).toMatchObject({
			guests: [],
			skipped: ['rina@example.com', '0812 3456 7890']
		});
	});
});

describe('parseReply', () => {
	it('understands English and Indonesian answers', () => {
		expect(['Yes', 'confirmed', 'Hadir', 'Akan hadir'].map(parseReply)).toEqual(
			Array(4).fill('yes')
		);
		expect(['Tentative', 'TBC', 'mungkin'].map(parseReply)).toEqual(Array(3).fill('maybe'));
		expect(['No.', 'Declined', 'Tidak hadir', 'berhalangan'].map(parseReply)).toEqual(
			Array(4).fill('no')
		);
		expect(['No reply', '-', 'belum konfirmasi'].map(parseReply)).toEqual(Array(3).fill('pending'));
		expect(parseReply('Yes, with a colleague')).toBeNull();
	});
});
