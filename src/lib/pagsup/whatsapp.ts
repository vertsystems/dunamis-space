// Pag's Up — contato do prestador pelo WhatsApp.
//
// O número pode vir do campo próprio (whatsapp) ou, para quem foi cadastrado
// antes dele existir, da chave Pix — em 30 dos 77 prestadores a chave é o
// celular. O Pix é só fallback: CNPJ e e-mail também aparecem lá, e telefone
// fixo não tem WhatsApp.

/**
 * Normaliza para o formato que o wa.me espera (55 + DDD + número), ou null se
 * não parecer um celular brasileiro.
 *
 * Aceita 11 dígitos (DDD + 9 + 8), com ou sem o 55 na frente. Fixo (10 dígitos)
 * fica de fora: WhatsApp é de celular, e um link que não abre conversa é pior
 * que nenhum link.
 */
export function normalizaWhatsApp(valor: string | undefined | null): string | null {
	if (!valor) return null;
	const bruto = String(valor).trim();
	if (bruto.includes('@')) return null; // e-mail usado como chave Pix
	let d = bruto.replace(/\D/g, '');
	if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
	if (d.length !== 11) return null;
	const ddd = Number(d.slice(0, 2));
	if (ddd < 11 || ddd > 99) return null;
	if (d[2] !== '9') return null; // celular brasileiro tem 9 depois do DDD
	return `55${d}`;
}

/** Número de contato do prestador: campo próprio e, na falta dele, a chave Pix. */
export function whatsappDoPrestador(p: {
	whatsapp?: string | null;
	pix?: string | null;
}): string | null {
	return normalizaWhatsApp(p.whatsapp) ?? normalizaWhatsApp(p.pix);
}

/** Link de conversa. wa.me abre o app no celular e o WhatsApp Web no desktop. */
export function linkWhatsApp(numero: string): string {
	return `https://wa.me/${numero}`;
}

/** Número do prestador pronto para a célula da tabela, ou "-" quando não há. */
export function whatsappLegivel(p: { whatsapp?: string | null; pix?: string | null }): string {
	const n = whatsappDoPrestador(p);
	return n ? formataWhatsApp(n) : '-';
}

/** (11) 94283-0693 — para mostrar na tela e no title do botão. */
export function formataWhatsApp(numero: string): string {
	const d = numero.startsWith('55') ? numero.slice(2) : numero;
	if (d.length !== 11) return numero;
	return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
