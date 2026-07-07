# Teeling

AIネイティブな申請管理・承認ワークフローシステム。
ユーザーはAIに相談しながら申請書を作成し、AIが内容をレビュー・判断材料（ROI・回収期間等）を自動生成することで承認サイクルを短縮する。

## 主な機能

- **申請一覧・ダッシュボード**（`/`）— ステータス別フィルタ（承認待ち/作成中/全件）と「自分が担当」トグルで申請を一覧
- **申請作成AI**（`/approvals/new`、編集は`/approvals/[id]/edit`）— フォーム横のAIアシスタントに相談しながら申請書を作成。AIがタイトル・申請内容をフォームへ直接入力することも可能
- **AI分析**（申請詳細） — 申請内容のレビュー・効果分析（ROI/回収期間）・シミュレーションを1ボタンで実行。財務判断に不要な申請は申請レビューのみ表示
- **申請テンプレート**（`/database/templates`）— テンプレートごとにカスタムフィールド（テキスト/数値/日付/時間）とデフォルト承認ルートを定義（管理者のみ）。作成・編集画面もAIアシスタント付き
- **承認ワークフロー** — ステップ順に承認・否決・差し戻しが可能。差し戻しは現在の担当承認者のみ実行可
- **メール通知** — 自分の番になったとき（承認依頼）、申請が完了/否決/差し戻しされたとき（結果通知）を自動送信
- **リマインダー** — Cron Triggerによる自動配信（通知センター／メール／Slack）。管理UIはなく、AIに依頼して作成する運用
- **設定**（`/settings`）— 外部API連携（Slack Webhook）、メール送信設定、プロフィール・パスワード変更
- **認証・権限** — 全ルートガード、`general`/`admin` 権限によるアクセス制御

## 技術スタック

| 分類 | 技術 |
|------|------|
| パッケージマネージャー | Bun |
| フロントエンド | SvelteKit, TypeScript |
| バリデーション | Zod |
| ORM | DrizzleORM |
| インフラ | Cloudflare (Wrangler, D1, R2, KV) |
| AI | Claude API (Anthropic) |
| プロトコル | MCP (Model Context Protocol) |
| テスト | Vitest（ユニット） |

## 開発環境のセットアップ

### 必要なもの

