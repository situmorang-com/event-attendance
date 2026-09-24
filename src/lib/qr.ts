import { encode } from 'uqr';

interface QrOptions {
	ecc?: 'L' | 'M' | 'Q' | 'H';
	/** Quiet zone in modules. Scanners want some white around the code. */
	margin?: number;
	dark?: string;
	light?: string;
}

const r = (n: number) => Math.round(n * 100) / 100;

function roundedRect(x: number, y: number, size: number, radius: number) {
	const s = r(size - 2 * radius);
	return (
		`M${r(x + radius)},${r(y)}h${s}a${radius},${radius} 0 0 1 ${radius},${radius}v${s}` +
		`a${radius},${radius} 0 0 1 -${radius},${radius}h-${s}a${radius},${radius} 0 0 1 -${radius},-${radius}` +
		`v-${s}a${radius},${radius} 0 0 1 ${radius},-${radius}z`
	);
}

/**
 * Soft-cornered QR code as an SVG string. Works in the browser and on the server.
 * Modules fill their full cell (only the corners are rounded) and the finder "eyes" keep
 * their geometry: in decode tests this scans exactly as reliably as a plain square code,
 * while inset "dot" styles failed at large sizes.
 */
export function qrSvg(text: string, opts: QrOptions = {}): string {
	const { ecc = 'M', margin = 3, dark = '#0b0b1a', light = '#ffffff' } = opts;
	const qr = encode(text, { ecc, border: 0 });
	const n = qr.size;
	const total = n + margin * 2;
	const inEye = (x: number, y: number) =>
		(x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

	let modules = '';
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			if (qr.data[y][x] && !inEye(x, y)) modules += roundedRect(x + margin, y + margin, 1, 0.3);
		}
	}

	let eyes = '';
	for (const [ex, ey] of [
		[0, 0],
		[n - 7, 0],
		[0, n - 7]
	]) {
		const x = ex + margin;
		const y = ey + margin;
		eyes +=
			roundedRect(x, y, 7, 2) +
			roundedRect(x + 1, y + 1, 5, 1.3) +
			roundedRect(x + 2, y + 2, 3, 0.9);
	}

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR code">` +
		(light === 'none' ? '' : `<rect width="${total}" height="${total}" fill="${light}"/>`) +
		`<path fill="${dark}" d="${modules}"/>` +
		`<path fill="${dark}" fill-rule="evenodd" d="${eyes}"/>` +
		`</svg>`
	);
}
