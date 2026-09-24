import { fromLocalInput, isValidTimeZone } from '$lib/time';
import { DEFAULT_TIMEZONE } from './config';
import type { EventInput } from './events';
import { cleanText } from './normalize';

export type EventFormValues = {
	name: string;
	venue: string;
	startsAt: string;
	timezone: string;
	qrMode: string;
};

export function parseEventForm(form: FormData) {
	const values: EventFormValues = {
		name: String(form.get('name') ?? ''),
		venue: String(form.get('venue') ?? ''),
		startsAt: String(form.get('startsAt') ?? ''),
		timezone: String(form.get('timezone') ?? ''),
		qrMode: String(form.get('qrMode') ?? 'rotating')
	};

	const timezone =
		isValidTimeZone(values.timezone) && values.timezone ? values.timezone : DEFAULT_TIMEZONE;
	const startsAt = values.startsAt ? fromLocalInput(values.startsAt, timezone) : null;
	const errors: Partial<Record<keyof EventFormValues, string>> = {};

	const name = cleanText(values.name, 120);
	if (!name) errors.name = 'Give the event a name.';
	if (values.startsAt && startsAt === null) errors.startsAt = 'That date doesn’t look right.';

	const input: EventInput = {
		name,
		venue: cleanText(values.venue, 160),
		startsAt,
		timezone,
		qrMode: values.qrMode === 'static' ? 'static' : 'rotating'
	};

	return Object.keys(errors).length ? { errors, values } : { input, values };
}
