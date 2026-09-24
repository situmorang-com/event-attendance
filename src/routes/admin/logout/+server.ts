import { redirect } from '@sveltejs/kit';
import { endSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies, url }) => {
	endSession(cookies, url);
	redirect(303, '/admin/login');
};
