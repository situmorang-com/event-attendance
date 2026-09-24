import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, route, url }) => {
	if (!locals.admin && route.id !== '/admin/login') {
		redirect(303, `/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return {};
};
