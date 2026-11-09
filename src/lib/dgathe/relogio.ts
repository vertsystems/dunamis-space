/**
 * Relógio que não atrasa com a aba em segundo plano: o navegador segura o
 * setInterval da página (até uma vez por minuto, ou mais), mas não o de um Web
 * Worker. Sem Worker (testes, navegador velho), cai no setInterval.
 * Devolve a função que para o relógio.
 */
export function relogio(ms: number, f: () => void): () => void {
	if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
		try {
			const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: 'text/javascript' }));
			const w = new Worker(url);
			let reserva: ReturnType<typeof setInterval> | undefined;
			w.onmessage = () => f();
			w.onerror = () => {
				w.terminate();
				reserva ??= setInterval(f, ms);
			};
			return () => {
				w.terminate();
				clearInterval(reserva);
				URL.revokeObjectURL(url);
			};
		} catch {
			// sem Worker: segue com o setInterval
		}
	}
	const id = setInterval(f, ms);
	return () => clearInterval(id);
}
