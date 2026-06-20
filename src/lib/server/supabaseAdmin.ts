/**
 * Cliente Supabase com service role — APENAS server-side (worker de jobs).
 * Ignora RLS, então NUNCA importe isto em código que roda no navegador.
 *
 * Env-gated: sem `SUPABASE_SERVICE_ROLE_KEY` retorna null (o worker então
 * responde "cache/serviço não configurado" em vez de quebrar).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

let admin: SupabaseClient | null = null;
let resolved = false;

export function getAdmin(): SupabaseClient | null {
	if (resolved) return admin;
	resolved = true;
	const url = pub.PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (url && key) {
		admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
	}
	return admin;
}
