/*! DMetric — contador de acessos da Dunamis Space. Sem cookie, sem dados pessoais.
 *  O mesmo código para qualquer site (o site é reconhecido pelo domínio):
 *    <script defer src="https://dspace.verts.me/dm.js"></script>
 *  Opcional: data-local (conta também em localhost, para testar);
 *  data-dm="Nome" em qualquer botão/link do site conta os cliques nele. */
(function () {
	var s = document.currentScript;
	if (!s) return;
	var chave = s.getAttribute('data-site') || ''; // código antigo, por site
	var destino = new URL(s.src).origin + '/api/dm';
	var local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);
	if (navigator.webdriver || (local && !s.hasAttribute('data-local'))) return;

	function enviar(dados, caminho) {
		dados.k = chave;
		dados.h = location.hostname;
		dados.p = caminho || location.pathname;
		// Blob SEM tipo: vai sem Content-Type. Com text/plain o SvelteKit
		// recusaria (proteção de CSRF para POST de outro domínio), e com
		// application/json o navegador faria preflight de CORS a cada página.
		var corpo = new Blob([JSON.stringify(dados)]);
		if (!(navigator.sendBeacon && navigator.sendBeacon(destino, corpo))) {
			fetch(destino, { method: 'POST', body: corpo, keepalive: true, mode: 'no-cors' });
		}
	}

	function param(nome) {
		var m = location.search.match(new RegExp('[?&]' + nome + '=([^&#]*)'));
		return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
	}

	// ---- Tempo de tela: só conta com a aba visível ----
	var visivelDesde = document.visibilityState === 'visible' ? Date.now() : 0;
	var acumulado = 0;
	function pausar() {
		if (visivelDesde) acumulado += Date.now() - visivelDesde;
		visivelDesde = 0;
	}
	var ultimo = null;
	function mandarTempo() {
		pausar();
		var seg = Math.round(acumulado / 1000);
		acumulado = 0;
		// O tempo é da página que estava na tela (numa troca sem recarregar, a
		// URL já mudou quando isto roda).
		if (seg >= 1) enviar({ t: 'tempo', s: seg }, ultimo);
	}
	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') mandarTempo();
		else visivelDesde = Date.now();
	});
	addEventListener('pagehide', mandarTempo);

	// ---- Página vista ----
	function contar() {
		// Mesma página de novo (hash, re-render) não é outra visualização.
		if (location.pathname === ultimo) return;
		var anterior = ultimo;
		if (anterior !== null) {
			// Troca de página sem recarregar: fecha o tempo da que saiu.
			mandarTempo();
			if (document.visibilityState === 'visible') visivelDesde = Date.now();
		}
		ultimo = location.pathname;
		enviar({
			// Na navegação interna de um site de uma página só, quem indicou é o próprio site.
			r: anterior === null ? document.referrer : location.origin,
			u: param('utm_source'),
			c: param('utm_campaign'),
			w: screen.width
		});
	}

	// ---- Cliques: WhatsApp, telefone, e-mail, mapa, links para fora, data-dm ----
	document.addEventListener(
		'click',
		function (e) {
			var alvo = e.target && e.target.closest ? e.target.closest('[data-dm], a[href]') : null;
			if (!alvo) return;
			var nome = alvo.getAttribute('data-dm');
			if (nome) return enviar({ t: 'clique', e: nome });
			// Link para o próprio site é navegação (a página vista já conta).
			if (/^https?:$/.test(alvo.protocol) && alvo.hostname === location.hostname) return;
			enviar({ t: 'clique', l: alvo.href });
		},
		true
	);

	// Sites de uma página só (React, Svelte, Vue…) trocam de página sem recarregar.
	var push = history.pushState;
	history.pushState = function () {
		push.apply(this, arguments);
		contar();
	};
	addEventListener('popstate', contar);
	contar();
})();
