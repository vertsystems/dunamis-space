/*! DMetric — contador de acessos da Dunamis Space. Sem cookie, sem dados pessoais.
 *  <script defer src="https://dspace.verts.me/dm.js" data-site="CHAVE"></script>
 *  Opcional: data-local (conta também em localhost, para testar). */
(function () {
	var s = document.currentScript;
	if (!s) return;
	var chave = s.getAttribute('data-site');
	var destino = new URL(s.src).origin + '/api/dm';
	var local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);
	if (!chave || navigator.webdriver || (local && !s.hasAttribute('data-local'))) return;

	var ultimo = null;
	function contar() {
		// Mesma página de novo (hash, re-render) não é outra visualização.
		if (location.pathname === ultimo) return;
		var anterior = ultimo;
		ultimo = location.pathname;
		var utm = (location.search.match(/[?&]utm_source=([^&#]*)/) || [])[1];
		var dados = JSON.stringify({
			k: chave,
			h: location.hostname,
			p: location.pathname,
			// Na navegação interna de um site de uma página só, quem indicou é o próprio site.
			r: anterior === null ? document.referrer : location.origin,
			u: utm ? decodeURIComponent(utm.replace(/\+/g, ' ')) : '',
			w: screen.width
		});
		// Blob SEM tipo: vai sem Content-Type. Com text/plain o SvelteKit
		// recusaria (proteção de CSRF para POST de outro domínio), e com
		// application/json o navegador faria preflight de CORS a cada página.
		var corpo = new Blob([dados]);
		if (!(navigator.sendBeacon && navigator.sendBeacon(destino, corpo))) {
			fetch(destino, { method: 'POST', body: corpo, keepalive: true, mode: 'no-cors' });
		}
	}

	// Sites de uma página só (React, Svelte, Vue…) trocam de página sem recarregar.
	var push = history.pushState;
	history.pushState = function () {
		push.apply(this, arguments);
		contar();
	};
	addEventListener('popstate', contar);
	contar();
})();
