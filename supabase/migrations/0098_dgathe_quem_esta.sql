-- ============================================================
-- DGathe — quem está no escritório, guardado no banco
--
-- Antes (0096) a presença era só do Supabase Realtime, de navegador para
-- navegador, e falhava: gente sumindo, piscando, voltando ao começo do
-- caminho. O Bruno pediu (09/11/2026) que fosse certo, mesmo com uns segundos
-- de atraso: entrou no dspace = está no escritório, em qualquer tela ou aba;
-- saiu ou ficou ausente = sentado na recepção.
--
-- Agora há uma linha por pessoa, com onde ela está (ou para onde está indo,
-- desde o primeiro passo) e o último sinal de vida:
--   - dgathe_pulso(): todo dspace aberto chama a cada 30 s; quem anda chama
--     também com o destino e o carimbo do movimento (mov, o mais novo vence)
--   - dgathe_saiu(): despedida, ao fechar a última aba ou sair do sistema
--   - dgathe_quem(): o DGathe lê todo mundo a cada 3 s
-- As horas são as do servidor (clock_timestamp): relógio errado numa máquina
-- não atrapalha.
--
-- Ninguém lê nem grava a tabela direto (RLS sem policy): só pelas funções,
-- e só quem tem o módulo 'dgathe', cada um na própria linha.
--
-- Para desfazer:
--   drop function if exists public.dgathe_quem();
--   drop function if exists public.dgathe_saiu();
--   drop function if exists public.dgathe_pulso(real, real, real, real, bigint);
--   drop table if exists public.dgathe_presenca;
-- ============================================================

create table if not exists public.dgathe_presenca (
	colaborador_id uuid primary key references public.colaboradores (id) on delete cascade,
	x real not null default 20.5,
	y real not null default 22.2,
	dir_x real not null default 1,
	dir_y real not null default 1,
	-- Carimbo do movimento, no relógio de quem anda (ms): o mais novo vence
	mov bigint not null default 0,
	visto_em timestamptz not null default now(),
	saiu_em timestamptz
);

alter table public.dgathe_presenca enable row level security;
revoke all on public.dgathe_presenca from anon, authenticated;

comment on table public.dgathe_presenca is
	'DGathe: onde cada pessoa está no escritório e o último sinal de vida. Só pelas funções dgathe_pulso, dgathe_saiu e dgathe_quem.';

-- Sinal de vida, com ou sem posição. Posição só vale com carimbo igual ou mais
-- novo que o guardado (um pedido atrasado não desfaz um movimento mais novo).
create or replace function public.dgathe_pulso(
	p_x real default null,
	p_y real default null,
	p_dir_x real default null,
	p_dir_y real default null,
	p_mov bigint default null
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
begin
	if v_id is null or not public.tem_permissao('dgathe', 'ver') then
		return;
	end if;
	insert into public.dgathe_presenca as d (colaborador_id, x, y, dir_x, dir_y, mov, visto_em)
	values (
		v_id,
		case when v_pos then p_x else 20.5 end,
		case when v_pos then p_y else 22.2 end,
		case when v_pos then v_dx else 1 end,
		case when v_pos then v_dy else 1 end,
		case when v_pos then p_mov else 0 end,
		clock_timestamp()
	)
	on conflict (colaborador_id) do update set
		visto_em = clock_timestamp(),
		x = case when v_pos and p_mov >= d.mov then p_x else d.x end,
		y = case when v_pos and p_mov >= d.mov then p_y else d.y end,
		dir_x = case when v_pos and p_mov >= d.mov then v_dx else d.dir_x end,
		dir_y = case when v_pos and p_mov >= d.mov then v_dy else d.dir_y end,
		mov = case when v_pos and p_mov >= d.mov then p_mov else d.mov end;
end;
$$;

create or replace function public.dgathe_saiu() returns void
language sql
security definer
set search_path = public
as $$
	update public.dgathe_presenca set saiu_em = clock_timestamp() where colaborador_id = public.colaborador_atual();
$$;

-- Todo mundo que já entrou no escritório, com há quantos segundos deu sinal e
-- há quantos se despediu (null se voltou depois da despedida).
create or replace function public.dgathe_quem()
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
	saiu_ha real
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
			then extract(epoch from clock_timestamp() - d.saiu_em)::real end
	from public.dgathe_presenca d
	join public.colaboradores c on c.id = d.colaborador_id
	where public.tem_permissao('dgathe', 'ver') and c.ativo is not false
	order by c.nome;
$$;

revoke execute on function public.dgathe_pulso(real, real, real, real, bigint) from public, anon;
revoke execute on function public.dgathe_saiu() from public, anon;
revoke execute on function public.dgathe_quem() from public, anon;
grant execute on function public.dgathe_pulso(real, real, real, real, bigint) to authenticated;
grant execute on function public.dgathe_saiu() to authenticated;
grant execute on function public.dgathe_quem() to authenticated;
