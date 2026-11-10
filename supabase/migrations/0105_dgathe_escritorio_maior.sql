-- ============================================================
-- DGathe — o escritório cresceu 16 casas para a esquerda
--
-- Pedido do Bruno (10/11/2026): 5 salas novas no fundo (a sala do Bruno, a da
-- Aline e 3 vazias). O mapa (src/lib/dgathe/mapa.ts) passou de 48 para 64
-- casas de largura e tudo o que existia andou 16 casas (x + 16).
--
--   - dgathe_pulso aceita x até 64 (antes, 48: quem passasse disso perderia a
--     posição) e manda quem chega sem posição para a recepção nova (36,5; 22,2)
--   - as posições guardadas andam junto, uma vez só
--
-- Os assentos guardados (dgathe_presenca.assento) não mudam: o id de cada
-- móvel antigo continua o mesmo, porque os móveis novos nasceram depois deles.
--
-- Para desfazer: reaplicar a função da 0100 e
--   update public.dgathe_presenca set x = greatest(0, x - 16);
-- ============================================================

create or replace function public.dgathe_pulso(
	p_x real default null,
	p_y real default null,
	p_dir_x real default null,
	p_dir_y real default null,
	p_mov bigint default null,
	p_inativo boolean default null,
	p_assento text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_id uuid := public.colaborador_atual();
	v_pos boolean := p_x is not null and p_y is not null and p_mov is not null
		and p_x between 0 and 64 and p_y between 0 and 31;
	v_dx real := greatest(-1, least(1, coalesce(p_dir_x, 1)));
	v_dy real := greatest(-1, least(1, coalesce(p_dir_y, 1)));
	v_assento text := case when p_assento ~ '^[a-z0-9:.-]{1,60}$' then p_assento end;
begin
	if v_id is null or not public.tem_permissao('dgathe', 'ver') then
		return;
	end if;
	insert into public.dgathe_presenca as d (colaborador_id, x, y, dir_x, dir_y, mov, visto_em, inativo, inativo_desde, assento)
	values (
		v_id,
		case when v_pos then p_x else 36.5 end,
		case when v_pos then p_y else 22.2 end,
		case when v_pos then v_dx else 1 end,
		case when v_pos then v_dy else 1 end,
		case when v_pos then p_mov else 0 end,
		clock_timestamp(),
		coalesce(p_inativo, false),
		case when p_inativo then clock_timestamp() end,
		case when v_pos then v_assento end
	)
	on conflict (colaborador_id) do update set
		visto_em = clock_timestamp(),
		x = case when v_pos and p_mov >= d.mov then p_x else d.x end,
		y = case when v_pos and p_mov >= d.mov then p_y else d.y end,
		dir_x = case when v_pos and p_mov >= d.mov then v_dx else d.dir_x end,
		dir_y = case when v_pos and p_mov >= d.mov then v_dy else d.dir_y end,
		assento = case when v_pos and p_mov >= d.mov then v_assento else d.assento end,
		mov = case when v_pos and p_mov >= d.mov then p_mov else d.mov end,
		inativo = coalesce(p_inativo, d.inativo),
		-- Só a passagem de mexendo para parado marca a hora; voltar a mexer limpa
		inativo_desde = case
			when p_inativo is true and not d.inativo then clock_timestamp()
			when p_inativo is true then coalesce(d.inativo_desde, clock_timestamp())
			when p_inativo is false then null
			else d.inativo_desde
		end;
end;
$$;

-- Uma vez só: as posições de antes do prédio crescer andam junto com ele
update public.dgathe_presenca set x = x + 16 where x <= 48;
