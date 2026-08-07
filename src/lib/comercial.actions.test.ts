// Guarda contra a regressão que quebrou o painel do contato.
//
// As actions do Comercial vivem só em `/comercial/+page.server.ts`. Enquanto o
// CRM era uma tela só, `action="?/contato_atualizar"` funcionava — o `?/` aponta
// para a rota atual, que era a mesma. Com o módulo dividido em cinco telas, o
// drawer aberto em /comercial/contatos passou a postar para
// `/comercial/contatos?/contato_atualizar`, uma rota sem action nenhuma: salvar
// respondia "Erro ao salvar" e a alteração se perdia.
//
// Este teste lê os componentes e falha se alguém voltar a usar `?/` relativo.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/lib/components/crm';

function arquivos(): string[] {
	return readdirSync(DIR)
		.filter((f) => f.endsWith('.svelte'))
		.map((f) => join(DIR, f));
}

describe('actions do Comercial', () => {
	it('nenhum componente do CRM usa action relativa (?/…)', () => {
		const culpados: string[] = [];
		for (const arq of arquivos()) {
			const src = readFileSync(arq, 'utf-8');
			// `action="?/x"` ou `action = '?/x'` — o que quebra fora da rota raiz.
			if (/action\s*[=:]\s*["'`]\?\//.test(src)) culpados.push(arq);
		}
		expect(culpados).toEqual([]);
	});

	it('as actions usadas nos componentes existem no +page.server.ts do módulo', () => {
		const server = readFileSync('src/routes/comercial/+page.server.ts', 'utf-8');
		const declaradas = new Set(
			[...server.matchAll(/^\t([a-z_]+):/gm)].map((m) => m[1])
		);

		const usadas = new Set<string>();
		for (const arq of arquivos()) {
			const src = readFileSync(arq, 'utf-8');
			for (const m of src.matchAll(/\$\{ACTIONS\}\?\/([a-z_]+)/g)) usadas.add(m[1]);
		}

		expect(usadas.size).toBeGreaterThan(0);
		for (const acao of usadas) {
			expect(declaradas, `action "${acao}" não existe em /comercial`).toContain(acao);
		}
	});
});
