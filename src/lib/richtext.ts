// Texto formatado (o HTML que sai do RichText): converter, limpar e exibir.
//
// Existe porque o mesmo campo guarda duas coisas ao longo do tempo: o que foi
// digitado antes do editor existir é texto puro com quebras de linha, e o que
// vem depois é HTML. As telas precisam saber distinguir os dois — e nenhuma
// delas deveria jogar no `{@html}` o que veio do banco sem passar por aqui.

/** O valor já é HTML (veio do editor) ou é texto puro digitado antes dele? */
export function ehHtml(valor: string | null | undefined): boolean {
	if (!valor) return false;
	return /<(br|p|div|ul|ol|li|b|strong|i|em|u|s|a|span|font|h[1-6])\b[^>]*>/i.test(valor);
}

function escapar(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Higieniza o HTML antes de gravar ou de exibir.
 *
 * Não é um sanitizador de propósito geral: é uma faxina em cima do que o nosso
 * editor produz (negrito, cor, lista, link). Tira o que só serve para executar
 * código — script/style/iframe, atributos `on*` e URLs `javascript:` — para que
 * um `{@html}` de conteúdo vindo do banco não vire uma porta de entrada.
 * Roda no servidor (na gravação) e não depende de DOM.
 */
export function sanitizarHtml(valor: string | null | undefined): string | null {
	if (!valor) return null;
	const limpo = valor
		// Tags perigosas com o conteúdo delas junto.
		.replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, '')
		// E as versões soltas/sem fechamento.
		.replace(/<\/?(script|style|iframe|object|embed|form|input|button|meta|link)\b[^>]*>/gi, '')
		// Handlers de evento em qualquer tag: onclick=…, onerror='…', onload=x
		.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
		.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
		.replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
		// href/src apontando para script.
		.replace(/\b(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*("|')?/gi, '$1="#"');
	return limpo.trim() ? limpo : null;
}

/**
 * Texto puro (legado) → HTML, para abrir no editor sem perder as quebras de
 * linha. Quem já é HTML passa direto.
 */
export function paraHtml(valor: string | null | undefined): string {
	if (!valor) return '';
	if (ehHtml(valor)) return sanitizarHtml(valor) ?? '';
	return escapar(valor).replace(/\r?\n/g, '<br>');
}

/**
 * HTML → texto puro. Serve ao `title=` das listas densas (onde só cabe uma
 * dica) e a qualquer lugar que precise do conteúdo sem marcação.
 */
export function paraTexto(valor: string | null | undefined): string {
	if (!valor) return '';
	if (!ehHtml(valor)) return valor;
	return valor
		.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
		.replace(/<\/?(p|div|br|li|tr|h[1-6])\b[^>]*>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		// Uma linha por bloco: o destino é o `title=` de uma lista densa, onde
		// linha em branco entre parágrafos só ocupa espaço.
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{2,}/g, '\n')
		.trim();
}
