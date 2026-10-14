// DMetric — o PDF dos "Erros na página" (aba Saúde), feito para mandar a uma
// IA e pedir a correção: só texto, organizado e explicado, sem enfeite.
//
// Gerado no navegador com o pdf-lib e as fontes padrão do PDF (Helvetica e
// Courier), que não vão embutidas: o arquivo fica com poucos KB. O texto
// passa pelo WinAnsi (paraWinAnsi), que é o que essas fontes sabem escrever —
// acentos do português sim, setas e emoji não.
//
// montarRelatorio() decide o conteúdo (e o teste cobre); gerarPdfErros() só
// desenha.
import type { LinhaErro } from './saude';

export type DadosRelatorio = {
	site: { nome: string; endereco: string };
	/** Os erros de JS e arquivos das últimas 72 horas (SaudeSite.listaErros). */
	erros: LinhaErro[];
	/** Páginas abertas nos dias das 72 horas. */
	paginas: number;
	/** A nota da parte "Erros" (0–100). */
	nota: number;
	horas: number;
	geradoEm: Date;
};

export type Bloco =
	| { tipo: 'titulo'; texto: string }
	| { tipo: 'linha'; texto: string }
	| { tipo: 'secao'; texto: string }
	| { tipo: 'paragrafo'; texto: string }
	| { tipo: 'erro'; texto: string }
	| { tipo: 'campo'; rotulo: string; texto: string; codigo?: boolean }
	| { tipo: 'espaco' };

const FUSO = 'America/Sao_Paulo';
const quando = (d: Date) =>
	new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) +
	' às ' +
	new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(d);
const numero = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;

const hostDe = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
};

/**
 * Pistas do que conferir, pelo tipo e pelo jeito do erro. Curtas e só o que
 * dá para afirmar: a IA faz o resto com o código na mão.
 */
export function pistas(e: LinhaErro, dominioSite: string): string[] {
	const fora: string[] = [];
	const site = dominioSite.replace(/^www\./, '');
	if (e.tipo === 'recurso') {
		const host = hostDe(e.mensagem);
		const proprio = !!host && (host === site || host.endsWith('.' + site) || site.endsWith('.' + host));
		const caminho = e.mensagem.toLowerCase();
		if (/\.(mp4|webm|mov|m4v)$/.test(caminho)) {
			if (/av1|hevc|h265/.test(caminho))
				fora.push(
					'Vídeo em formato que nem todo aparelho reproduz (AV1/HEVC). Confira se a tag <video> oferece, depois desta, uma opção em H.264 (MP4) e se o atributo type está certo.'
				);
			fora.push('Confira se o vídeo existe no servidor nesse caminho exato e se não é grande demais para celular.');
		} else if (proprio) {
			fora.push(
				'O arquivo é do próprio site: confira se ele foi publicado e se o caminho no HTML/CSS bate exatamente com o nome no servidor (maiúsculas e minúsculas contam).'
			);
		} else if (host) {
			fora.push(`O arquivo vem de outro domínio (${host}): pode ter sido removido, mudado de endereço ou bloqueado por esse serviço.`);
		}
		if (/\.(webp|avif)$/.test(caminho))
			fora.push('Se só falha em alguns aparelhos, pode ser formato de imagem sem suporte: ofereça uma alternativa em JPG/PNG com <picture>.');
		if (e.ocorrencias === 1) fora.push('Aconteceu uma vez só: pode ter sido rede ruim do visitante. Se o arquivo abre normalmente, provavelmente não precisa de ação.');
	} else {
		if (e.origem && e.origem !== site && !e.origem.endsWith('.' + site))
			fora.push(`O erro veio de um script de outro domínio (${e.origem}): confira a integração desse serviço ou se ele está desatualizado.`);
		if (/null|undefined|cannot read|is not defined|not a function/i.test(e.mensagem))
			fora.push(
				'Mensagem típica de código que usa um elemento ou variável que não existe naquele momento: confira se o script roda antes de o elemento existir na página, ou se o elemento foi removido do HTML.'
			);
		fora.push('Procure no código do site o trecho que gera esta mensagem e trate o caso que falha.');
	}
	return fora;
}

