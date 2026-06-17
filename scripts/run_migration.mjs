import { readFileSync } from 'node:fs';
import pg from 'pg';

const sql = readFileSync(process.argv[2], 'utf8');

const client = new pg.Client({
	host: 'db.rboenllphxqecjroolzo.supabase.co',
	port: 5432,
	user: 'postgres',
	password: process.env.PGPASSWORD,
	database: 'postgres',
	ssl: { rejectUnauthorized: false },
	connectionTimeoutMillis: 15000
});

try {
	await client.connect();
	console.log('CONNECTED');
	await client.query(sql);
	console.log('MIGRATION_OK');
} catch (e) {
	console.error('ERROR:', e.message);
	process.exitCode = 1;
} finally {
	await client.end().catch(() => {});
}
