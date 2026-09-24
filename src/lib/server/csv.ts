type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
	let s = value == null ? '' : String(value);
	// Stop spreadsheets from executing "=HYPERLINK(...)" typed into a name field.
	// Plain phone numbers (+628…) are left alone; they can't run anything.
	if (/^[=+\-@\t\r]/.test(s) && !/^\+?\d[\d ]*$/.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM so Excel shows names like "Dewi Lestari Ñuñez" correctly. */
export function toCsv(headers: string[], rows: Cell[][]): string {
	return '﻿' + [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

export function csvResponse(filename: string, body: string) {
	return new Response(body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${filename.replace(/[^\w.-]+/g, '-')}"`,
			'cache-control': 'no-store'
		}
	});
}
