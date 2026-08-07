import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			//
			// regions: o banco Supabase fica em us-west-2 (Oregon) e as funções
			// nasciam em iad1 (Washington) — cada consulta cruzava os EUA. Medido em
			// produção pela rota /api/_diag: 123 ms POR consulta, 650 ms para cinco
			// em série. pdx1 é a região da Vercel na mesma casa do banco.
			//
			// O troco é ~60 ms a mais entre o usuário e a função (uma vez por
			// requisição) contra 100+ ms economizados em CADA consulta — e uma tela
			// como a Visão Geral faz mais de dez.
			adapter: adapter({ regions: ['pdx1'] })
		})
	]
});