- [Bun](https://bun.sh/) v1.x 以上
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

### 1. インストール

```sh
bun install
```

### 2. 環境変数の設定

`.dev.vars.example` をコピーして `.dev.vars` を作成し、必要な値を入力する:

```sh
cp .dev.vars.example .dev.vars
```

最低限必要な設定:

```sh
ANTHROPIC_API_KEY="sk-ant-..."  # Anthropic API キー
MOCK_AI="false"                 # true にするとAPI不要でモックレスポンスで動作確認できる
```

メール通知を使う場合は `EMAIL_PROVIDER` と対応するキーも設定する（`resend` / `ses` / `smtp`）。

### 3. データベースのマイグレーション

```sh
bunx wrangler d1 migrations apply teeling --local --env local
```

`--env local` はローカル専用のD1/KV（`wrangler.toml`の`[env.local]`）を指定するためのもの。`bun dev`（vite dev）もこの`env.local`のバインディングを見る（`svelte.config.js`の`platformProxy.environment`参照）。

マイグレーションでは**アカウントは作成されない**ので、最初に1件手動で作成する。パスワードハッシュ（PBKDF2-SHA256）を生成:

```sh
bun -e '
import("./src/lib/server/auth/password.ts").then(async (m) => {
  console.log(await m.hashPassword("password"));
});
'
```

出力されたハッシュ文字列を使って、`bun run db:studio`（Drizzle Studio）またはローカルD1のsqliteファイルに直接、`accounts`テーブルへ1行追加する（`id`はUUID、`permission`は`admin`）。2件目以降は管理画面（`/database/accounts`）から作成できる。

### 4. 開発サーバーの起動

```sh
bun dev
```

ブラウザで `http://localhost:5173` を開き、`/signin` から手順3で作成したアカウントでログインする。

> **メール送信（SMTP）の注意**: `bun dev`（Node.js上のVite）では Cloudflare Sockets が使えないため SMTP は動作しない。ローカルでメール送信を確認する場合は Resend または AWS SES を使用すること。

### その他のコマンド

```sh
bun run check          # 型チェック（svelte-check）
bun run test:unit      # ユニットテスト（Vitest）
bun run db:studio      # Drizzle Studio でローカルDBを確認
bun run db:seed:demo   # AI分析精度テスト用のデモデータ投入
```

## デプロイ

```sh
bun run build
bunx wrangler d1 migrations apply teeling --remote  # スキーマ変更がある場合
bunx wrangler deploy
```

## ディレクトリ構成

```
teeling/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte       # テーマ切り替え・通知ポーリング
│   │   ├── +page.svelte         # 申請一覧・ダッシュボード（/）
│   │   ├── signin/              # ログイン・パスワードリセット
│   │   ├── approvals/
│   │   │   ├── new/             # 申請作成（/approvals/new）
│   │   │   └── [id]/            # 申請詳細（/approvals/:id）・編集（/approvals/:id/edit）
│   │   ├── settings/            # 設定（profile / password / integrations / email / ai）
│   │   ├── database/
│   │   │   ├── templates/       # 申請テンプレート（/database/templates, /new, /:id、admin only）
│   │   │   └── accounts/        # アカウント管理（/database/accounts、admin only）
│   │   └── api/
│   │       ├── form-chat/       # 申請・テンプレートフォーム横の AI アシスタント API
│   │       ├── approvals/       # 申請 CRUD・承認操作・AIレビュー・AI分析
│   │       ├── templates/       # テンプレート CRUD
│   │       ├── reminders/       # リマインダー CRUD・手動配信実行
│   │       ├── notifications/   # 通知センター
│   │       ├── integrations/    # 外部API連携
│   │       ├── email/           # メール送信・設定
│   │       ├── documents/       # Word/Excel/PPT 生成
│   │       ├── chat/            # 旧メインチャットAPI（現在未使用）
│   │       └── auth/            # 認証
│   └── lib/
│       ├── components/
│       │   ├── ui/              # デザインシステム（Table, Select, Textbox 等）
│       │   ├── chat/            # 旧メインチャットが返すUIコンポーネント（現在未使用）
│       │   ├── dialog/          # ApprovalForm/Detail/AnalysisChat, DialogChatSide（AIアシスタント）
│       │   ├── database/        # データ管理画面専用（TemplateForm 等）
│       │   └── icon/            # SVG アイコン
│       ├── server/
│       │   ├── db/              # DrizzleORM スキーマ・クエリ
│       │   ├── mcp/             # MCP ツール定義（Zod スキーマ付き）
│       │   ├── ai/              # Claude API 連携・システムプロンプト・AI分析
│       │   ├── approvals/       # 申請固有サーバーロジック（メール通知等）
│       │   ├── email/           # メール送信（Resend / SES / SMTP）
│       │   └── reminders/       # リマインダー配信ロジック（Cron Triggerから呼ばれる）
│       ├── styles/              # グローバルスタイル・テーマ
│       └── types/               # 共通型定義
├── drizzle/                     # マイグレーション SQL
├── scripts/                     # シードスクリプト等
├── worker.ts                    # Cloudflare Workers エントリポイント（Cron Trigger 対応）
├── wrangler.toml                # 本番用設定 + ローカル開発用 [env.local]
└── wrangler.build.jsonc         # ビルド時アダプタ設定
```

`src/lib/components/chat/`・`src/routes/api/chat/`・`src/lib/quick-actions/`・`src/lib/server/quick-actions/`・`src/lib/components/dialog/`内の`ApprovalDialog.svelte`/`FormDialog.svelte`/`DialogShell.svelte` は、チャット中心UIからリスト＋ページ中心UIへ刷新した際に取り残された未使用コード（詳細はCLAUDE.mdのTODO参照）。

## DBスキーマ

| テーブル | 用途 |
|---|---|
| `accounts` + KVセッション | 認証・ユーザー管理 |
| `approval_requests` | 申請（タイトル・種別・ステータス・承認ルート・本文・カスタムフィールド・添付） |
| `approval_templates` | 申請テンプレート（名前・説明・本文ひな形・カスタムフィールド定義・デフォルト承認ルート） |
| `notifications` | 通知センター |
| `reminders` | リマインダー |
| `integrations` | 外部API連携（Slack Webhook 等） |
| `email_providers` | メール設定 |
| `ai_settings` | AIモデル設定 |

`workflows` / `workflow_runs` / `chats` / `chat_messages` はチャット中心UIの廃止に伴い削除済み（`drizzle/0001_drop_unused_tables.sql`）。

## テーマ

ダーク / ライト / システム（OS設定追従）の3択。サイドバー下部で切り替え。CSS カスタムプロパティ（`--color-*`）で定義し `data-theme` 属性で切り替える。
