/**
 * A mailto: link to one address. The address is percent-encoded (keeping the
 * @ readable), so one like "x@y.co?bcc=…" can't add headers or recipients.
 */
export function mailtoHref(email: string): string {
	return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`;
}
