// Geocode reverso (lat/lng → rótulo de local) via Nominatim/OpenStreetMap.
// Feito no servidor para respeitar o User-Agent exigido pela API pública.
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lng = Number(url.searchParams.get('lng'));
	if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
		throw error(400, 'Coordenadas inválidas');
	}
	try {
		const u = new URL('https://nominatim.openstreetmap.org/reverse');
		u.searchParams.set('format', 'jsonv2');
		u.searchParams.set('lat', String(lat));
		u.searchParams.set('lon', String(lng));
		u.searchParams.set('zoom', '14');
		u.searchParams.set('addressdetails', '1');
		u.searchParams.set('accept-language', 'pt-BR');
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), 6000);
		const r = await fetch(u, {
			headers: { 'User-Agent': 'DunamisSpace-LeadGrap/1.0' },
			signal: ctrl.signal
		});
		clearTimeout(t);
		if (!r.ok) return json({ label: null });
		const data = await r.json();
		const a = data.address ?? {};
		const locality = a.suburb || a.neighbourhood || a.village || null;
		const city = a.city || a.town || a.municipality || null;
		const state = a.state || null;
		const label = [locality, city, state].filter(Boolean).join(', ') || data.display_name || null;
		return json({ label, city, state });
	} catch {
		return json({ label: null });
	}
};
