import { describe, expect, it } from 'vitest';
import {
	companyKey,
	followUpLink,
	followUpMessage,
	greetingName,
	linkedinProfile,
	nameFromLinkedin,
	nameKey
} from './invitations';

describe('matching keys', () => {
	it('ignores titles, degrees, case and accents in names', () => {
		expect(nameKey('Bapak Hendra Gunawan')).toBe('hendra gunawan');
		expect(nameKey("Dato' Dr. Ahmad Faiz, S.Kom.")).toBe('ahmad faiz');
		expect(nameKey('ROSA NÚÑEZ')).toBe('rosa nunez');
		expect(nameKey('Pak')).toBe('pak');
	});

	it('ignores legal forms and punctuation in company names', () => {
		expect(companyKey('PT. Batavia Foods Tbk')).toBe('batavia foods');
		expect(companyKey('Selat Energy Sdn. Bhd.')).toBe('selat energy');
		expect(companyKey('PT')).toBe('pt');
		expect(companyKey('')).toBe('');
	});

	it('greets people the way the list names them', () => {
		expect(greetingName('Rina Wijaya')).toBe('Rina');
		expect(greetingName('Bapak Hendra Gunawan')).toBe('Bapak Hendra');
		expect(greetingName('Budi, S.Kom.')).toBe('Budi');
	});
});

describe('follow-up messages', () => {
	const event = {
		name: 'Partner Summit',
		venue: 'Grand Ballroom, Jakarta',
		starts_at: Date.UTC(2026, 9, 13, 2, 0),
		timezone: 'Asia/Jakarta'
	};

	it('matches the reply', () => {
		expect(followUpMessage('pending', 'Rina Wijaya', event)).toBe(
			"Hi Rina, we'd love to have you at Partner Summit on Tue, 13 Oct 2026 at 9:00 AM, Grand Ballroom, Jakarta. Will you be able to join us?"
		);
		expect(followUpMessage('yes', 'Rina Wijaya', event)).toMatch(
			/^Hi Rina, thank you for confirming!/
		);
		expect(followUpMessage('maybe', 'Rina Wijaya', event)).toMatch(/pencilled you in/);
		expect(followUpMessage('no', 'Rina Wijaya', event)).toBe(
			"Hi Rina, thank you for letting us know. We'll miss you at Partner Summit, and we hope to see you at the next one."
		);
	});

	it('leaves out what the event does not have', () => {
		const bare = { ...event, starts_at: null };
		expect(followUpMessage('yes', 'Rina', bare)).toBe(
			'Hi Rina, thank you for confirming! We look forward to seeing you at Partner Summit at Grand Ballroom, Jakarta.'
		);
		expect(followUpMessage('yes', 'Rina', { ...bare, venue: '' })).toMatch(/at Partner Summit\.$/);
	});

	it('opens WhatsApp for international mobiles, email otherwise', () => {
		expect(followUpLink({ phone: '+6281234567890', email: 'r@x.com' }, 'S', 'Hi Rina')).toEqual({
			via: 'whatsapp',
			href: 'https://wa.me/6281234567890?text=Hi%20Rina'
		});
		expect(followUpLink({ phone: '12345678', email: 'r@x.com' }, 'Partner Summit', 'Hi')).toEqual({
			via: 'email',
			href: 'mailto:r@x.com?subject=Partner%20Summit&body=Hi'
		});
		expect(followUpLink({ phone: null, email: 'x@y.co?bcc=z@w.co' }, 'S', 'Hi')?.href).toBe(
			'mailto:x@y.co%3Fbcc%3Dz@w.co?subject=S&body=Hi'
		);
		expect(followUpLink({ phone: null, email: null }, 'S', 'Hi')).toBeNull();
	});
});

describe('LinkedIn links', () => {
	it('recognises a profile link however it was copied', () => {
		const url = 'https://www.linkedin.com/in/rina-wijaya-4a1b2c';
		expect(linkedinProfile('linkedin.com/in/Rina-Wijaya-4a1b2c')).toBe(url);
		expect(linkedinProfile('https://id.linkedin.com/in/rina-wijaya-4a1b2c/?utm_source=share')).toBe(
			url
		);
		expect(linkedinProfile(' http://linkedin.com/in/rina-wijaya-4a1b2c#about ')).toBe(url);
		expect(linkedinProfile('https://www.linkedin.com/company/srkk')).toBeNull();
		expect(linkedinProfile('Rina Wijaya')).toBeNull();
	});

	it('reads a name from the link only when the link spells one out', () => {
		expect(nameFromLinkedin('https://www.linkedin.com/in/rina-wijaya-4a1b2c')).toBe('Rina Wijaya');
		expect(nameFromLinkedin('https://www.linkedin.com/in/andi-pratama')).toBe('Andi Pratama');
		expect(nameFromLinkedin('https://www.linkedin.com/in/mei-ling-chong-12345678')).toBe(
			'Mei Ling Chong'
		);
		expect(nameFromLinkedin('https://www.linkedin.com/in/rinaw88')).toBeNull();
		expect(nameFromLinkedin('https://www.linkedin.com/in/budi')).toBeNull();
	});
});
