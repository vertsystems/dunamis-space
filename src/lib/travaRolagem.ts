// Trava da rolagem do fundo enquanto há modal aberto.
//
// Por que não é cada modal cuidando do seu: antes, cada um guardava o
// `body.style.overflow` que encontrou ao abrir e devolvia esse valor ao fechar.
// Com DOIS modais no ar isso quebra — e no calendário isso acontece o tempo
// todo, porque clicar num post dentro da agenda do dia fecha um modal e abre
// outro no mesmo tick:
//
//   agenda abre        → guarda ''      , overflow = 'hidden'
//   edição abre        → guarda 'hidden', overflow = 'hidden'
//   agenda fecha       → overflow = ''            (fundo rola com modal aberto)
//   edição fecha       → overflow = 'hidden'      → SCROLL TRAVADO SEM MODAL
//
// Aqui a decisão é de quantos, não de quem: trava quando o primeiro abre,
// destrava quando o último fecha. Fechar duas vezes ou fora de ordem não muda
// o resultado.

let abertos = 0;
/** Valor original da página, capturado só na primeira trava. */
let original = '';

/** Trava a rolagem. Devolve a função que solta — chame uma vez por trava. */
export function travarRolagem(): () => void {
	if (typeof document === 'undefined') return () => {};

	if (abertos === 0) {
		original = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}
	abertos++;

	let soltou = false;
	return () => {
		// Guarda contra soltar duas vezes: o contador não pode ficar negativo e
		// destravar a página com um modal ainda aberto.
		if (soltou) return;
		soltou = true;
		abertos = Math.max(0, abertos - 1);
		if (abertos === 0) document.body.style.overflow = original;
	};
}

/** Só para os testes: zera o estado entre um caso e outro. */
export function _resetTravaRolagem() {
	abertos = 0;
	original = '';
}

/** Só para os testes: quantas travas estão de pé. */
export function _travasAbertas() {
	return abertos;
}