export function montarRelatorio(d: DadosRelatorio): Bloco[] {
	const js = d.erros.filter((e) => e.tipo === 'js');
	const arquivos = d.erros.filter((e) => e.tipo === 'recurso');
	const ocorrencias = d.erros.reduce((t, e) => t + e.ocorrencias, 0);
	const inicio = new Date(d.geradoEm.getTime() - d.horas * 3_600_000);
	const dominio = d.site.endereco.split('/')[0];
	const ordem = [...d.erros].sort((a, b) => b.ocorrencias - a.ocorrencias || (b.ultimo_em ?? b.ultimo).localeCompare(a.ultimo_em ?? a.ultimo));

	const b: Bloco[] = [
		{ tipo: 'titulo', texto: 'Relatório de erros da página' },
		{ tipo: 'linha', texto: d.site.nome },
		{ tipo: 'linha', texto: `Endereço: ${d.site.endereco}` },
		{ tipo: 'linha', texto: `Gerado em ${quando(d.geradoEm)} (horário de Brasília) pelo DMetric, da Dunamis Space.` },

		{ tipo: 'secao', texto: 'Resumo' },
		{ tipo: 'campo', rotulo: 'Período:', texto: `últimas ${d.horas} horas (de ${quando(inicio)} a ${quando(d.geradoEm)})` },
		{ tipo: 'campo', rotulo: 'Páginas abertas no período:', texto: `cerca de ${numero(d.paginas)}` },
		{
			tipo: 'campo',
			rotulo: 'Erros diferentes:',
			texto: `${numero(d.erros.length)} (${[
				js.length ? plural(js.length, 'erro de JavaScript', 'erros de JavaScript') : '',
				arquivos.length ? plural(arquivos.length, 'arquivo que não carregou', 'arquivos que não carregaram') : ''
			]
				.filter(Boolean)
				.join(', ') || 'nenhum'})`
		},
		{ tipo: 'campo', rotulo: 'Ocorrências somadas:', texto: numero(ocorrencias) },
		{ tipo: 'campo', rotulo: 'Nota de erros no DMetric:', texto: `${d.nota} de 100` },

		{ tipo: 'secao', texto: 'Como ler este relatório' },
		{
			tipo: 'paragrafo',
			texto:
				'Os dados vêm de visitantes reais, no celular e no computador deles, capturados pelo script do DMetric instalado no site. Não é um teste de laboratório: o mesmo erro pode acontecer só em alguns aparelhos ou navegadores.'
		},
		{
			tipo: 'paragrafo',
			texto:
				'Erro de JavaScript: um erro sem tratamento no navegador do visitante (evento "error" da janela ou promessa rejeitada sem "catch"). A mensagem é a do navegador; números longos viraram "…" e os endereços estão sem os parâmetros depois do "?".'
		},
		{
			tipo: 'paragrafo',
			texto:
				'Arquivo não carregou: um elemento da página (imagem, vídeo, script, folha de estilo ou fonte) avisou erro ao carregar, ou o servidor respondeu com código 400 ou maior.'
		},
		{
			tipo: 'paragrafo',
			texto: 'Ocorrências: em quantas aberturas de página o erro apareceu. Cada erro conta no máximo uma vez por abertura.'
		},

		{ tipo: 'secao', texto: `Erros (${numero(d.erros.length)}), do mais frequente para o menos` }
	];

	if (!ordem.length) b.push({ tipo: 'paragrafo', texto: `Nenhum erro nas últimas ${d.horas} horas.` });
	// Pista repetida não se escreve de novo: aponta para o primeiro erro que a teve.
	const jaDita = new Map<string, number>();
	ordem.forEach((e, i) => {
		b.push({
			tipo: 'erro',
			texto: `${i + 1}. ${e.tipo === 'js' ? 'Erro de JavaScript' : 'Arquivo não carregou'} – ${plural(e.ocorrencias, 'ocorrência', 'ocorrências')}`
		});
		b.push({ tipo: 'campo', rotulo: e.tipo === 'js' ? 'Mensagem:' : 'Arquivo:', texto: e.mensagem, codigo: true });
		b.push({ tipo: 'campo', rotulo: 'Página onde aconteceu:', texto: dominio + (e.pagina === '/' ? '/' : e.pagina) });
		if (e.tipo === 'js' && e.origem) b.push({ tipo: 'campo', rotulo: 'Domínio do script:', texto: e.origem });
		b.push({
			tipo: 'campo',
			rotulo: 'Última vez:',
			texto: e.ultimo_em ? quando(new Date(e.ultimo_em)) : e.ultimo.split('-').reverse().join('/')
		});
		const repetidas: number[] = [];
		for (const p of pistas(e, dominio)) {
			const antes = jaDita.get(p);
			if (antes) {
				if (!repetidas.includes(antes)) repetidas.push(antes);
				continue;
			}
			jaDita.set(p, i + 1);
			b.push({ tipo: 'campo', rotulo: 'Pista:', texto: p });
		}
		if (repetidas.length)
			b.push({
				tipo: 'campo',
				rotulo: 'Pista:',
				texto: `a mesma ${repetidas.length === 1 ? 'do erro' : 'dos erros'} ${repetidas.join(' e ')}.`
			});
		b.push({ tipo: 'espaco' });
	});

	b.push(
		{ tipo: 'secao', texto: 'Pedido para a IA' },
		{
			tipo: 'paragrafo',
			texto:
				'Analise os erros acima e, para cada um: (1) diga a causa mais provável; (2) indique o que conferir no código ou nos arquivos do site; (3) proponha a correção, com o trecho de código quando fizer sentido. Se precisar de mais informação para ter certeza (o HTML da página, o arquivo de script, a lista de arquivos do servidor), diga exatamente qual.'
		}
	);
	return b;
}

