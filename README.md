# Teeling

AIネイティブな申請管理・承認ワークフローシステム。
ユーザーはAIに相談しながら申請書を作成し、AIが内容をレビュー・判断材料（ROI/NPV等）を自動生成することで承認サイクルを短縮する。

## 主な機能

- **申請作成AI**（`/`）— チャットで「〇〇の出張申請を作って」と話すだけで申請書を生成。MCP ツール経由で申請の登録・参照・取り消しが可能
- **AI分析**（申請詳細） — 申請内容のレビュー・効果分析（ROI/NPV/回収期間）・シミュレーションを1ボタンで実行。財務判断に不要な申請は申請レビューのみ表示
- **申請テンプレート**（`/database/templates`）— 申請種別ごとにカスタムフィールド（テキスト/数値/日付/時間）とデフォルト承認ルートを定義（管理者のみ）
- **承認ワークフロー** — ステップ順に承認・否決・差し戻しが可能。差し戻しは現在の担当承認者のみ実行可
- **メール通知** — 自分の番になったとき（承認依頼）、申請が完了/否決/差し戻しされたとき（結果通知）を自動送信
- **ワークフロー自動化**（`/database/workflows`）— 毎日定時トリガーで申請を一括作成・通知するノーコードワークフロー
- **リマインダー**（`/database/reminders`）— Cron Trigger による通知センター／メール／Slack への自動配信
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
bunx wrangler d1 migrations apply teeling --local
```

マイグレーション完了時にテスト用アカウントが自動作成される:

| メールアドレス | パスワード | 権限 |
|---|---|---|
| `info@alcogy.com` | `password` | admin |
| `user1@example.com` ～ `user5@example.com` | `password` | general |

### 4. 開発サーバーの起動

```sh
bun dev
```

ブラウザで `http://localhost:5173` を開き、`/signin` からログインする。

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
│   │   ├── +page.svelte         # チャット画面（/）
│   │   ├── signin/              # ログイン・パスワードリセット
│   │   ├── approvals/[id]/      # 申請詳細（/approvals/:id）
│   │   ├── settings/            # 設定（profile / password / integrations / email / ai）
│   │   ├── database/
│   │   │   ├── approvals/       # 申請管理（/database/approvals）
│   │   │   ├── workflows/       # ワークフロー（/database/workflows）
│   │   │   ├── templates/       # 申請テンプレート（/database/templates、admin only）
│   │   │   ├── accounts/        # アカウント管理（/database/accounts、admin only）
│   │   │   └── reminders/       # リマインダー（/database/reminders）
│   │   └── api/
│   │       ├── chat/            # チャット API（MCP ツール呼び出し）
│   │       ├── form-chat/       # 申請ダイアログ内 AI アシスタント API
│   │       ├── approvals/       # 申請 CRUD・承認操作・AI分析
│   │       ├── templates/       # テンプレート CRUD
│   │       ├── workflows/       # ワークフロー CRUD・実行
│   │       ├── reminders/       # リマインダー配信
│   │       ├── notifications/   # 通知センター
│   │       ├── integrations/    # 外部API連携
│   │       ├── email/           # メール送信・設定
│   │       ├── documents/       # Word/Excel/PPT 生成
│   │       └── auth/            # 認証
│   └── lib/
│       ├── components/
│       │   ├── ui/              # デザインシステム（Table, Select, Textbox 等）
│       │   ├── chat/            # AI が返す UI コンポーネント（Form, Table, Chart 等）
│       │   ├── dialog/          # 申請詳細・作成ダイアログ（ApprovalDialog 等）
│       │   ├── database/        # データ管理画面専用
│       │   └── icon/            # SVG アイコン
│       ├── server/
│       │   ├── db/              # DrizzleORM スキーマ・クエリ
│       │   ├── mcp/             # MCP ツール定義（Zod スキーマ付き）
│       │   ├── ai/              # Claude API 連携・システムプロンプト・AI分析
│       │   ├── approvals/       # 申請固有サーバーロジック（メール通知等）
│       │   ├── email/           # メール送信（Resend / SES / SMTP）
│       │   ├── reminders/       # リマインダー配信ロジック
│       │   └── quick-actions/   # クイックアクション実行レジストリ
│       ├── styles/              # グローバルスタイル・テーマ
│       └── types/               # 共通型定義
├── drizzle/                     # マイグレーション SQL
├── scripts/                     # シードスクリプト等
├── worker.ts                    # Cloudflare Workers エントリポイント（Cron Trigger 対応）
├── wrangler.toml                # 本番用設定
└── wrangler.build.jsonc         # ビルド時アダプタ設定
```

## DBスキーマ

| テーブル | 用途 |
|---|---|
| `accounts` + KVセッション | 認証・ユーザー管理 |
| `approval_requests` | 申請（タイトル・種別・ステータス・承認ルート・本文・カスタムフィールド・添付） |
| `approval_templates` | 申請テンプレート（カスタムフィールド定義・デフォルト承認ルート） |
| `workflows` / `workflow_runs` | ワークフロー自動化 |
| `notifications` | 通知センター |
| `reminders` | リマインダー |
| `integrations` | 外部API連携（Slack Webhook 等） |
| `email_providers` | メール設定 |
| `chats` / `chat_messages` | チャット履歴 |
| `ai_settings` | AIモデル設定 |

## テーマ

ダーク / ライト / システム（OS設定追従）の3択。サイドバー下部で切り替え。CSS カスタムプロパティ（`--color-*`）で定義し `data-theme` 属性で切り替える。
