import { fail, redirect } from '@sveltejs/kit';
import { checkPassword, startSession } from '$lib/server/auth';
import { ADMIN_PASSWORD, USING_DEV_PASSWORD } from '$lib/server/config';
import { allow } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

function safeNext(value: string | null) {
	return value && value.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.admin) redirect(303, safeNext(url.searchParams.get('next')));
	return { configured: !!ADMIN_PASSWORD, devPassword: USING_DEV_PASSWORD };
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		if (!allow(`login:${getClientAddress()}`, 8, 60_000)) {
			return fail(429, { message: 'Too many attempts. Wait a minute and try again.' });
		}
		const form = await request.formData();
		if (!checkPassword(String(form.get('password') ?? ''))) {
			return fail(400, { message: 'That password isn’t right.' });
		}
		startSession(cookies, url);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
