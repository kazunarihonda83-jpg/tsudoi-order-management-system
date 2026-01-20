# Vercel 簡単デプロイ手順

## 📌 準備完了済み

✅ コードはGitHubにプッシュ済み  
✅ リポジトリURL: https://github.com/kazunarihonda83-jpg/order-management-system-yakumo

---

## 🚀 ステップ1: Vercelにアクセス

以下のリンクをクリックしてください：

**👉 https://vercel.com/new**

GitHubアカウントでログインしてください（初回のみ）。

---

## 🚀 ステップ2: リポジトリをインポート

### 2-1. "Import Git Repository" セクションで

1. **"Add GitHub Account"** または **"Configure GitHub App"** をクリック（初回のみ）
2. GitHubの認証画面で許可する
3. リポジトリ一覧から **"order-management-system-yakumo"** を探す
4. **"Import"** ボタンをクリック

---

## 🚀 ステップ3: プロジェクト設定

### 3-1. "Configure Project" 画面で以下を設定：

#### プロジェクト名
- **Project Name**: `order-management-system-yakumo`（デフォルトのままでOK）

#### Framework Preset
- **Framework Preset**: `Vite` を選択（自動検出されているはず）

#### Root Directory
- **Root Directory**: `.` （デフォルトのままでOK）

#### Build and Output Settings
- **Build Command**: `npm run build` （デフォルトのままでOK）
- **Output Directory**: `dist` （デフォルトのままでOK）
- **Install Command**: `npm install` （デフォルトのままでOK）

---

## 🚀 ステップ4: 環境変数の設定

**"Environment Variables"** セクションを展開し、以下を追加：

### 必須の環境変数

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `yakumo-secret-key-2025-production-secure` |
| `VERCEL` | `1` |

### 設定方法
1. **Key** に変数名を入力（例: `NODE_ENV`）
2. **Value** に値を入力（例: `production`）
3. **"Add"** ボタンをクリック
4. 上記3つの環境変数すべてを追加

---

## 🚀 ステップ5: デプロイ実行

**"Deploy"** ボタンをクリック！

デプロイには **2〜3分** かかります。

---

## ✅ デプロイ完了後

### 完了画面で以下が表示されます：

- 🎉 **"Congratulations!"** メッセージ
- 🔗 デプロイされたURLが表示（例: `https://order-management-system-yakumo.vercel.app`）
- **"Visit"** ボタンをクリックしてアクセス

---

## 🔐 ログイン情報

デプロイされたサイトで以下の情報でログイン：

- **ユーザー名**: `食彩厨房やくも`
- **パスワード**: `admin123`

---

## ⚠️ 重要な注意事項

### データベースについて

現在、SQLiteを使用していますが、Vercelの `/tmp` ディレクトリは**一時的**です。  
データは再デプロイやサーバー再起動で**消失**します。

### 本番運用には以下を推奨：

#### オプション1: Vercel Postgres（推奨）
- Vercelが提供する PostgreSQL データベース
- 同じダッシュボードで管理可能
- https://vercel.com/docs/storage/vercel-postgres

#### オプション2: Supabase
- 無料枠あり
- PostgreSQL + 認証機能
- https://supabase.com/

#### オプション3: PlanetScale
- MySQL 互換
- 無料枠あり
- https://planetscale.com/

#### オプション4: Neon
- Serverless PostgreSQL
- 無料枠あり
- https://neon.tech/

---

## 🔧 トラブルシューティング

### デプロイエラーが発生した場合

1. Vercelのデプロイログを確認
2. ビルドエラーの場合は、ローカルで `npm run build` を実行して確認
3. 環境変数が正しく設定されているか確認

### ログインできない場合

1. ブラウザのコンソールを開いてエラーを確認（F12キー）
2. API呼び出しが失敗していないか確認
3. 環境変数 `JWT_SECRET` が設定されているか確認

---

## 📞 サポート

デプロイに関する質問や問題があれば、お気軽にお問い合わせください。

---

**作成日**: 2026-01-20  
**対象システム**: 受発注管理システム（株式会社食彩厨房やくも）
