import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { parseEventForm } from '$lib/server/event-form';
import { createEvent } from '$lib/server/events';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const parsed = parseEventForm(await request.formData());
		if (!parsed.input) return fail(400, { errors: parsed.errors, values: parsed.values });
		const id = createEvent(db, parsed.input);
		redirect(303, `/admin/events/${id}?created=1`);
	}
};