// ---- WinAnsi: o que as fontes padrão do PDF escrevem ------------------------

const EXTRAS_1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const TROCAS: Record<string, string> = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '×': 'x', ' ': ' ' };

/** O texto que Helvetica/Courier conseguem escrever: o resto vira o parecido, ou sai. */
export function paraWinAnsi(t: string): string {
	let fora = '';
	for (const c of t.replace(/[\t\r\n]+/g, ' ')) {
		const cp = c.codePointAt(0)!;
		if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa1 && cp <= 0xff) || EXTRAS_1252.includes(c)) fora += c;
		else if (TROCAS[c]) fora += TROCAS[c];
		else {
			const sem = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
			fora += sem && sem.codePointAt(0)! <= 0xff ? sem : '';
		}
	}
	return fora;
}

/** "erros-ninasantana.com-2026-10-14.pdf" */
export function nomeDoArquivo(endereco: string, geradoEm: Date): string {
	const dia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(geradoEm);
	return `erros-${endereco.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '')}-${dia}.pdf`;
}

// ---- O desenho -----------------------------------------------------------------

export async function gerarPdfErros(d: DadosRelatorio): Promise<Uint8Array> {
	const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
	const pdf = await PDFDocument.create();
	pdf.setTitle(`Relatório de erros – ${d.site.endereco}`);
	pdf.setAuthor('DMetric – Dunamis Space');
	pdf.setSubject('Erros de JavaScript e arquivos que não carregaram, para correção');
	pdf.setLanguage('pt-BR');
	pdf.setCreationDate(d.geradoEm);

	const normal = await pdf.embedFont(StandardFonts.Helvetica);
	const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
	const mono = await pdf.embedFont(StandardFonts.Courier);
	type Fonte = typeof normal;

	const LARG = 595.28;
	const ALT = 841.89;
	const MARGEM = 50;
	const UTIL = LARG - MARGEM * 2;
	const TINTA = rgb(0.11, 0.15, 0.2);
	const CINZA = rgb(0.4, 0.44, 0.5);

	let pagina = pdf.addPage([LARG, ALT]);
	let y = ALT - MARGEM;

	/** Quebra em linhas que cabem na largura; palavra maior que a linha (URL) quebra no meio. */
	function quebrar(texto: string, fonte: Fonte, tam: number, largura: number): string[] {
		const linhas: string[] = [];
		let atual = '';
		const cabe = (s: string) => fonte.widthOfTextAtSize(s, tam) <= largura;
		for (const palavra of paraWinAnsi(texto).split(' ')) {
			const tentativa = atual ? `${atual} ${palavra}` : palavra;
			if (cabe(tentativa)) {
				atual = tentativa;
				continue;
			}
			if (atual) linhas.push(atual);
			atual = '';
			let resto = palavra;
			while (!cabe(resto)) {
				let n = resto.length - 1;
				while (n > 1 && !cabe(resto.slice(0, n))) n--;
				linhas.push(resto.slice(0, n));
				resto = resto.slice(n);
			}
			atual = resto;
		}
		if (atual) linhas.push(atual);
		return linhas;
	}

	function garantir(altura: number) {
		if (y - altura < MARGEM + 20) {
			pagina = pdf.addPage([LARG, ALT]);
			y = ALT - MARGEM;
		}
	}

	function escrever(texto: string, fonte: Fonte, tam: number, x: number, largura: number, cor = TINTA, entre = 1.4) {
		for (const l of quebrar(texto, fonte, tam, largura)) {
			garantir(tam * entre);
			pagina.drawText(l, { x, y: y - tam, size: tam, font: fonte, color: cor });
			y -= tam * entre;
		}
	}

	for (const bl of montarRelatorio(d)) {
		switch (bl.tipo) {
			case 'titulo':
				escrever(bl.texto, negrito, 17, MARGEM, UTIL, TINTA, 1.5);
				y -= 2;
				break;
			case 'linha':
				escrever(bl.texto, normal, 10, MARGEM, UTIL, CINZA);
				break;
			case 'secao':
				y -= 12;
				garantir(40);
				escrever(bl.texto, negrito, 12.5, MARGEM, UTIL);
				pagina.drawLine({ start: { x: MARGEM, y: y + 2 }, end: { x: LARG - MARGEM, y: y + 2 }, thickness: 0.6, color: rgb(0.85, 0.87, 0.91) });
				y -= 6;
				break;
			case 'paragrafo':
				escrever(bl.texto, normal, 10, MARGEM, UTIL);
				y -= 4;
				break;
			case 'erro':
				// O título do erro não fica sozinho no pé da página.
				garantir(70);
				escrever(bl.texto, negrito, 10.5, MARGEM, UTIL);
				y -= 1;
				break;
			case 'campo': {
				const tam = 9.5;
				const recuo = MARGEM + 12;
				const rot = paraWinAnsi(bl.rotulo) + ' ';
				const wRot = negrito.widthOfTextAtSize(rot, tam);
				const fonte = bl.codigo ? mono : normal;
				const tamTexto = bl.codigo ? 9 : tam;
				// Texto curto ao lado do rótulo; longo (mensagem, pista) na linha de baixo, com a largura toda.
				const aoLado = fonte.widthOfTextAtSize(paraWinAnsi(bl.texto), tamTexto) <= UTIL - 12 - wRot;
				garantir(tam * 1.45);
				pagina.drawText(rot, { x: recuo, y: y - tam, size: tam, font: negrito, color: CINZA });
				if (aoLado) {
					pagina.drawText(paraWinAnsi(bl.texto), { x: recuo + wRot, y: y - tam, size: tamTexto, font: fonte, color: TINTA });
					y -= tam * 1.45;
				} else {
					y -= tam * 1.45;
					escrever(bl.texto, fonte, tamTexto, recuo + 10, UTIL - 22, TINTA, 1.45);
				}
				break;
			}
			case 'espaco':
				y -= 8;
				break;
		}
	}

	// Rodapé: de onde veio e a página.
	const paginas = pdf.getPages();
	paginas.forEach((p, i) => {
		const texto = paraWinAnsi(`DMetric – Dunamis Space · ${d.site.endereco} · página ${i + 1} de ${paginas.length}`);
		p.drawText(texto, { x: MARGEM, y: MARGEM - 20, size: 8, font: normal, color: CINZA });
	});

	return pdf.save();
}
