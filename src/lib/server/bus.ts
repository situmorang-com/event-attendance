import { EventEmitter } from 'node:events';

export type LiveMessage =
	| {
			type: 'checkin';
			count: number;
			arrival: { id: number; name: string; company: string; at: number };
	  }
	/** Something else changed (check-in removed, doors opened/closed, QR mode switched). */
	| { type: 'refresh' };

const g = globalThis as typeof globalThis & { __attendanceBus?: EventEmitter };
const bus = (g.__attendanceBus ??= new EventEmitter().setMaxListeners(0));

export function publish(eventId: string, message: LiveMessage) {
	bus.emit(`event:${eventId}`, message);
}

export function subscribe(eventId: string, listener: (message: LiveMessage) => void) {
	bus.on(`event:${eventId}`, listener);
	return () => bus.off(`event:${eventId}`, listener);
}
