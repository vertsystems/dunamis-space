// GERADO AUTOMATICAMENTE — não edite à mão.
// Regenerar:  PGPASSWORD='<senha-postgres>' node scripts/gen-types.mjs
//
// Reflete o schema public do Supabase (2026-08-07).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			adm_acessos: {
				Row: {
					id: string
					plataforma: string
					login: string | null
					url: string | null
					local_senha: string | null
					responsavel_id: string | null
					observacoes: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					plataforma: string
					login?: string | null
					url?: string | null
					local_senha?: string | null
					responsavel_id?: string | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					plataforma?: string
					login?: string | null
					url?: string | null
					local_senha?: string | null
					responsavel_id?: string | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			adm_ferramentas: {
				Row: {
					id: string
					nome: string
					categoria: string | null
					url: string | null
					custo_mensal: number
					ciclo: string
					proxima_renovacao: string | null
					responsavel_id: string | null
					ativo: boolean
					observacoes: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					nome: string
					categoria?: string | null
					url?: string | null
					custo_mensal?: number
					ciclo?: string
					proxima_renovacao?: string | null
					responsavel_id?: string | null
					ativo?: boolean
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					nome?: string
					categoria?: string | null
					url?: string | null
					custo_mensal?: number
					ciclo?: string
					proxima_renovacao?: string | null
					responsavel_id?: string | null
					ativo?: boolean
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			adm_fornecedores: {
				Row: {
					id: string
					nome: string
					tipo: string
					especialidade: string | null
					email: string | null
					telefone: string | null
					custo_referencia: number | null
					avaliacao: number | null
					ativo: boolean
					observacoes: string | null
					created_at: string
					updated_at: string
					site: string | null
					instagram: string | null
				}
				Insert: {
					id?: string
					nome: string
					tipo?: string
					especialidade?: string | null
					email?: string | null
					telefone?: string | null
					custo_referencia?: number | null
					avaliacao?: number | null
					ativo?: boolean
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					site?: string | null
					instagram?: string | null
				}
				Update: {
					id?: string
					nome?: string
					tipo?: string
					especialidade?: string | null
					email?: string | null
					telefone?: string | null
					custo_referencia?: number | null
					avaliacao?: number | null
					ativo?: boolean
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					site?: string | null
					instagram?: string | null
				}
				Relationships: []
			}
			adm_onboarding_itens: {
				Row: {
					id: string
					cliente_id: string
					texto: string
					concluido: boolean
					ordem: number
					responsavel_id: string | null
					concluido_em: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					texto: string
					concluido?: boolean
					ordem?: number
					responsavel_id?: string | null
					concluido_em?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					texto?: string
					concluido?: boolean
					ordem?: number
					responsavel_id?: string | null
					concluido_em?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			aprovacoes: {
				Row: {
					id: string
					conteudo_id: string
					status: 'pendente' | 'aprovado' | 'alteracao_solicitada'
					comentario_cliente: string | null
					token_publico: string
					data_envio: string
					data_resposta: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					conteudo_id: string
					status?: 'pendente' | 'aprovado' | 'alteracao_solicitada'
					comentario_cliente?: string | null
					token_publico?: string
					data_envio?: string
					data_resposta?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					conteudo_id?: string
					status?: 'pendente' | 'aprovado' | 'alteracao_solicitada'
					comentario_cliente?: string | null
					token_publico?: string
					data_envio?: string
					data_resposta?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			cliente_interacoes: {
				Row: {
					id: string
					cliente_id: string
					colaborador_id: string | null
					tipo: 'reuniao' | 'ligacao' | 'email' | 'whatsapp' | 'nota'
					descricao: string | null
					data: string
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					colaborador_id?: string | null
					tipo?: 'reuniao' | 'ligacao' | 'email' | 'whatsapp' | 'nota'
					descricao?: string | null
					data?: string
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					colaborador_id?: string | null
					tipo?: 'reuniao' | 'ligacao' | 'email' | 'whatsapp' | 'nota'
					descricao?: string | null
					data?: string
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			cliente_vault: {
				Row: {
					id: string
					cliente_id: string
					titulo: string
					categoria: string | null
					url: string | null
					login: string | null
					senha: string | null
					observacoes: string | null
					responsavel_id: string | null
					posicao: number
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					titulo: string
					categoria?: string | null
					url?: string | null
					login?: string | null
					senha?: string | null
					observacoes?: string | null
					responsavel_id?: string | null
					posicao?: number
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					titulo?: string
					categoria?: string | null
					url?: string | null
					login?: string | null
					senha?: string | null
					observacoes?: string | null
					responsavel_id?: string | null
					posicao?: number
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			clientes: {
				Row: {
					id: string
					nome: string
					razao_social: string | null
					cnpj_cpf: string | null
					contato_nome: string | null
					contato_email: string | null
					contato_whatsapp: string | null
					status: 'lead' | 'ativo' | 'pausado' | 'cancelado'
					responsavel_id: string | null
					segmento: string | null
					data_inicio: string | null
					mrr: number | null
					observacoes: string | null
					created_at: string
					updated_at: string
					endereco: string | null
					cidade: string | null
					estado: string | null
					cep: string | null
					dia_vencimento: number | null
					forma_pagamento: string | null
					plano_ref: string | null
					contato_financeiro: string | null
					contato_financeiro_email: string | null
					contato_financeiro_whatsapp: string | null
					contato_operacao: string | null
					contato_operacao_email: string | null
					contato_operacao_whatsapp: string | null
					responsaveis_ids: string[]
					logo_url: string | null
				}
				Insert: {
					id?: string
					nome: string
					razao_social?: string | null
					cnpj_cpf?: string | null
					contato_nome?: string | null
					contato_email?: string | null
					contato_whatsapp?: string | null
					status?: 'lead' | 'ativo' | 'pausado' | 'cancelado'
					responsavel_id?: string | null
					segmento?: string | null
					data_inicio?: string | null
					mrr?: number | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					endereco?: string | null
					cidade?: string | null
					estado?: string | null
					cep?: string | null
					dia_vencimento?: number | null
					forma_pagamento?: string | null
					plano_ref?: string | null
					contato_financeiro?: string | null
					contato_financeiro_email?: string | null
					contato_financeiro_whatsapp?: string | null
					contato_operacao?: string | null
					contato_operacao_email?: string | null
					contato_operacao_whatsapp?: string | null
					responsaveis_ids?: string[]
					logo_url?: string | null
				}
				Update: {
					id?: string
					nome?: string
					razao_social?: string | null
					cnpj_cpf?: string | null
					contato_nome?: string | null
					contato_email?: string | null
					contato_whatsapp?: string | null
					status?: 'lead' | 'ativo' | 'pausado' | 'cancelado'
					responsavel_id?: string | null
					segmento?: string | null
					data_inicio?: string | null
					mrr?: number | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					endereco?: string | null
					cidade?: string | null
					estado?: string | null
					cep?: string | null
					dia_vencimento?: number | null
					forma_pagamento?: string | null
					plano_ref?: string | null
					contato_financeiro?: string | null
					contato_financeiro_email?: string | null
					contato_financeiro_whatsapp?: string | null
					contato_operacao?: string | null
					contato_operacao_email?: string | null
					contato_operacao_whatsapp?: string | null
					responsaveis_ids?: string[]
					logo_url?: string | null
				}
				Relationships: []
			}
			colaboradores: {
				Row: {
					id: string
					auth_user_id: string | null
					nome: string
					email: string
					funcao: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
					custo_hora: number | null
					ativo: boolean
					created_at: string
					updated_at: string
					telefone: string | null
					local: string | null
					avatar_url: string | null
					cor_tema: string | null
					idioma: string
					funcoes: string[]
					super_admin: boolean
				}
				Insert: {
					id?: string
					auth_user_id?: string | null
					nome: string
					email: string
					funcao?: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
					custo_hora?: number | null
					ativo?: boolean
					created_at?: string
					updated_at?: string
					telefone?: string | null
					local?: string | null
					avatar_url?: string | null
					cor_tema?: string | null
					idioma?: string
					funcoes?: string[]
					super_admin?: boolean
				}
				Update: {
					id?: string
					auth_user_id?: string | null
					nome?: string
					email?: string
					funcao?: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
					custo_hora?: number | null
					ativo?: boolean
					created_at?: string
					updated_at?: string
					telefone?: string | null
					local?: string | null
					avatar_url?: string | null
					cor_tema?: string | null
					idioma?: string
					funcoes?: string[]
					super_admin?: boolean
				}
				Relationships: []
			}
			comentarios: {
				Row: {
					id: string
					entidade_tipo: 'projeto' | 'tarefa' | 'conteudo' | 'cliente'
					entidade_id: string
					colaborador_id: string | null
					texto: string
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					entidade_tipo: 'projeto' | 'tarefa' | 'conteudo' | 'cliente'
					entidade_id: string
					colaborador_id?: string | null
					texto: string
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					entidade_tipo?: 'projeto' | 'tarefa' | 'conteudo' | 'cliente'
					entidade_id?: string
					colaborador_id?: string | null
					texto?: string
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			conteudos: {
				Row: {
					id: string
					cliente_id: string
					projeto_id: string | null
					responsavel_id: string | null
					tipo: 'feed' | 'reels' | 'carrossel' | 'story'
					titulo: string | null
					legenda: string | null
					arte_url: string | null
					data_publicacao: string | null
					status: 'rascunho' | 'em_aprovacao' | 'aprovado' | 'programado' | 'publicado' | 'escrever_conteudo' | 'ideia' | 'aguardando_material' | 'pausar_material' | 'editar_video' | 'gravar_video' | 'criar_design' | 'aprovar_roteiro' | 'aprovar_conteudo' | 'programado_parcial' | 'programar' | 'programar_feed' | 'programar_stories' | 'programar_reels'
					publicado_manual: boolean
					created_at: string
					updated_at: string
					redes: string[]
					tipos: string[]
					campanha: string | null
				}
				Insert: {
					id?: string
					cliente_id: string
					projeto_id?: string | null
					responsavel_id?: string | null
					tipo?: 'feed' | 'reels' | 'carrossel' | 'story'
					titulo?: string | null
					legenda?: string | null
					arte_url?: string | null
					data_publicacao?: string | null
					status?: 'rascunho' | 'em_aprovacao' | 'aprovado' | 'programado' | 'publicado' | 'escrever_conteudo' | 'ideia' | 'aguardando_material' | 'pausar_material' | 'editar_video' | 'gravar_video' | 'criar_design' | 'aprovar_roteiro' | 'aprovar_conteudo' | 'programado_parcial' | 'programar' | 'programar_feed' | 'programar_stories' | 'programar_reels'
					publicado_manual?: boolean
					created_at?: string
					updated_at?: string
					redes?: string[]
					tipos?: string[]
					campanha?: string | null
				}
				Update: {
					id?: string
					cliente_id?: string
					projeto_id?: string | null
					responsavel_id?: string | null
					tipo?: 'feed' | 'reels' | 'carrossel' | 'story'
					titulo?: string | null
					legenda?: string | null
					arte_url?: string | null
					data_publicacao?: string | null
					status?: 'rascunho' | 'em_aprovacao' | 'aprovado' | 'programado' | 'publicado' | 'escrever_conteudo' | 'ideia' | 'aguardando_material' | 'pausar_material' | 'editar_video' | 'gravar_video' | 'criar_design' | 'aprovar_roteiro' | 'aprovar_conteudo' | 'programado_parcial' | 'programar' | 'programar_feed' | 'programar_stories' | 'programar_reels'
					publicado_manual?: boolean
					created_at?: string
					updated_at?: string
					redes?: string[]
					tipos?: string[]
					campanha?: string | null
				}
				Relationships: []
			}
			contratos: {
				Row: {
					id: string
					cliente_id: string
					plano_id: string | null
					valor_mensal: number
					data_inicio: string | null
					data_fim: string | null
					status: 'ativo' | 'suspenso' | 'encerrado'
					renovacao_automatica: boolean
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					plano_id?: string | null
					valor_mensal?: number
					data_inicio?: string | null
					data_fim?: string | null
					status?: 'ativo' | 'suspenso' | 'encerrado'
					renovacao_automatica?: boolean
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					plano_id?: string | null
					valor_mensal?: number
					data_inicio?: string | null
					data_fim?: string | null
					status?: 'ativo' | 'suspenso' | 'encerrado'
					renovacao_automatica?: boolean
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			crm_atividades: {
				Row: {
					id: string
					negocio_id: string | null
					contato_id: string | null
					tipo: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'tarefa' | 'nota'
					titulo: string | null
					descricao: string | null
					data_hora: string | null
					concluida: boolean
					concluida_em: string | null
					responsavel_id: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					negocio_id?: string | null
					contato_id?: string | null
					tipo?: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'tarefa' | 'nota'
					titulo?: string | null
					descricao?: string | null
					data_hora?: string | null
					concluida?: boolean
					concluida_em?: string | null
					responsavel_id?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					negocio_id?: string | null
					contato_id?: string | null
					tipo?: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'tarefa' | 'nota'
					titulo?: string | null
					descricao?: string | null
					data_hora?: string | null
					concluida?: boolean
					concluida_em?: string | null
					responsavel_id?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			crm_contatos: {
				Row: {
					id: string
					nome: string
					empresa: string | null
					cargo: string | null
					email: string | null
					telefone: string | null
					whatsapp: string | null
					origem: string | null
					segmento: string | null
					tags: string[]
					responsavel_id: string | null
					cliente_id: string | null
					observacoes: string | null
					created_at: string
					updated_at: string
					instagram: string | null
					site: string | null
				}
				Insert: {
					id?: string
					nome: string
					empresa?: string | null
					cargo?: string | null
					email?: string | null
					telefone?: string | null
					whatsapp?: string | null
					origem?: string | null
					segmento?: string | null
					tags?: string[]
					responsavel_id?: string | null
					cliente_id?: string | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					instagram?: string | null
					site?: string | null
				}
				Update: {
					id?: string
					nome?: string
					empresa?: string | null
					cargo?: string | null
					email?: string | null
					telefone?: string | null
					whatsapp?: string | null
					origem?: string | null
					segmento?: string | null
					tags?: string[]
					responsavel_id?: string | null
					cliente_id?: string | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					instagram?: string | null
					site?: string | null
				}
				Relationships: []
			}
			crm_metas: {
				Row: {
					id: string
					colaborador_id: string
					ano: number
					mes: number
					valor_meta: number
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					colaborador_id: string
					ano: number
					mes: number
					valor_meta?: number
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					colaborador_id?: string
					ano?: number
					mes?: number
					valor_meta?: number
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			crm_negocios: {
				Row: {
					id: string
					titulo: string
					contato_id: string | null
					pipeline_id: string
					stage_id: string | null
					valor: number
					status: 'aberto' | 'ganho' | 'perdido'
					motivo_perda: string | null
					previsao_fechamento: string | null
					responsavel_id: string | null
					ordem: number
					ganho_em: string | null
					perdido_em: string | null
					observacoes: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					titulo: string
					contato_id?: string | null
					pipeline_id: string
					stage_id?: string | null
					valor?: number
					status?: 'aberto' | 'ganho' | 'perdido'
					motivo_perda?: string | null
					previsao_fechamento?: string | null
					responsavel_id?: string | null
					ordem?: number
					ganho_em?: string | null
					perdido_em?: string | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					titulo?: string
					contato_id?: string | null
					pipeline_id?: string
					stage_id?: string | null
					valor?: number
					status?: 'aberto' | 'ganho' | 'perdido'
					motivo_perda?: string | null
					previsao_fechamento?: string | null
					responsavel_id?: string | null
					ordem?: number
					ganho_em?: string | null
					perdido_em?: string | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			crm_pipelines: {
				Row: {
					id: string
					nome: string
					ordem: number
					ativo: boolean
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					nome: string
					ordem?: number
					ativo?: boolean
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					nome?: string
					ordem?: number
					ativo?: boolean
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			crm_stages: {
				Row: {
					id: string
					pipeline_id: string
					nome: string
					ordem: number
					cor: string
					probabilidade: number
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					pipeline_id: string
					nome: string
					ordem?: number
					cor?: string
					probabilidade?: number
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					pipeline_id?: string
					nome?: string
					ordem?: number
					cor?: string
					probabilidade?: number
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			jobs: {
				Row: {
					id: string
					tipo: string
					payload: Json
					status: string
					resultado: Json | null
					erro: string | null
					tentativas: number
					criado_por: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					tipo: string
					payload?: Json
					status?: string
					resultado?: Json | null
					erro?: string | null
					tentativas?: number
					criado_por?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					tipo?: string
					payload?: Json
					status?: string
					resultado?: Json | null
					erro?: string | null
					tentativas?: number
					criado_por?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			kb_artigos: {
				Row: {
					id: string
					titulo: string
					categoria: string | null
					conteudo: string | null
					tags: string[] | null
					cliente_id: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					titulo: string
					categoria?: string | null
					conteudo?: string | null
					tags?: string[] | null
					cliente_id?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					titulo?: string
					categoria?: string | null
					conteudo?: string | null
					tags?: string[] | null
					cliente_id?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			notificacoes: {
				Row: {
					id: string
					colaborador_id: string | null
					tipo: string | null
					mensagem: string
					link: string | null
					lida: boolean
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					colaborador_id?: string | null
					tipo?: string | null
					mensagem: string
					link?: string | null
					lida?: boolean
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					colaborador_id?: string | null
					tipo?: string | null
					mensagem?: string
					link?: string | null
					lida?: boolean
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			organyze_habitos: {
				Row: {
					id: string
					colaborador_id: string | null
					user_id: string | null
					mes: string
					nome: string
					dias: Json
					posicao: number
					criada_em: string
				}
				Insert: {
					id?: string
					colaborador_id?: string | null
					user_id?: string | null
					mes: string
					nome: string
					dias?: Json
					posicao?: number
					criada_em?: string
				}
				Update: {
					id?: string
					colaborador_id?: string | null
					user_id?: string | null
					mes?: string
					nome?: string
					dias?: Json
					posicao?: number
					criada_em?: string
				}
				Relationships: []
			}
			organyze_metas: {
				Row: {
					id: string
					colaborador_id: string | null
					user_id: string | null
					mes: string
					titulo: string
					alvo: number
					atual: number
					unidade: string
					posicao: number
					criada_em: string
				}
				Insert: {
					id?: string
					colaborador_id?: string | null
					user_id?: string | null
					mes: string
					titulo: string
					alvo?: number
					atual?: number
					unidade?: string
					posicao?: number
					criada_em?: string
				}
				Update: {
					id?: string
					colaborador_id?: string | null
					user_id?: string | null
					mes?: string
					titulo?: string
					alvo?: number
					atual?: number
					unidade?: string
					posicao?: number
					criada_em?: string
				}
				Relationships: []
			}
			organyze_tarefas: {
				Row: {
					id: string
					user_id: string | null
					titulo: string
					concluida: boolean
					data: string
					posicao: number
					criada_em: string
					colaborador_id: string | null
					prioridade: string
					prazo: string | null
					status: string
					descricao: string
					subtarefas: Json
					responsaveis: string[]
					deleted_at: string | null
					categoria: string
				}
				Insert: {
					id?: string
					user_id?: string | null
					titulo: string
					concluida?: boolean
					data?: string
					posicao?: number
					criada_em?: string
					colaborador_id?: string | null
					prioridade?: string
					prazo?: string | null
					status?: string
					descricao?: string
					subtarefas?: Json
					responsaveis?: string[]
					deleted_at?: string | null
					categoria?: string
				}
				Update: {
					id?: string
					user_id?: string | null
					titulo?: string
					concluida?: boolean
					data?: string
					posicao?: number
					criada_em?: string
					colaborador_id?: string | null
					prioridade?: string
					prazo?: string | null
					status?: string
					descricao?: string
					subtarefas?: Json
					responsaveis?: string[]
					deleted_at?: string | null
					categoria?: string
				}
				Relationships: []
			}
			pagsup_clientes: {
				Row: {
					id: string
					nome: string
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					nome: string
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					nome?: string
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			pagsup_cronograma: {
				Row: {
					id: string
					cliente_id: string
					prestador_id: string
					data: string | null
					valor: number | null
					observacoes: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					prestador_id: string
					data?: string | null
					valor?: number | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					prestador_id?: string
					data?: string | null
					valor?: number | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			pagsup_negociacoes: {
				Row: {
					id: string
					cliente_id: string
					empresa: string
					servico: string | null
					fornecedor: string | null
					valor_contrato: number
					pix: string | null
					regiao: string | null
					ddv: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					empresa: string
					servico?: string | null
					fornecedor?: string | null
					valor_contrato?: number
					pix?: string | null
					regiao?: string | null
					ddv?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					empresa?: string
					servico?: string | null
					fornecedor?: string | null
					valor_contrato?: number
					pix?: string | null
					regiao?: string | null
					ddv?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			pagsup_negociacoes_agendadas: {
				Row: {
					id: string
					cliente_id: string
					negociacao_id: string
					data: string | null
					valor: number | null
					observacoes: string | null
					created_at: string
					updated_at: string
					mes_fechado: string | null
				}
				Insert: {
					id?: string
					cliente_id: string
					negociacao_id: string
					data?: string | null
					valor?: number | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					mes_fechado?: string | null
				}
				Update: {
					id?: string
					cliente_id?: string
					negociacao_id?: string
					data?: string | null
					valor?: number | null
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					mes_fechado?: string | null
				}
				Relationships: []
			}
			pagsup_pagamentos: {
				Row: {
					id: string
					cliente_id: string
					prestador_id: string | null
					prestador_nome: string
					servico: string
					regiao: string | null
					valor: number
					data_pagamento: string
					observacoes: string | null
					created_at: string
					updated_at: string
					lj: string | null
				}
				Insert: {
					id?: string
					cliente_id: string
					prestador_id?: string | null
					prestador_nome: string
					servico: string
					regiao?: string | null
					valor?: number
					data_pagamento: string
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					lj?: string | null
				}
				Update: {
					id?: string
					cliente_id?: string
					prestador_id?: string | null
					prestador_nome?: string
					servico?: string
					regiao?: string | null
					valor?: number
					data_pagamento?: string
					observacoes?: string | null
					created_at?: string
					updated_at?: string
					lj?: string | null
				}
				Relationships: []
			}
			pagsup_prestadores: {
				Row: {
					id: string
					cliente_id: string
					nome: string
					servico: string
					regiao: string | null
					valor_padrao: number
					cpf: string | null
					pix: string | null
					created_at: string
					updated_at: string
					lj: string | null
					whatsapp: string | null
					especialidade: string | null
				}
				Insert: {
					id?: string
					cliente_id: string
					nome: string
					servico: string
					regiao?: string | null
					valor_padrao?: number
					cpf?: string | null
					pix?: string | null
					created_at?: string
					updated_at?: string
					lj?: string | null
					whatsapp?: string | null
					especialidade?: string | null
				}
				Update: {
					id?: string
					cliente_id?: string
					nome?: string
					servico?: string
					regiao?: string | null
					valor_padrao?: number
					cpf?: string | null
					pix?: string | null
					created_at?: string
					updated_at?: string
					lj?: string | null
					whatsapp?: string | null
					especialidade?: string | null
				}
				Relationships: []
			}
			permissoes_cargo: {
				Row: {
					funcao: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
					modulo: string
					nivel: 'nenhum' | 'ver' | 'editar' | 'excluir'
				}
				Insert: {
					funcao: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
					modulo: string
					nivel?: 'nenhum' | 'ver' | 'editar' | 'excluir'
				}
				Update: {
					funcao?: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
					modulo?: string
					nivel?: 'nenhum' | 'ver' | 'editar' | 'excluir'
				}
				Relationships: []
			}
			permissoes_colaborador: {
				Row: {
					colaborador_id: string
					modulo: string
					nivel: 'nenhum' | 'ver' | 'editar' | 'excluir'
				}
				Insert: {
					colaborador_id: string
					modulo: string
					nivel: 'nenhum' | 'ver' | 'editar' | 'excluir'
				}
				Update: {
					colaborador_id?: string
					modulo?: string
					nivel?: 'nenhum' | 'ver' | 'editar' | 'excluir'
				}
				Relationships: []
			}
			planos: {
				Row: {
					id: string
					nome: string
					descricao: string | null
					valor_mensal: number
					limite_posts: number | null
					limite_stories: number | null
					limite_reels: number | null
					escopo: Json | null
					ativo: boolean
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					nome: string
					descricao?: string | null
					valor_mensal?: number
					limite_posts?: number | null
					limite_stories?: number | null
					limite_reels?: number | null
					escopo?: Json | null
					ativo?: boolean
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					nome?: string
					descricao?: string | null
					valor_mensal?: number
					limite_posts?: number | null
					limite_stories?: number | null
					limite_reels?: number | null
					escopo?: Json | null
					ativo?: boolean
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			processos: {
				Row: {
					id: string
					numero: string | null
					nome: string
					secretaria: string | null
					responsavel: string | null
					prazo: string | null
					situacao: string
					etapas: Json
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					numero?: string | null
					nome: string
					secretaria?: string | null
					responsavel?: string | null
					prazo?: string | null
					situacao?: string
					etapas?: Json
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					numero?: string | null
					nome?: string
					secretaria?: string | null
					responsavel?: string | null
					prazo?: string | null
					situacao?: string
					etapas?: Json
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			projeto_templates: {
				Row: {
					id: string
					nome: string
					tipo: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
					checklist: Json | null
					tarefas_padrao: Json | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					nome: string
					tipo?: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
					checklist?: Json | null
					tarefas_padrao?: Json | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					nome?: string
					tipo?: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
					checklist?: Json | null
					tarefas_padrao?: Json | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			projetos: {
				Row: {
					id: string
					cliente_id: string
					responsavel_id: string | null
					template_id: string | null
					nome: string
					descricao: string | null
					tipo: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
					status: 'em_andamento' | 'aguardando_cliente' | 'em_aprovacao' | 'finalizado'
					recorrente: boolean
					valor: number | null
					data_inicio: string | null
					prazo: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					cliente_id: string
					responsavel_id?: string | null
					template_id?: string | null
					nome: string
					descricao?: string | null
					tipo?: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
					status?: 'em_andamento' | 'aguardando_cliente' | 'em_aprovacao' | 'finalizado'
					recorrente?: boolean
					valor?: number | null
					data_inicio?: string | null
					prazo?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					cliente_id?: string
					responsavel_id?: string | null
					template_id?: string | null
					nome?: string
					descricao?: string | null
					tipo?: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
					status?: 'em_andamento' | 'aguardando_cliente' | 'em_aprovacao' | 'finalizado'
					recorrente?: boolean
					valor?: number | null
					data_inicio?: string | null
					prazo?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			rotina_conclusoes: {
				Row: {
					id: string
					item_id: string
					colaborador_id: string
					data: string
					created_at: string
				}
				Insert: {
					id?: string
					item_id: string
					colaborador_id: string
					data: string
					created_at?: string
				}
				Update: {
					id?: string
					item_id?: string
					colaborador_id?: string
					data?: string
					created_at?: string
				}
				Relationships: []
			}
			rotina_itens: {
				Row: {
					id: string
					cargo: string
					dia_semana: number
					titulo: string
					ordem: number
					created_at: string
				}
				Insert: {
					id?: string
					cargo?: string
					dia_semana: number
					titulo: string
					ordem?: number
					created_at?: string
				}
				Update: {
					id?: string
					cargo?: string
					dia_semana?: number
					titulo?: string
					ordem?: number
					created_at?: string
				}
				Relationships: []
			}
			sos_chamados: {
				Row: {
					id: string
					titulo: string
					descricao: string | null
					autor_nome: string | null
					autor_email: string | null
					rota: string | null
					status: string
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					titulo: string
					descricao?: string | null
					autor_nome?: string | null
					autor_email?: string | null
					rota?: string | null
					status?: string
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					titulo?: string
					descricao?: string | null
					autor_nome?: string | null
					autor_email?: string | null
					rota?: string | null
					status?: string
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			transacoes: {
				Row: {
					id: string
					tipo: 'receita' | 'despesa'
					categoria: string | null
					descricao: string | null
					valor: number
					cliente_id: string | null
					contrato_id: string | null
					recorrente: boolean
					data_competencia: string
					data_pagamento: string | null
					status: 'previsto' | 'pago' | 'atrasado'
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					tipo: 'receita' | 'despesa'
					categoria?: string | null
					descricao?: string | null
					valor?: number
					cliente_id?: string | null
					contrato_id?: string | null
					recorrente?: boolean
					data_competencia?: string
					data_pagamento?: string | null
					status?: 'previsto' | 'pago' | 'atrasado'
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					tipo?: 'receita' | 'despesa'
					categoria?: string | null
					descricao?: string | null
					valor?: number
					cliente_id?: string | null
					contrato_id?: string | null
					recorrente?: boolean
					data_competencia?: string
					data_pagamento?: string | null
					status?: 'previsto' | 'pago' | 'atrasado'
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
		}
		Views: {
			v_financeiro_totais: {
				Row: {
					receitas: number | null
					despesas: number | null
				}
				Insert: {
					receitas?: number | null
					despesas?: number | null
				}
				Update: {
					receitas?: number | null
					despesas?: number | null
				}
				Relationships: []
			}
			v_lucro_cliente: {
				Row: {
					cliente_id: string | null
					nome: string | null
					receitas: number | null
					despesas: number | null
					lucro: number | null
				}
				Insert: {
					cliente_id?: string | null
					nome?: string | null
					receitas?: number | null
					despesas?: number | null
					lucro?: number | null
				}
				Update: {
					cliente_id?: string | null
					nome?: string | null
					receitas?: number | null
					despesas?: number | null
					lucro?: number | null
				}
				Relationships: []
			}
		}
		Functions: {
			[nome: string]: { Args: Record<string, unknown>; Returns: unknown }
		}
		Enums: {
			aprovacao_status: 'pendente' | 'aprovado' | 'alteracao_solicitada'
			cliente_status: 'lead' | 'ativo' | 'pausado' | 'cancelado'
			colaborador_funcao: 'admin' | 'gestor' | 'social_media' | 'designer' | 'trafego' | 'ceo' | 'comercial' | 'digital_creator' | 'growth_manager' | 'financeiro' | 'videomaker'
			comentario_entidade: 'projeto' | 'tarefa' | 'conteudo' | 'cliente'
			conteudo_status: 'rascunho' | 'em_aprovacao' | 'aprovado' | 'programado' | 'publicado' | 'escrever_conteudo' | 'ideia' | 'aguardando_material' | 'pausar_material' | 'editar_video' | 'gravar_video' | 'criar_design' | 'aprovar_roteiro' | 'aprovar_conteudo' | 'programado_parcial' | 'programar' | 'programar_feed' | 'programar_stories' | 'programar_reels'
			conteudo_tipo: 'feed' | 'reels' | 'carrossel' | 'story'
			contrato_status: 'ativo' | 'suspenso' | 'encerrado'
			crm_atividade_tipo: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'tarefa' | 'nota'
			crm_negocio_status: 'aberto' | 'ganho' | 'perdido'
			interacao_tipo: 'reuniao' | 'ligacao' | 'email' | 'whatsapp' | 'nota'
			perm_nivel: 'nenhum' | 'ver' | 'editar' | 'excluir'
			projeto_status: 'em_andamento' | 'aguardando_cliente' | 'em_aprovacao' | 'finalizado'
			projeto_tipo: 'social_media' | 'design' | 'trafego' | 'impresso' | 'site' | 'outro'
			transacao_status: 'previsto' | 'pago' | 'atrasado'
			transacao_tipo: 'receita' | 'despesa'
		}
		CompositeTypes: Record<string, never>
	}
}

/** Atalho: linha de uma tabela. Ex.: Row<'clientes'> */
export type Row<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];
/** Atalho: payload de insert. Ex.: Insert<'cliente_vault'> */
export type Insert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert'];
/** Atalho: payload de update. */
export type Update<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update'];
