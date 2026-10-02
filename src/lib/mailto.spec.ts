import { describe, expect, it } from 'vitest';
import { mailtoHref } from './mailto';

describe('mailtoHref', () => {
	it('links a plain address as is', () => {
		expect(mailtoHref('rina@x.com')).toBe('mailto:rina@x.com');
	});

	it("encodes query characters so the address can't add recipients", () => {
		expect(mailtoHref('x@y.co?bcc=z@w.co')).toBe('mailto:x@y.co%3Fbcc%3Dz@w.co');
		expect(mailtoHref('x@y.co&cc=z@w.co')).toBe('mailto:x@y.co%26cc%3Dz@w.co');
	});
});
