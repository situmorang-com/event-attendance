export function firstName(name: string): string {
	return name.trim().split(/\s+/)[0] ?? '';
}

/** "Rina Wijaya" → "Rina W." — what the public entrance screen shows. */
export function publicName(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length < 2) return parts[0] ?? '';
	return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const letters =
		parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
	return letters.toUpperCase();
}
