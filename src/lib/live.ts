export interface LiveQr {
	url: string;
	/** When the code on screen changes; null for printed (static) codes. */
	rotatesAt: number | null;
}

export interface LiveArrival {
	id: number;
	name: string;
	company: string;
	at: number;
}

interface Handlers {
	qr?: (qr: LiveQr) => void;
	checkin?: (data: { count: number; arrival: LiveArrival }) => void;
	refresh?: () => void;
	connection?: (online: boolean) => void;
}

/** Subscribes to an event's live stream. EventSource reconnects on its own after drops. */
export function connectLive(eventId: string, handlers: Handlers) {
	const source = new EventSource(`/admin/events/${eventId}/stream`);
	source.addEventListener('qr', (e) => handlers.qr?.(JSON.parse(e.data)));
	source.addEventListener('checkin', (e) => handlers.checkin?.(JSON.parse(e.data)));
	source.addEventListener('refresh', () => handlers.refresh?.());
	source.onopen = () => handlers.connection?.(true);
	source.onerror = () => handlers.connection?.(false);
	return () => source.close();
}
