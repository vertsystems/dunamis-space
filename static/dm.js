/*! DMetric — contador de acessos da Dunamis Space. Sem cookie, sem dados pessoais.
 *  Mede também a saúde da página no aparelho de quem visita: velocidade (Web
 *  Vitals), erros de JavaScript, arquivos que não carregaram e páginas 404.
 *  O mesmo código para qualquer site (o site é reconhecido pelo domínio):
 *    <script defer src="https://dspace.verts.me/dm.js"></script>
 *  Opcional: data-local (conta também em localhost, para testar);
 *  data-dm="Nome" em qualquer botão/link do site conta os cliques nele;
 *  data-dm-link="https://…" num link que passa por um redirecionamento do próprio
 *  site (o /ir/ do PageLinks) diz o destino de verdade, e o clique conta por ele. */
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

	function mesmoSite(endereco) {
		try {
			var u = new URL(endereco);
			return u.hostname === location.hostname ? u.pathname : '';
		} catch (e) {
			return '';
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
		// URL já mudou quando isto roda). Página 404 não conta tempo.
		if (seg >= 1 && !quebrada) enviar({ t: 'tempo', s: seg }, ultimo);
	}
	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') {
			escondidaEm = Math.min(escondidaEm, performance.now());
			mandarTempo();
			mandarVitais();
		} else visivelDesde = Date.now();
	});
	addEventListener('pagehide', function () {
		mandarTempo();
		mandarVitais();
	});

	// ---- Saúde: a velocidade que a pessoa sentiu, no aparelho dela ----
	// As medidas do Google (Web Vitals), sem biblioteca: carregamento (LCP),
	// resposta ao toque (INP), estabilidade (CLS), primeira imagem (FCP) e
	// resposta do servidor (TTFB). Vão uma vez só, quando a pessoa sai (ou troca
	// de aba), com a página em que ela chegou. Navegador que não mede alguma
	// (o Safari não tem CLS) só não manda aquela.
	var vi = {};
	var chegada = location.pathname;
	var escondidaEm = document.visibilityState === 'hidden' ? 0 : Infinity;
	var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
	var ativacao = (nav && nav.activationStart) || 0;
	if (nav && nav.responseStart > 0) vi.ttfb = Math.max(nav.responseStart - ativacao, 0);

	function observar(tipo, fn, extra) {
		try {
			if (PerformanceObserver.supportedEntryTypes.indexOf(tipo) < 0) return false;
			var opcoes = { type: tipo, buffered: true };
			for (var k in extra) opcoes[k] = extra[k];
			new PerformanceObserver(function (lista) {
				lista.getEntries().forEach(fn);
			}).observe(opcoes);
			return true;
		} catch (e) {
			return false;
		}
	}
	// Aberta em segundo plano, a página não "carregou na frente" de ninguém:
	// primeira imagem e carregamento só valem antes de a aba sumir.
	observar('paint', function (e) {
		if (e.name === 'first-contentful-paint' && e.startTime < escondidaEm) vi.fcp = Math.max(e.startTime - ativacao, 0);
	});
	observar('largest-contentful-paint', function (e) {
		if (e.startTime < escondidaEm) vi.lcp = Math.max(e.startTime - ativacao, 0);
	});
	// Estabilidade: a maior "rajada" de pulos (até 5 s, com menos de 1 s entre um e outro).
	var rajada = 0, rajadaIni = 0, rajadaFim = 0;
	if (
		observar('layout-shift', function (e) {
			if (e.hadRecentInput) return;
			if (rajada && e.startTime - rajadaFim < 1000 && e.startTime - rajadaIni < 5000) rajada += e.value;
			else {
				rajada = e.value;
				rajadaIni = e.startTime;
			}
			rajadaFim = e.startTime;
			if (rajada > vi.cls) vi.cls = rajada;
		})
	)
		vi.cls = 0;
	// Resposta ao toque: a pior espera entre tocar e a tela reagir.
	var toques = {};
	function interacao(e) {
		if (e.interactionId && !(toques[e.interactionId] >= e.duration)) toques[e.interactionId] = e.duration;
	}
	observar('event', interacao, { durationThreshold: 40 });
	observar('first-input', interacao);

	var vitaisForam = false;
	function mandarVitais() {
		// Página que ninguém chegou a ver (pré-carregada e descartada) não mede nada.
		if (vitaisForam || quebradaNaChegada || ultimo === null) return;
		vitaisForam = true;
		var d = [];
		for (var id in toques) d.push(toques[id]);
		d.sort(function (a, b) {
			return b - a;
		});
		// Até 50 toques vale o pior; depois, deixa um de fora a cada 50 (como o Google).
		if (d.length) vi.inp = d[Math.min(d.length - 1, Math.floor(d.length / 50))];
		var tem = false;
		for (var k in vi) {
			vi[k] = k === 'cls' ? Math.round(vi[k] * 10000) / 10000 : Math.round(vi[k]);
			tem = true;
		}
		if (tem) enviar({ t: 'vitais', vi: vi }, chegada);
	}

	// ---- Saúde: erros de JavaScript e arquivos que não carregaram ----
	// Até a primeira página vista sair, os erros esperam na fila: na primeira
	// visita de um site, é ela que cria o site no painel.
	var erros = 0, errosVistos = {}, fila = [];
	function esvaziarFila() {
		var f = fila;
		fila = null;
		for (var i = 0; i < f.length; i++) enviar(f[i][0], f[i][1]);
	}
	function erro(mensagem, arquivo, recurso) {
		if (erros >= 10 || !mensagem || errosVistos[mensagem]) return;
		errosVistos[mensagem] = 1;
		erros++;
		var dominio = '';
		try {
			dominio = arquivo ? new URL(arquivo, location.href).hostname : '';
		} catch (e) {}
		var dados = { t: 'erro', m: String(mensagem).slice(0, 400), o: dominio, x: recurso ? 1 : 0 };
		if (fila) fila.push([dados, location.pathname]);
		else enviar(dados);
	}
	// <source> que o navegador só pulou também dispara 'error': o vídeo de
	// celular aberto no computador (media), ou o AV1 num aparelho que não toca
	// AV1 (type). Não é arquivo quebrado: o vídeo segue para a próxima opção.
	function fontePulada(fonte) {
		var midia = fonte.parentNode;
		if (fonte.media && window.matchMedia && !matchMedia(fonte.media).matches) return true;
		return !!(fonte.type && midia && midia.canPlayType && !midia.canPlayType(fonte.type));
	}
	addEventListener(
		'error',
		function (e) {
			var el = e.target;
			if (el && el !== window && el.tagName) {
				// Imagem, script, estilo ou vídeo que não carregou.
				if (el.tagName === 'SOURCE' && fontePulada(el)) return;
				var src = el.currentSrc || el.src || el.href;
				// Imagem quebrada no Chrome: o currentSrc vem como está no HTML
				// ("/img/x.webp"), sem o domínio. Completa antes de conferir o http.
				try {
					if (src) src = new URL(src, document.baseURI).href;
				} catch (e2) {}
				if (/^(IMG|SCRIPT|LINK|VIDEO|AUDIO|SOURCE)$/.test(el.tagName) && /^https?:/.test(src || '')) erro(src, src, true);
				return;
			}
			// Script de extensão do navegador não é do site.
			if (e.filename && !/^https?:/.test(e.filename)) return;
			erro(e.message, e.filename, false);
		},
		true
	);
	addEventListener('unhandledrejection', function (e) {
		var r = e.reason;
		erro(r && r.message ? (r.name ? r.name + ': ' : '') + r.message : typeof r === 'string' ? r : '', '', false);
	});
	// O script chega depois (defer): o que quebrou antes dele, a lista de
	// arquivos do navegador conta — inclusive fundo e fonte do CSS (responseStatus:
	// Chrome, Edge, Firefox).
	try {
		performance.getEntriesByType('resource').forEach(function (r) {
			if (r.responseStatus >= 400 && /^(img|script|link|css|video|audio)$/.test(r.initiatorType)) erro(r.name, r.name, true);
		});
	} catch (e) {}

	// ---- Saúde: página que não existe (404) ----
	// O servidor diz (Chrome, Edge, Firefox) — ou a própria página diz, no título
	// ou no título principal (sites de uma página só respondem "ok" até no
	// endereço errado).
	var quebrada = false, quebradaNaChegada = false;
	function naoEncontrada(primeira) {
		if (primeira && nav && (nav.responseStatus === 404 || nav.responseStatus === 410)) return true;
		var h1 = document.querySelector('h1');
		return (
			/(^|\D)404(\D|$)|not found|n[ãa]o (foi )?encontrad|p[áa]gina inexistente/i.test(document.title) ||
			!!(h1 && /^\s*404\b/.test(h1.textContent || ''))
		);
	}

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
		var caminho = location.pathname;
		var dados = {
			// Na navegação interna de um site de uma página só, quem indicou é o próprio site.
			r: anterior === null ? document.referrer : location.origin,
			u: param('utm_source'),
			c: param('utm_campaign'),
			w: screen.width
		};
		// O título vai junto (é o nome da página no painel). Numa troca sem
		// recarregar, o site costuma mudar o título logo depois da URL: espera
		// um instante para não mandar o título da página anterior.
		quebrada = false;
		setTimeout(
			function () {
				if (naoEncontrada(anterior === null)) {
					// 404 não é página vista (nem vira site no painel): vai para a
					// saúde, com a página de onde veio o clique.
					quebrada = true;
					if (anterior === null) quebradaNaChegada = true;
					if (fila) setTimeout(esvaziarFila, 1000);
					return enviar({ t: '404', o: anterior !== null ? anterior : mesmoSite(document.referrer), r: document.referrer }, caminho);
				}
				dados.ti = document.title;
				enviar(dados, caminho);
				if (fila) setTimeout(esvaziarFila, 1000);
			},
			anterior === null ? 0 : 400
		);
	}

	// ---- Cliques: WhatsApp, telefone, e-mail, mapa, links para fora, data-dm ----
	document.addEventListener(
		'click',
		function (e) {
			var alvo = e.target && e.target.closest ? e.target.closest('[data-dm], a[href]') : null;
			if (!alvo) return;
			if (quebrada) return;
			var nome = alvo.getAttribute('data-dm');
			if (nome) return enviar({ t: 'clique', e: nome });
			// O link passa por um redirecionamento do próprio site (o /ir/ do PageLinks):
			// o destino de verdade vem em data-dm-link, e é por ele que o clique conta
			// (WhatsApp, Mapa, Instagram…). Sem isso, parecia navegação e não contava.
			var destino = alvo.getAttribute('data-dm-link');
			if (destino) return enviar({ t: 'clique', l: destino });
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

	// Pré-carregada pelo navegador ou aberta escondida — o app do Instagram e do
	// Facebook carrega a página do anúncio em segundo plano, antes do toque —:
	// só conta quando aparecer na tela. Ninguém viu, não é visita.
	function quandoAparecer(fn) {
		if (document.prerendering) {
			document.addEventListener('prerenderingchange', function () {
				quandoAparecer(fn);
			}, { once: true });
			return;
		}
		if (document.visibilityState === 'visible') return fn();
		document.addEventListener('visibilitychange', function ver() {
			if (document.visibilityState !== 'visible') return;
			document.removeEventListener('visibilitychange', ver);
			fn();
		});
	}
	quandoAparecer(contar);
})();
