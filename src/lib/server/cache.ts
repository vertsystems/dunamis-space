/**
 * Camada de cache (Redis/Upstash) — para dados que não mudam toda hora:
 * dashboards, relatórios consolidados, respostas de APIs externas.
 *
 * É **env-gated e degrada graciosamente**: se `UPSTASH_REDIS_REST_URL` e
 * `UPSTASH_REDIS_REST_TOKEN` não estiverem definidos, `cached()` simplesmente
 * executa o fetcher (sem cache). Assim o código funciona hoje, sem credenciais,
 * e passa a cachear automaticamente quando as env vars forem configuradas
 * (local em `.env`, produção no painel da Vercel).
 *
 * Único tenant → chaves globais (sem namespace por usuário).
 */
import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

let client: Redis | null = null;
let resolved = false;

function getClient(): Redis | null {
	if (resolved) return client;
	resolved = true;
	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;
	if (url && token) {
		client = new Redis({ url, token });
	}
	return client;
}

/** true quando o cache está configurado (env presentes). */
export function cacheEnabled(): boolean {
	return getClient() !== null;
}

/**
 * Retorna o valor cacheado em `key` ou executa `fetcher`, cacheando o
 * resultado por `ttlSeconds`. Falhas do Redis nunca quebram a request:
 * caem no fetcher direto.
 */
export async function cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
	const redis = getClient();
	if (!redis) return fetcher();

	try {
		const hit = await redis.get<T>(key);
		if (hit !== null && hit !== undefined) return hit;
	} catch {
		// cache indisponível → segue para o fetcher
	}

	const fresh = await fetcher();

	try {
		await redis.set(key, fresh, { ex: ttlSeconds });
	} catch {
		// falha ao gravar não é fatal
	}

	return fresh;
}

/** Invalida uma ou mais chaves (ex.: após escrita que afeta um relatório cacheado). */
export async function invalidate(...keys: string[]): Promise<void> {
	const redis = getClient();
	if (!redis || keys.length === 0) return;
	try {
		await redis.del(...keys);
	} catch {
		// noop
	}
}
