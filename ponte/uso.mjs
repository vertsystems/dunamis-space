// Pergunta ao Claude Code do Mac o consumo do plano (janela de 5 h, semana e
// os limites por modelo, como o do Fable), para o medidor do DGathe.
//
// Abre o Claude Code sem mandar mensagem nenhuma ao modelo, pede `get_usage`
// pelo protocolo de controle (o mesmo que a ponte usa nas tarefas) e fecha. Não
// gasta nada do limite: o Claude Code só consulta o endpoint de uso da conta.
// Leva menos de 1 s. A ponte chama a cada minuto (ponte.mjs) e grava no banco.
//
// Para conferir à mão:  node ponte/uso.mjs

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { lerUso } from '../src/lib/dgathe/uso.ts';

/**
 * @param {{ claude: string, env: Record<string, string>, cwd: string, limiteMs?: number }} o
 * @returns {Promise<import('../src/lib/dgathe/uso.ts').UsoDoPlano | null>}
 */
export function lerUsoDoClaude({ claude, env, cwd, limiteMs = 25_000 }) {
	return new Promise((resolve, reject) => {
		const p = spawn(claude, ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose'], {
			cwd,
			env,
			stdio: ['pipe', 'pipe', 'pipe']
		});
		let acabou = false;
		let erro = '';
		const fim = (f) => {
			if (acabou) return;
			acabou = true;
			clearTimeout(timer);
			try {
				p.stdin.end();
			} catch {}
			setTimeout(() => {
				if (p.exitCode === null) p.kill('SIGTERM');
			}, 2000);
			f();
		};
		const timer = setTimeout(() => fim(() => reject(new Error('o Claude Code não respondeu o consumo a tempo'))), limiteMs);
		const enviar = (o) => {
			if (p.stdin.writable) p.stdin.write(JSON.stringify(o) + '\n');
		};
		p.stdin.on('error', () => {});
		p.stderr.on('data', (b) => (erro = (erro + String(b)).slice(-1000)));
		p.on('error', (e) => fim(() => reject(e)));
		p.on('exit', (c) => fim(() => reject(new Error(`o Claude Code fechou sem responder (código ${c}). ${erro.trim()}`))));
		createInterface({ input: p.stdout }).on('line', (linha) => {
			let d;
			try {
				d = JSON.parse(linha);
			} catch {
				return;
			}
			if (d.type !== 'control_response' || d.response?.request_id !== 'uso') return;
			if (d.response.subtype !== 'success') fim(() => reject(new Error(d.response.error || 'get_usage falhou')));
			else fim(() => resolve(lerUso(d.response.response)));
		});
		enviar({ type: 'control_request', request_id: 'ini', request: { subtype: 'initialize' } });
		// skip_behaviors: só os limites (sem varrer as conversas do Mac, que é lento)
		enviar({ type: 'control_request', request_id: 'uso', request: { subtype: 'get_usage', skip_behaviors: true } });
	});
}

// Rodado direto: mostra o consumo agora (usa o mesmo Claude Code que a ponte acharia)
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	const { readdirSync, existsSync } = await import('node:fs');
	const { join } = await import('node:path');
	const { homedir, tmpdir } = await import('node:os');
	const candidatos = [];
	const app = join(homedir(), 'Library/Application Support/Claude/claude-code');
	try {
		for (const v of readdirSync(app)) for (const h of readdirSync(join(app, v))) candidatos.push(join(app, v, h, 'claude.app/Contents/MacOS/claude'));
	} catch {}
	const claude = process.env.DGATHE_CLAUDE || candidatos.filter(existsSync).sort().pop();
	const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CLAUDE') && !k.startsWith('DGATHE_')));
	console.log(JSON.stringify(await lerUsoDoClaude({ claude, env, cwd: tmpdir() }), null, 2));
}
