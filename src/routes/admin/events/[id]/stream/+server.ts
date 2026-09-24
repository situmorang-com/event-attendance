import { error } from '@sveltejs/kit';
import { subscribe } from '$lib/server/bus';
import { db, secret } from '$lib/server/db';
import { getEvent } from '$lib/server/events';
import { nextRotationAt, qrToken } from '$lib/server/qr-token';
import { checkinUrl, publicBaseUrl } from '$lib/server/urls';
import type { RequestHandler } from './$types';

/**
 * Server-sent events for the entrance screen and dashboard:
 *   qr       the code to show right now (re-sent at every rotation)
 *   checkin  someone just arrived (public name only: "Rina W.")
 *   refresh  something else changed; reload the page data
 */
export const GET: RequestHandler = ({ params, url, request }) => {
	if (!getEvent(db, params.id)) error(404, 'Event not found');
	const { base } = publicBaseUrl(url);
	const encoder = new TextEncoder();
	let stop = () => {};

	const stream = new ReadableStream({
		start(controller) {
			let closed = false;
			const write = (chunk: string) => {
				if (closed) return;
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					stop();
				}
			};
			const send = (type: string, data: unknown) =>
				write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

			const sendQr = () => {
				const event = getEvent(db, params.id);
				if (!event) return;
				const rotating = event.qr_mode === 'rotating';
				send('qr', {
					url: checkinUrl(base, event.id, rotating ? qrToken(secret, event.id) : undefined),
					rotatesAt: rotating ? nextRotationAt() : null
				});
			};

			let rotation: ReturnType<typeof setTimeout>;
			const scheduleRotation = () => {
				rotation = setTimeout(
					() => {
						sendQr();
						scheduleRotation();
					},
					nextRotationAt() - Date.now() + 25
				);
			};

			const unsubscribe = subscribe(params.id, (message) => {
				if (message.type === 'checkin')
					send('checkin', { count: message.count, arrival: message.arrival });
				else {
					send('refresh', {});
					sendQr();
				}
			});
			const heartbeat = setInterval(() => write(': keep-alive\n\n'), 15_000);

			stop = () => {
				if (closed) return;
				closed = true;
				clearTimeout(rotation);
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			};
			request.signal.addEventListener('abort', stop);

			write('retry: 3000\n\n');
			sendQr();
			scheduleRotation();
		},
		cancel() {
			stop();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive',
			'x-accel-buffering': 'no'
		}
	});
};
