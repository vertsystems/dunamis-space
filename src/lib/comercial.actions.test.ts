// Guarda contra a regressão que quebrou o painel do contato.
//
// As actions do Comercial vivem só em `/comercial/+page.server.ts`. Enquanto o
// CRM era uma tela só, `action="?/contato_atualizar"` funcionava — o `?/` aponta
// para a rota atual, que era a mesma. Com o módulo dividido em cinco telas, o
// drawer aberto em /comercial/contatos passou a postar para
// `/comercial/contatos?/contato_atualizar`, uma rota sem action nenhuma: salvar
// respondia "Erro ao salvar" e a alteração se perdia.
//
// Este teste lê os componentes (via glob do Vite, sem tocar no fs) e falha se
// alguém voltar a usar `?/` relativo.
import { describe, it, expect } from 'vitest';

const COMPONENTES = import.meta.glob('./components/crm/*.svelte', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const SERVER = import.meta.glob('../routes/comercial/+page.server.ts', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

describe('actions do Comercial', () => {
	it('encontra os componentes do CRM e o servidor do módulo', () => {
		// Se um glob deixar de casar, os testes abaixo passariam vazios — sem isto,
		// a guarda viraria decoração.
		expect(Object.keys(COMPONENTES).length).toBeGreaterThan(5);
		expect(Object.keys(SERVER)).toHaveLength(1);
	});

	it('nenhum componente do CRM usa action relativa (?/…)', () => {
		const culpados = Object.entries(COMPONENTES)
			// `action="?/x"` ou `action = '?/x'` — o que quebra fora da rota raiz.
			.filter(([, src]) => /action\s*[=:]\s*["'`]\?\//.test(src))
			.map(([arq]) => arq);
		expect(culpados).toEqual([]);
	});

	it('as actions usadas nos componentes existem no +page.server.ts do módulo', () => {
		const src = Object.values(SERVER)[0];
		const declaradas = [...src.matchAll(/^\t([a-z_]+):/gm)].map((m) => m[1]);

		const usadas = new Set<string>();
		for (const componente of Object.values(COMPONENTES)) {
			for (const m of componente.matchAll(/\$\{ACTIONS\}\?\/([a-z_]+)/g)) usadas.add(m[1]);
		}

		expect(usadas.size).toBeGreaterThan(0);
		for (const acao of usadas) {
			expect(declaradas, `action "${acao}" não existe em /comercial`).toContain(acao);
		}
	});
});
