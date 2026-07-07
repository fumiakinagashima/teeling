import { createHash, createHmac } from 'crypto';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { Config } from 'drizzle-kit';

// wrangler.toml の [[env.local.d1_databases]] と同じ database_id。値を変えたら合わせて更新すること。
const LOCAL_DATABASE_ID = '';

// miniflare が database_id からローカルsqliteファイル名を導出するのと同じロジック
// (node_modules/miniflare/dist/src/index.js の durableObjectNamespaceIdFromName)。
// ディレクトリ内の最初の.sqliteファイルを拾う方式だと、過去のwrangler.toml変更で
// 残った別IDのsqliteファイルと混在した際にどちらが選ばれるか不定になるため、
// 使用中のdatabase_idから決定的にファイル名を求める。
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
