// Gera src/lib/database.types.ts a partir do schema real do banco.
//
// Por que não o CLI do Supabase: `supabase gen types` passou a exigir Docker
// para ler por --db-url, e a alternativa (--project-id) pede um token de acesso
// da conta. Aqui basta a senha do Postgres, que é a mesma já usada para aplicar
// migrations.
//
//   PGPASSWORD='<senha-postgres>' node scripts/gen-types.mjs
//
// O arquivo gerado é versionado: assim o time enxerga no diff quando uma coluna
// muda, mesmo sem rodar o script.
import { writeFileSync } from 'node:fs';
import pg from 'pg';

const HOST = 'db.rboenllphxqecjroolzo.supabase.co';
const SAIDA = 'src/lib/database.types.ts';

/** Tipo do Postgres → tipo do TypeScript. */
function tsDe(tipo, udt) {
	if (tipo === 'ARRAY') return `${tsDe(null, udt.replace(/^_/, ''))}[]`;
	switch (udt) {
		case 'bool':
			return 'boolean';
		case 'int2':
		case 'int4':
		case 'int8':
		case 'float4':
		case 'float8':
		case 'numeric':
			return 'number';
		case 'json':
		case 'jsonb':
			return 'Json';
		default:
			return 'string'; // text, varchar, uuid, date, timestamptz, enums…
	}
}

const client = new pg.Client({
	host: HOST,
	port: 5432,
	user: 'postgres',
	password: process.env.PGPASSWORD,
	database: 'postgres',
	ssl: { rejectUnauthorized: false },
	connectionTimeoutMillis: 20000
});

await client.connect();

const { rows: colunas } = await client.query(`
	select c.table_name, c.column_name, c.is_nullable, c.data_type, c.udt_name,
	       c.column_default, t.table_type
	from information_schema.columns c
	join information_schema.tables t
	  on t.table_schema = c.table_schema and t.table_name = c.table_name
	where c.table_schema = 'public'
	order by c.table_name, c.ordinal_position
`);

const { rows: enums } = await client.query(`
	select t.typname, array_agg(e.enumlabel::text order by e.enumsortorder) as valores
	from pg_type t
	join pg_enum e on e.enumtypid = t.oid
	join pg_namespace n on n.oid = t.typnamespace
	where n.nspname = 'public'
	group by t.typname
	order by t.typname
`);

await client.end();

const enumPorNome = new Map(enums.map((e) => [e.typname, e.valores]));

/** Enum vira união de literais; o resto usa o mapa acima. */
function tipoDaColuna(col) {
	if (col.data_type === 'ARRAY') {
		const base = col.udt_name.replace(/^_/, '');
		const vals = enumPorNome.get(base);
		return vals ? `(${vals.map((v) => `'${v}'`).join(' | ')})[]` : tsDe('ARRAY', col.udt_name);
	}
	const vals = enumPorNome.get(col.udt_name);
	if (vals) return vals.map((v) => `'${v}'`).join(' | ');
	return tsDe(col.data_type, col.udt_name);
}

const porTabela = new Map();
for (const col of colunas) {
	if (!porTabela.has(col.table_name))
		porTabela.set(col.table_name, { tipo: col.table_type, cols: [] });
	porTabela.get(col.table_name).cols.push(col);
}

const tabelas = [];
const views = [];
for (const [nome, { tipo, cols }] of [...porTabela].sort((a, b) => a[0].localeCompare(b[0]))) {
	const row = cols
		.map((c) => `\t\t\t\t\t${c.column_name}: ${tipoDaColuna(c)}${c.is_nullable === 'YES' ? ' | null' : ''}`)
		.join('\n');
	// Insert: colunas com default (ou anuláveis) são opcionais.
	const insert = cols
		.map((c) => {
			const opcional = c.is_nullable === 'YES' || c.column_default !== null;
			return `\t\t\t\t\t${c.column_name}${opcional ? '?' : ''}: ${tipoDaColuna(c)}${c.is_nullable === 'YES' ? ' | null' : ''}`;
		})
		.join('\n');
	const update = cols
		.map((c) => `\t\t\t\t\t${c.column_name}?: ${tipoDaColuna(c)}${c.is_nullable === 'YES' ? ' | null' : ''}`)
		.join('\n');

	const bloco =
		`\t\t\t${nome}: {\n` +
		`\t\t\t\tRow: {\n${row}\n\t\t\t\t}\n` +
		`\t\t\t\tInsert: {\n${insert}\n\t\t\t\t}\n` +
		`\t\t\t\tUpdate: {\n${update}\n\t\t\t\t}\n` +
		// Sem Relationships o cliente reduz os parâmetros de update/insert a `never`.
		`\t\t\t\tRelationships: []\n` +
		`\t\t\t}`;
	(tipo === 'VIEW' ? views : tabelas).push(bloco);
}

const blocoEnums = enums
	.map((e) => `\t\t\t${e.typname}: ${e.valores.map((v) => `'${v}'`).join(' | ')}`)
	.join('\n');

const conteudo = `// GERADO AUTOMATICAMENTE — não edite à mão.
// Regenerar:  PGPASSWORD='<senha-postgres>' node scripts/gen-types.mjs
//
// Reflete o schema public do Supabase (${new Date().toISOString().slice(0, 10)}).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
${tabelas.join('\n')}
		}
		Views: {
${views.join('\n')}
		}
		Functions: {
			[nome: string]: { Args: Record<string, unknown>; Returns: unknown }
		}
		Enums: {
${blocoEnums}
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
`;

writeFileSync(SAIDA, conteudo);
console.log(
	`${SAIDA} gerado — ${tabelas.length} tabelas, ${views.length} views, ${enums.length} enums.`
);
