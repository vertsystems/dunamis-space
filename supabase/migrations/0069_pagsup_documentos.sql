-- ============================================================
-- Pag's Up — NF ou recibo de cada pagamento + painel público do financeiro
--
-- Desde 30/09/2026 a Lojas Mari exige NF (ou recibo, para pessoa física) de
-- todo pagamento. O controle vivia fora do sistema. Agora cada pagamento da
-- Planilha Mensal guarda o PDF do seu documento — só para controle interno: a
-- planilha .xlsx enviada ao cliente continua sem essas colunas.
--
-- Um documento por pagamento, em colunas no próprio pagamento (e não numa
-- tabela à parte): a pergunta é sempre "este pagamento já tem NF?", e um
-- segundo arquivo para a mesma linha seria substituição, não acúmulo.
--
-- Peso: o app só aceita PDF e o compacta no navegador ANTES de subir, até
-- caber em 50 KB (ver src/lib/pagsup/compactarPdf.ts). O bucket repete a regra
-- porque validação de navegador não é barreira. E o PDF não fica para sempre:
-- a faxina diária apaga os enviados há mais de 3 meses (rota
-- /api/pagsup/limpeza, agendada em vercel.json). A linha do pagamento continua
-- dizendo que o documento existiu (doc_tipo + doc_apagado_em).
--
-- Painel público: cada cliente do Pag's Up pode ter um link /pagamentos/<token>
-- para o financeiro dele conferir o mês e baixar as NFs e recibos. O token é
-- gerado e desligado na própria Planilha Mensal; a leitura passa por uma
-- função security definer que só devolve os pagamentos daquele cliente.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0069_pagsup_documentos.sql
-- ============================================================

-- ---------- Documento do pagamento ----------
alter table public.pagsup_pagamentos
	add column if not exists doc_tipo text,
	add column if not exists doc_arquivo text,
	add column if not exists doc_nome text,
	add column if not exists doc_bytes integer,
	add column if not exists doc_enviado_em timestamptz,
	add column if not exists doc_apagado_em timestamptz;

alter table public.pagsup_pagamentos
	drop constraint if exists pagsup_pagamentos_doc_tipo_check;
alter table public.pagsup_pagamentos
	add constraint pagsup_pagamentos_doc_tipo_check check (doc_tipo in ('nf', 'recibo'));

comment on column public.pagsup_pagamentos.doc_tipo is
	'nf ou recibo. Continua preenchido depois que a faxina apaga o PDF: o pagamento teve documento.';
comment on column public.pagsup_pagamentos.doc_arquivo is
	'Caminho do PDF no bucket pagsup-docs. Nulo = sem PDF (pendente, ou já apagado pela faxina).';
comment on column public.pagsup_pagamentos.doc_nome is 'Nome original do arquivo enviado.';
comment on column public.pagsup_pagamentos.doc_bytes is 'Tamanho do PDF depois de compactado.';
comment on column public.pagsup_pagamentos.doc_enviado_em is 'Quando o PDF subiu. A faxina conta os 3 meses daqui.';
comment on column public.pagsup_pagamentos.doc_apagado_em is 'Quando a faxina tirou o PDF do Storage.';

-- A faxina procura os PDFs ainda guardados, do mais antigo para o mais novo.
create index if not exists idx_pagsup_pagamentos_doc_enviado
	on public.pagsup_pagamentos (doc_enviado_em)
	where doc_arquivo is not null;

-- ---------- Link público por cliente ----------
alter table public.pagsup_clientes
	add column if not exists token_publico uuid;

create unique index if not exists pagsup_clientes_token_publico_key
	on public.pagsup_clientes (token_publico)
	where token_publico is not null;

comment on column public.pagsup_clientes.token_publico is
	'Token do link /pagamentos/<token> do financeiro do cliente. Nulo = link desligado.';

-- ---------- Bucket dos PDFs ----------
-- Público para o download funcionar sem login (o financeiro do cliente não tem
-- conta). O nome de cada arquivo é um UUID aleatório, e NÃO há policy de
-- leitura para anônimos: sem ela, quem não está logado baixa um arquivo cujo
-- endereço recebeu, mas não consegue listar o bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pagsup-docs', 'pagsup-docs', true, 51200, array['application/pdf'])
on conflict (id) do update
	set public = true,
		file_size_limit = 51200,
		allowed_mime_types = array['application/pdf'];

drop policy if exists "pagsup_docs_leitura" on storage.objects;
create policy "pagsup_docs_leitura" on storage.objects
	for select to authenticated using (bucket_id = 'pagsup-docs');

drop policy if exists "pagsup_docs_escrita" on storage.objects;
create policy "pagsup_docs_escrita" on storage.objects
	for insert to authenticated with check (bucket_id = 'pagsup-docs');

drop policy if exists "pagsup_docs_update" on storage.objects;
create policy "pagsup_docs_update" on storage.objects
	for update to authenticated using (bucket_id = 'pagsup-docs') with check (bucket_id = 'pagsup-docs');

drop policy if exists "pagsup_docs_remocao" on storage.objects;
create policy "pagsup_docs_remocao" on storage.objects
	for delete to authenticated using (bucket_id = 'pagsup-docs');

-- ---------- Leitura do painel público ----------
-- Devolve null para token desconhecido (link errado ou desligado). Sem p_mes,
-- ou com um mês sem pagamentos, abre no mês mais recente que tem pagamento.
--
-- Fica de fora o que é só da agência: observações, CPF/CNPJ e Pix.
create or replace function public.pagsup_publico(p_token uuid, p_mes text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_cliente public.pagsup_clientes%rowtype;
	v_meses text[];
	v_mes text;
begin
	if p_token is null then
		return null;
	end if;

	select * into v_cliente from public.pagsup_clientes where token_publico = p_token;
	if not found then
		return null;
	end if;

	select coalesce(array_agg(m order by m desc), '{}')
		into v_meses
		from (
			select distinct to_char(data_pagamento, 'YYYY-MM') as m
			from public.pagsup_pagamentos
			where cliente_id = v_cliente.id
		) s;

	v_mes := case when p_mes = any (v_meses) then p_mes else v_meses[1] end;

	return jsonb_build_object(
		'cliente', v_cliente.nome,
		'meses', to_jsonb(v_meses),
		'mes', v_mes,
		'pagamentos', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', p.id,
					'prestador', p.prestador_nome,
					'servico', p.servico,
					'regiao', p.regiao,
					'lj', p.lj,
					'data', p.data_pagamento,
					'valor', p.valor,
					'doc_tipo', p.doc_tipo,
					'doc_arquivo', p.doc_arquivo,
					'doc_apagado_em', p.doc_apagado_em
				)
				order by p.servico, p.data_pagamento, p.prestador_nome
			)
			from public.pagsup_pagamentos p
			where p.cliente_id = v_cliente.id
				and to_char(p.data_pagamento, 'YYYY-MM') = v_mes
		), '[]'::jsonb)
	);
end;
$$;

revoke all on function public.pagsup_publico(uuid, text) from public;
grant execute on function public.pagsup_publico(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
