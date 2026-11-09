-- ============================================================
-- DGathe — quem está parado troca de ambiente a cada 3 horas
--
-- Pedido do Bruno (09/11/2026): offline ou ausente muda de ambiente a cada
-- 3 h, para um lugar sorteado em qualquer sala ("dá um ar de vida"), sem
-- ocupar cadeira de agente quando os agentes chegarem. Quem sorteia é cada
-- tela (src/lib/dgathe/movimento.ts), com a mesma conta em todas: para isso
-- o banco passa a dizer DESDE QUANDO cada um está parado, no relógio dele.
--
--   - inativo_desde: quando a pessoa ficou 15 min sem mexer (null = mexendo)
--   - dgathe_quem devolve, em segundos desde 1970 e no relógio do servidor:
--     agora, visto (último sinal), saiu (despedida depois do último sinal) e
--     inativo_desde; e se a pessoa é CEO (CEO fica sempre na Diretoria)
--
-- Para desfazer:
--   drop function if exists public.dgathe_quem();  e reaplicar a 0099
--   alter table public.dgathe_presenca drop column if exists inativo_desde;
-- ============================================================

alter table public.dgathe_presenca add column if not exists inativo_desde timestamptz;

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
		and p_x between 0 and 48 and p_y between 0 and 31;
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
		case when v_pos then p_x else 20.5 end,
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

drop function if exists public.dgathe_quem();

create function public.dgathe_quem()
returns table (
	id uuid,
	nome text,
	funcao text,
	foto text,
	cor text,
	aparencia jsonb,
	x real,
	y real,
	dir_x real,
	dir_y real,
	mov bigint,
	sem_sinal real,
	saiu_ha real,
	inativo boolean,
	assento text,
	ceo boolean,
	agora double precision,
	visto double precision,
	saiu double precision,
	inativo_desde double precision
)
language sql
volatile
security definer
set search_path = public
as $$
	select
		c.id,
		c.nome,
		coalesce(c.funcoes[1], c.funcao::text),
		c.avatar_url,
		c.cor_tema,
		c.dgathe_avatar,
		d.x,
		d.y,
		d.dir_x,
		d.dir_y,
		d.mov,
		extract(epoch from clock_timestamp() - d.visto_em)::real,
		case when d.saiu_em is not null and d.saiu_em >= d.visto_em
			then extract(epoch from clock_timestamp() - d.saiu_em)::real end,
		d.inativo,
		d.assento,
		c.funcao::text = 'ceo' or 'ceo' = any(c.funcoes),
		extract(epoch from clock_timestamp())::double precision,
		extract(epoch from d.visto_em)::double precision,
		case when d.saiu_em is not null and d.saiu_em >= d.visto_em
			then extract(epoch from d.saiu_em)::double precision end,
		extract(epoch from d.inativo_desde)::double precision
	from public.dgathe_presenca d
	join public.colaboradores c on c.id = d.colaborador_id
	where public.tem_permissao('dgathe', 'ver') and c.ativo is not false
	order by c.nome;
$$;

revoke execute on function public.dgathe_quem() from public, anon;
grant execute on function public.dgathe_quem() to authenticated;
