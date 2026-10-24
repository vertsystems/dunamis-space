// DMetric — robôs: de onde vêm as faixas de rede da Meta e das nuvens (o cron
// semanal /api/dmetric/robos as busca e grava em dmetric_redes_robo, 0092). O
// acesso que vem delas é só descartado, sem registro. Sem I/O (testado em robos.test.ts).

/**
 * Uma fonte de faixas: a lista oficial do provedor ou, para quem não publica, as
 * faixas anunciadas pelo número da rede (RIPEstat, gratuito e sem chave).
 */
export type FonteRobo = { id: string; nome: string; url: string; ler: (dados: unknown) => string[] };

const ripe = (asn: number) =>
	`https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${asn}&sourceapp=dunamis-dmetric`;

type Lista<T> = T[] | undefined;
const deRipe = (d: unknown) =>
	((d as { data?: { prefixes?: Lista<{ prefix?: string }> } })?.data?.prefixes ?? []).map((p) => p.prefix ?? '');

/**
 * As redes que não levam gente: a Meta (os robôs que conferem links de anúncio e
 * post) e as nuvens de servidor. Ficam de fora, de propósito, redes que também
 * levam gente de verdade: Cloudflare (o WARP), Akamai e Fastly (a Retransmissão
 * Privada da Apple), Zscaler (proxy de empresa) e os provedores de VPN.
 */
export const FONTES: FonteRobo[] = [
	{
		id: 'amazon',
		nome: 'Amazon',
		url: 'https://ip-ranges.amazonaws.com/ip-ranges.json',
		ler: (d) => {
			const x = d as { prefixes?: Lista<{ ip_prefix?: string }>; ipv6_prefixes?: Lista<{ ipv6_prefix?: string }> };
			return [...(x?.prefixes ?? []).map((p) => p.ip_prefix ?? ''), ...(x?.ipv6_prefixes ?? []).map((p) => p.ipv6_prefix ?? '')];
		}
	},
	{
		// Todas as faixas do Google, as da nuvem dele inclusive (goog.json ⊇ cloud.json).
		id: 'google',
		nome: 'Google',
		url: 'https://www.gstatic.com/ipranges/goog.json',
		ler: (d) =>
			((d as { prefixes?: Lista<{ ipv4Prefix?: string; ipv6Prefix?: string }> })?.prefixes ?? []).map(
				(p) => p.ipv4Prefix ?? p.ipv6Prefix ?? ''
			)
	},
	{
		id: 'oracle',
		nome: 'Oracle',
		url: 'https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json',
		ler: (d) =>
			((d as { regions?: Lista<{ cidrs?: Lista<{ cidr?: string }> }> })?.regions ?? []).flatMap((r) =>
				(r.cidrs ?? []).map((c) => c.cidr ?? '')
			)
	},
	...(
		[
			[32934, 'Meta'],
			[63293, 'Meta'],
			[54115, 'Meta'],
			[8075, 'Microsoft'],
			[24940, 'Hetzner'],
			[213230, 'Hetzner'],
			[16276, 'OVH'],
			[14061, 'DigitalOcean'],
			[63949, 'Linode'],
			[20473, 'Vultr'],
			[51167, 'Contabo'],
			[45102, 'Alibaba'],
			[37963, 'Alibaba'],
			[132203, 'Tencent'],
			[136907, 'Huawei'],
			[12876, 'Scaleway'],
			[60781, 'Leaseweb'],
			[28753, 'Leaseweb']
		] as const
	).map(([asn, nome]) => ({ id: `as${asn}`, nome, url: ripe(asn), ler: deRipe }))
];

/** Faixa de IP com cara de faixa (o banco confere de novo e descarta o que não for). */
const FAIXA = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]+)\/\d{1,3}$/i;

/** As faixas de uma fonte, sem repetidas e sem lixo. */
export function faixasDe(fonte: FonteRobo, dados: unknown): string[] {
	let lidas: string[] = [];
	try {
		lidas = fonte.ler(dados);
	} catch {
		return [];
	}
	return [...new Set(lidas.map((f) => f.trim().toLowerCase()).filter((f) => FAIXA.test(f)))];
}

/**
 * O IP como o banco compara. "::ffff:1.2.3.4" (IPv4 escrito como IPv6) vira
 * "1.2.3.4"; o que não parece IP vira vazio.
 */
export function ipLimpo(ip: string): string {
	const v = (ip || '').trim().replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, '$1');
	return /^[0-9a-f:.]{2,45}$/i.test(v) ? v : '';
}
