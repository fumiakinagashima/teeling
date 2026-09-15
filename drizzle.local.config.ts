import { createHash, createHmac } from 'crypto';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { Config } from 'drizzle-kit';

// Must match the database_id in wrangler.toml's [[env.local.d1_databases]]. Keep them in sync.
const LOCAL_DATABASE_ID = '';

// Same logic miniflare uses to derive the local sqlite filename from database_id
// (see durableObjectNamespaceIdFromName in node_modules/miniflare/dist/src/index.js).
// Picking "the first .sqlite file in the directory" would be ambiguous once a prior
// wrangler.toml change leaves behind a stale file under a different ID, so instead
// we deterministically derive the filename from the database_id currently in use.
function durableObjectNamespaceIdFromName(uniqueKey: string, name: string) {
	const key = createHash('sha256').update(uniqueKey).digest();
	const nameHmac = createHmac('sha256', key).update(name).digest().subarray(0, 16);
	const hmac = createHmac('sha256', key).update(nameHmac).digest().subarray(0, 16);
	return Buffer.concat([nameHmac, hmac]).toString('hex');
}

const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const sqliteFile = resolve(
	d1Dir,
	`${durableObjectNamespaceIdFromName('miniflare-D1DatabaseObject', LOCAL_DATABASE_ID)}.sqlite`
);
if (!existsSync(sqliteFile)) {
	throw new Error(`Local D1 SQLite file not found at ${sqliteFile}. Run \`bun dev\` first.`);
}

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: `file:${sqliteFile}`
	}
} satisfies Config;
