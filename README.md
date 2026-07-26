# ほしいものマネージャー — Wishlist Budget Manager

ほしいと思ったものを一度ここに「ためて」、**合計予算・必要度・期限**を整理するための個人用 Web サービスです。衝動買いをいったん保留し、「本当に必要か」「全部でいくらかかるか」「いつまでにほしいのか」を可視化して、購入の意思決定を助けます。

商品リンクを貼ると**商品名と価格を自動取得**し、**必要度（5段階）**と**期限**をつけて管理できます。

## 主な機能

- **リンクから自動取得** — URL を貼るだけで商品名・価格・画像を取得（JSON-LD / OpenGraph / meta タグ）。取得できないサイトは手動入力にフォールバック。
- **必要度（5段階）と期限** — 「いつまでにほしいか」の目標も設定でき、期限が近い/超過はカードに色付きで表示。
- **ダッシュボード** — ほしいもの合計金額・件数、必要度の内訳、`月予算 → 全部買うのに約◯ヶ月`、期限間近の件数。
- **自制心をサポート**
  - **おすすめ優先順位**（必要度 × 期限の近さ）で並び替え
  - **冷却期間バッジ** — 追加直後のアイテムに「寝かせ中」を表示し、数日おいて考える後押し
  - **我慢できた金額** — 「見送り」にした合計を前向きに表示
- **購入 / 見送りの記録** — 判断の振り返りができます。
- **apple-design** — [emilkowalski/skills の apple-design](https://github.com/emilkowalski/skills/tree/main/skills/apple-design) を `.claude/skills/` に取り込み、そのガイドライン（スプリング動作・半透明マテリアル・サイズ別タイポグラフィ・ダーク/ライト対応・reduced-motion）に沿って作成。

## 技術スタック

Next.js 16（App Router / Server Actions）・React 19・TypeScript・Tailwind CSS v4・[Motion](https://motion.dev)（スプリング）・[vaul](https://vaul.emilkowal.ski)（ボトムシート）・[cheerio](https://cheerio.js.org)（HTML 解析）・[postgres.js](https://github.com/porsager/postgres)。

データは **Supabase（Postgres）** に保存。`DATABASE_URL` 未設定時はローカルの JSON ファイルにフォールバックするため、**ゼロ設定でそのまま起動**できます。

## ローカルで動かす

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。`DATABASE_URL` を設定していなければ `.data/wishlist.json`（gitignore 済み）に保存されるので、DB なしですぐ試せます。

### スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック（`tsc --noEmit`） |
| `npm run test` | 商品メタ抽出のユニットテスト（Vitest） |

## Supabase のセットアップ（クラウド同期）

スマホと PC でデータを同期し、永続化するために Supabase を使います。

1. [supabase.com](https://supabase.com) で無料プロジェクトを作成。
2. **Project Settings → Database → Connection string** を開き、**「Transaction pooler」（ポート 6543）** の URI をコピー（サーバーレスに最適）。
3. その URI を環境変数 `DATABASE_URL` に設定（ローカルは `.env.local`、本番は Vercel）。
4. テーブル（`wishlist_items` / `app_settings`）は**初回アクセス時に自動作成**されます。手動 SQL は不要ですが、内容は [`db/schema.sql`](./db/schema.sql) にもあります。

## Vercel にデプロイ

Next.js なので Vercel にそのままデプロイできます。

1. この GitHub リポジトリを [Vercel](https://vercel.com/new) にインポート。
2. **Environment Variables** を設定：
   - `DATABASE_URL` … Supabase の Transaction pooler URI（クラウド同期に必須）
   - `APP_PASSWORD` … 任意。設定するとアプリにパスワードロックがかかります。
3. **Deploy**。

> Vercel のファイルシステムは一時的なので、本番では必ず `DATABASE_URL`（Supabase）を設定してください。未設定だとデータが保持されません。

## パスワードロック（任意）

個人の購入データを守るため、公開 URL には保護をおすすめします。`APP_PASSWORD` を設定すると `/login` でパスワードを要求します（httpOnly クッキー）。未設定なら認証なしで誰でも閲覧できます。

## 商品の自動取得について

Amazon・楽天・Yahoo! ショッピングなどは、bot 対策や JavaScript レンダリングにより**自動取得に失敗する場合があります**。その場合はホスト名などの分かる範囲を埋めたうえで、**商品名・価格を手動で入力**できます（意思決定の整理が目的なので、取得できなくても問題なく使えます）。

## 環境変数

`.env.example` を参照してください。

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | 本番で必須 | Supabase の Transaction pooler 接続文字列。未設定ならローカル JSON に保存。 |
| `APP_PASSWORD` | 任意 | 設定するとパスワードロックを有効化。 |

## プロジェクト構成

```
app/
  page.tsx            メイン画面（Server Component：データ取得）
  actions.ts          Server Actions（CRUD・商品メタ取得・設定）
  login/              任意パスワードロックのログイン画面
  components/         UI（AppShell / ダッシュボード / カード / シート など）
lib/
  db.ts               ストレージ層（Postgres or JSON フォールバック）
  product.ts          商品メタ抽出（cheerio）
  priority.ts         優先度スコア・集計・整形
  auth.ts             パスワードロック用トークン
db/schema.sql         Postgres スキーマ
proxy.ts              パスワードロック（Next.js 16 の proxy）
.claude/skills/apple-design/SKILL.md   デザインスキル
```
