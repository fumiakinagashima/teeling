/**
 * Seed script for AI judgment / metrics precision testing.
 * Creates approval requests covering all dataQuality tiers (high/medium/low)
 * and the "insufficient" case, so you can verify the AI's extraction accuracy.
 *
 * Usage:
 *   bun run db:seed:demo
 *
 * Requires wrangler dev to have been run at least once (creates local D1 SQLite).
 */

import { createClient } from '@libsql/client';
import { readdirSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const d1Dir = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const sqliteFile = readdirSync(d1Dir).find(
	(f) => f.endsWith('.sqlite') && !f.includes('metadata')
);
if (!sqliteFile) {
	console.error('Local D1 SQLite file not found. Run `wrangler dev` first.');
	process.exit(1);
}

const db = createClient({ url: `file:${resolve(d1Dir, sqliteFile)}` });

// Use the admin account ID from the seeded DB
const ADMIN_ID = '7be7f4d2-ca94-453e-807c-3bf0b3aa4202';
const GENERAL_ID = 'ac576c3a-dee8-4ea0-9257-935c6ce76c3d';

type ApprovalSeed = {
	title: string;
	type: string;
	status: 'pending' | 'approved' | 'rejected' | 'draft';
	submittedBy: string;
	content: string;
	route: { step: number; approver: string; role?: string; email?: string }[];
	/** Expected AI metrics dataQuality — for human reference only */
	_expectedQuality: 'high' | 'medium' | 'low' | 'insufficient';
};

const seeds: ApprovalSeed[] = [
	// ─── HIGH data quality ────────────────────────────────────────────────────
	{
		title: 'Salesforce Sales Cloud 導入申請',
		type: '情報システム申請',
		status: 'pending',
		submittedBy: ADMIN_ID,
		_expectedQuality: 'high',
		content: `## 申請概要
営業部門の案件管理・商談進捗をSalesforce Sales Cloudに統合し、属人化を排除するため導入を申請します。

## 費用
- ライセンス費: 月額 ¥6,000/ユーザー × 20名 = ¥120,000/月（年間 ¥1,440,000）
- 初期導入・設定費（外部ベンダー）: ¥800,000（一括）
- 初年度合計: ¥2,240,000

## 期待効果
- 営業担当1名あたりの案件追跡工数が週4時間 → 週1時間に削減（週3時間 × 20名 = 週60時間削減）
- 平均時給 ¥3,500 換算で年間節約額: 3,500 × 60 × 52 = ¥10,920,000
- 商談可視化による成約率改善: 現在の成約率12% → 15%（3%改善）を目標
  - 月間商談数150件 × 3% = 4.5件増、1件平均売上 ¥450,000 × 4.5 = ¥2,025,000/月
  - 年間売上貢献: ¥24,300,000

## ROI概算
- 1年目効果: ¥10,920,000（工数削減）＋ ¥24,300,000（売上増）= ¥35,220,000
- 1年目コスト: ¥2,240,000
- ROI: (¥35,220,000 − ¥2,240,000) ÷ ¥2,240,000 ≈ 1,472%
- 回収期間: ¥2,240,000 ÷ ¥2,935,000/月 ≈ 0.8ヶ月（約24日）

## リスク
- 定着率が低い場合、成約率改善効果が出ない可能性あり（導入トレーニング費用 ¥200,000 追加を検討）`,
		route: [
			{ step: 1, approver: '営業部長', role: '部長', email: 'sales-mgr@example.com' },
			{ step: 2, approver: '経営企画室', role: 'マネージャー' },
			{ step: 3, approver: '代表取締役', role: 'CEO' }
		]
	},
	{
		title: '物流倉庫作業の外部委託切り替え申請',
		type: '調達・外注申請',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'high',
		content: `## 背景
現在、倉庫ピッキング・梱包作業を正社員5名（残業込み）で対応している。繁忙期の残業コストが高く、オフシーズンの稼働率は60%以下。外部委託へ切り替えることで固定費を変動費化し、コスト最適化を図る。

## 現状コスト
- 正社員人件費（給与・社会保険・退職積立含む）: 5名 × ¥4,800,000/人・年 = ¥24,000,000/年
- 残業費（繁忙期3ヶ月）: 平均 ¥280,000/月 × 3ヶ月 × 5名 = ¥4,200,000/年
- 現状合計: ¥28,200,000/年

## 委託後コスト見積もり
- 基本委託料: ¥1,600,000/月（年間 ¥19,200,000）
- 繁忙期アップチャージ（3ヶ月）: ¥400,000/月 × 3 = ¥1,200,000
- 委託後合計: ¥20,400,000/年

## コスト削減効果
- 年間削減額: ¥28,200,000 − ¥20,400,000 = ¥7,800,000
- 削減率: 27.7%
- 初期切り替えコスト（引き継ぎ期間の並行運用2ヶ月）: ¥3,200,000
- 回収期間: ¥3,200,000 ÷ ¥650,000/月 ≈ 5ヶ月`,
		route: [
			{ step: 1, approver: '物流部長', role: 'GM' },
			{ step: 2, approver: '財務部長', role: 'CFO' }
		]
	},

	// ─── MEDIUM data quality ──────────────────────────────────────────────────
	{
		title: '東京-大阪 出張申請（商談）',
		type: '出張申請',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'medium',
		content: `## 出張目的
株式会社テックパートナーとの商談（新規サービス拡販）。先方がオフラインでの打ち合わせを希望。

## 日程
2026年7月10日（木）〜 11日（金）1泊2日

## 費用内訳
| 項目 | 金額 |
|------|------|
| 新幹線（往復） | ¥28,360 |
| 宿泊費（1泊）| ¥12,000 |
| 交通費（市内移動）| ¥2,000 |
| 合計 | ¥42,360 |

## 商談内容
テックパートナー社は年商約50億円の製造業向けSaaSベンダー。当社製品の代理販売パートナー契約を検討中。契約に至れば継続的な収益貢献が見込まれる。
（契約規模・成約確率は交渉中のため現時点では非公開）`,
		route: [{ step: 1, approver: '営業マネージャー', role: 'マネージャー' }]
	},
	{
		title: '開発チーム用高性能ノートPC購入申請',
		type: '備品購入申請',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'medium',
		content: `## 申請内容
開発エンジニア3名の既存PCが4年以上経過し、ビルド時間・テスト実行時間が長くなっており生産性に影響が出ている。最新スペックのノートPCへ更新を申請する。

## 機種・費用
- Apple MacBook Pro 14インチ（M4 Pro、32GBメモリ、512GB SSD）
- 単価: ¥258,000（税込）
- 台数: 3台
- 合計: ¥774,000

## 期待効果
- ビルド時間が現状の平均8分 → 推定2分に短縮（75%削減見込み）
- 1日あたりビルド回数: 平均12回/人
- 短縮時間: 6分/回 × 12回 × 3名 = 216分/日 ≈ 3.6時間/日

（時給換算は人事規定のため非公開）`,
		route: [
			{ step: 1, approver: '開発部長', role: '部長' },
			{ step: 2, approver: '総務部', role: '経理担当' }
		]
	},

	// ─── LOW data quality ─────────────────────────────────────────────────────
	{
		title: '採用広報SNS強化施策申請',
		type: 'マーケティング申請',
		status: 'pending',
		submittedBy: ADMIN_ID,
		_expectedQuality: 'low',
		content: `## 背景
エンジニア採用において候補者の認知度が低く、採用コストが高い状況が続いている。採用広報としてSNS（X / LinkedIn）の情報発信を強化し、採用ブランドを向上させたい。

## 施策内容
- 週2〜3回のテック系コンテンツ投稿（エンジニアブログとの連動）
- 採用担当がX・LinkedInのアカウントを運用
- 必要であれば外部ライターへの記事制作委託を検討

## 目標
- フォロワー数を半年で現状比2倍
- 自社への応募数増加
- 採用単価の低減

## 予算・費用
現時点では詳細未定。外部ライター利用の場合は月数万円程度を想定しているが、まず社内リソースで試してみる方針。`,
		route: [
			{ step: 1, approver: '人事部長', role: 'CHRO' },
			{ step: 2, approver: '代表取締役', role: 'CEO' }
		]
	},
	{
		title: 'コーポレートサイトリニューアル検討',
		type: 'マーケティング申請',
		status: 'draft',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'low',
		content: `コーポレートサイトが古くなってきた。デザインをリニューアルして採用・営業面での印象を上げたい。

費用感やスケジュールはまだ見積もり依頼中。詳細が固まったら正式申請する予定。`,
		route: [{ step: 1, approver: '代表取締役', role: 'CEO' }]
	},

	// ─── INSUFFICIENT ─────────────────────────────────────────────────────────
	{
		title: '新規プロジェクト申請',
		type: '申請',
		status: 'draft',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'insufficient',
		content: `検討中。後で記入する。`,
		route: [{ step: 1, approver: '部長' }]
	},
	{
		title: 'ツール導入の件',
		type: '申請',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'insufficient',
		content: `新しいツールを使いたい。承認よろしくお願いします。`,
		route: [{ step: 1, approver: '管理者太郎', role: '管理者' }]
	}
];

async function seed() {
	console.log('Seeding approval requests for AI metrics precision testing...\n');

	// Remove existing seed data (identified by a specific type prefix to avoid clobbering real data)
	// We'll just insert — duplicate runs create new IDs, which is fine for testing.

	for (const s of seeds) {
		const id = randomUUID();
		const now = Math.floor(Date.now() / 1000);
		const route = s.route.map((r, i) => ({
			...r,
			status: 'pending' as const,
			comment: null,
			actionAt: null,
			actionByAccountId: null
		}));
		const data = JSON.stringify({ content: s.content });

		await db.execute({
			sql: `INSERT INTO approval_requests (id, title, type, status, submitted_by, data, route, attachments, created_at, updated_at)
			      VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
			args: [id, s.title, s.type, s.status, s.submittedBy, data, JSON.stringify(route), now, now]
		});

		console.log(
			`✓ [${s._expectedQuality.padEnd(12)}] ${s.title}`
		);
	}

	console.log(`\nDone! ${seeds.length} approval requests created.`);
	console.log(
		'\nExpected AI judgment results:',
		'\n  high (×2)         → keyFigures populated, ROI + paybackPeriod calculated',
		'\n  medium (×2)       → some keyFigures, ROI/payback null (missing one side)',
		'\n  low (×2)          → keyFigures empty or minimal, dataQuality: "low"',
		'\n  insufficient (×2) → status: "insufficient"'
	);

	await db.close();
}

seed().catch((e) => {
	console.error(e);
	process.exit(1);
});
