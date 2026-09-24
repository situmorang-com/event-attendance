import { countContacts } from '$lib/server/contacts';
import { db } from '$lib/server/db';
import { listEvents } from '$lib/server/events';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const events = listEvents(db);
	return {
		events,
		contacts: countContacts(db),
		checkins: events.reduce((sum, e) => sum + e.checkins, 0),
		now: Date.now()
	};
};
