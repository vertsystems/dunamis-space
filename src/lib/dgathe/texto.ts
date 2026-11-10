// O texto dos agentes (markdown simples) em blocos para o painel do DGathe,
// sem HTML: o Svelte desenha cada pedaço, então nada que o agente escreva
// vira código na página.
//
// Entende o que os agentes mais usam: parágrafo, título (#), lista (- , * , 1.),
// bloco de código (```), tabela (| … |, mostrada em fonte fixa), **negrito** e
// `código` no meio da frase.

export type Pedaco = { t: string; negrito?: boolean; codigo?: boolean };
export type Bloco =
	| { tipo: 'p' | 'titulo'; partes: Pedaco[] }
	| { tipo: 'item'; partes: Pedaco[]; numero: string | null }
	| { tipo: 'codigo'; texto: string };

/** **negrito** e `código` numa linha. */
export function pedacos(linha: string): Pedaco[] {
	const r: Pedaco[] = [];
	const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
	let i = 0;
	for (const m of linha.matchAll(re)) {
		if (m.index! > i) r.push({ t: linha.slice(i, m.index) });
		if (m[2] !== undefined) r.push({ t: m[2], negrito: true });
		else r.push({ t: m[3], codigo: true });
		i = m.index! + m[0].length;
	}
	if (i < linha.length) r.push({ t: linha.slice(i) });
	return r.length ? r : [{ t: '' }];
}

export function blocos(texto: string): Bloco[] {
	const r: Bloco[] = [];
	const linhas = (texto ?? '').replace(/\r\n?/g, '\n').split('\n');
	let paragrafo: string[] = [];
	const fecharParagrafo = () => {
		if (paragrafo.length) r.push({ tipo: 'p', partes: pedacos(paragrafo.join(' ')) });
		paragrafo = [];
	};
	for (let i = 0; i < linhas.length; i++) {
		const l = linhas[i];
		const s = l.trim();
		if (s.startsWith('```')) {
			fecharParagrafo();
			const codigo: string[] = [];
			for (i++; i < linhas.length && !linhas[i].trim().startsWith('```'); i++) codigo.push(linhas[i]);
			r.push({ tipo: 'codigo', texto: codigo.join('\n') });
			continue;
		}
		if (s.startsWith('|')) {
			fecharParagrafo();
			const tabela: string[] = [];
			for (; i < linhas.length && linhas[i].trim().startsWith('|'); i++) {
				// A linha de separação (|---|---|) não ajuda a ler
				if (!/^\|[\s:|-]+\|$/.test(linhas[i].trim())) tabela.push(linhas[i].trim());
			}
			i--;
			r.push({ tipo: 'codigo', texto: tabela.join('\n') });
			continue;
		}
		if (!s) {
			fecharParagrafo();
			continue;
		}
		const titulo = s.match(/^#{1,6}\s+(.*)$/);
		if (titulo) {
			fecharParagrafo();
			r.push({ tipo: 'titulo', partes: pedacos(titulo[1]) });
			continue;
		}
		const item = s.match(/^(?:[-*•]\s+|(\d+)[.)]\s+)(.*)$/);
		if (item) {
			fecharParagrafo();
			r.push({ tipo: 'item', partes: pedacos(item[2]), numero: item[1] ?? null });
			continue;
		}
		paragrafo.push(s);
	}
	fecharParagrafo();
	return r;
}
