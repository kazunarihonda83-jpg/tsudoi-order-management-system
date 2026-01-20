# Vercelデプロイ手順（完全ガイド）

## 🎯 概要
この受発注管理システムをVercelにデプロイする完全な手順です。
所要時間：**5〜10分**

---

## ✅ 事前準備（完了済み）

以下はすべて準備完了しています：
- ✅ 通貨記号を`¥`に統一
- ✅ シンプルでビジネスライクなUI
- ✅ `vercel.json`設定ファイル
- ✅ Serverless Functions（`/api/*`）
- ✅ ビルドテスト成功（560KB）
- ✅ Gitコミット完了

---

## 📋 ステップ1: GitHubリポジトリを作成

### 1-1. GitHubにアクセス
https://github.com/new

### 1-2. リポジトリ情報を入力
- **Repository name**: `order-management-system`
- **Description**: `受発注管理システム - React + Vite + Vercel Serverless`
- **Public/Private**: どちらでも可（Publicを推奨）
- **Initialize this repository**: **チェックを入れない**（重要）

### 1-3. "Create repository"をクリック

---

## 📋 ステップ2: コードをGitHubにプッシュ

### 2-1. ターミナルを開く
サンドボックス環境のターミナルで以下を実行：

```bash
cd /home/user/webapp/order-management-system
```

### 2-2. GitHubリモートを追加
```bash
git remote add origin https://github.com/あなたのユーザー名/order-management-system.git
```

**例**:
```bash
git remote add origin https://github.com/kazunarihonda83-jpg/order-management-system.git
```

### 2-3. コードをプッシュ
```bash
git branch -M master
git push -u origin master
```

**認証が求められた場合**：
- **Username**: あなたのGitHubユーザー名
- **Password**: **Personal Access Token**（パスワードではありません）
  - Tokenがない場合は https://github.com/settings/tokens から作成
  - Scopeは `repo` を選択

---

## 📋 ステップ3: Vercelにデプロイ

### 3-1. Vercelにアクセス
https://vercel.com/new

GitHubアカウントでログインしていない場合はログインしてください。

### 3-2. "Import Git Repository"
1. **"Import Git Repository"**をクリック
2. GitHubアカウントを接続（初回のみ）
3. **"order-management-system"** リポジトリを選択
4. **"Import"**をクリック

### 3-3. デプロイ設定

**Project Name**: `order-management-system`（自動入力）

**Framework Preset**: `Vite`（自動検出）

**Build and Output Settings**:
- **Build Command**: `npm run build`（デフォルト）
- **Output Directory**: `dist`（デフォルト）
- **Install Command**: `npm install`（デフォルト）

**Environment Variables**（環境変数を追加）:

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `your-strong-secret-key-change-this` |
| `VERCEL` | `1` |

⚠️ **重要**: `JWT_SECRET`は必ず強力なランダム文字列に変更してください。

### 3-4. "Deploy"をクリック

ビルドが開始されます（1〜2分）。

### 3-5. デプロイ完了

✅ "Congratulations!"画面が表示されたら成功です。

**デプロイURL**が表示されます：
```
https://order-management-system-xxxxx.vercel.app
```

---

## 🔍 ステップ4: 動作確認

### 4-1. アプリにアクセス
Vercelから提供されたURLにアクセス：
```
https://order-management-system-xxxxx.vercel.app
```

### 4-2. ログイン
- **ユーザー名**: `admin`
- **パスワード**: `admin123`

### 4-3. 機能確認
以下の機能をテスト：
- ✅ ダッシュボード表示
- ✅ 顧客管理（作成・編集・削除）
- ✅ 伝票管理（見積書・納品書・請求書）
- ✅ 仕入先管理
- ✅ 発注管理
- ✅ 会計管理（仕訳・試算表・損益計算書・貸借対照表）
- ✅ 通貨記号が`¥`で表示されること

---

## ⚙️ 補足情報

### 📂 アーキテクチャ
```
受発注管理システム
├── Frontend: React 18 + Vite + React Router
├── Backend: Vercel Serverless Functions (Node.js)
└── Database: SQLite（/tmp - 一時的）
```

### 🗄️ データベースについて（重要）

**現在の設定**:
- SQLiteを`/tmp`ディレクトリに保存
- Vercelは各リクエストごとに新しいServerless環境を起動
- `/tmp`のデータは**永続化されません**

**本番環境での推奨**:
- **Vercel Postgres**（推奨）
  - https://vercel.com/docs/storage/vercel-postgres
  - Vercelネイティブで簡単統合
- **Supabase**（無料枠あり）
  - https://supabase.com
- **PlanetScale**（無料枠あり）
  - https://planetscale.com
- **Neon**（無料枠あり）
  - https://neon.tech

### 🔄 データベース移行手順（Vercel Postgres使用の場合）

1. Vercel Dashboardで"Storage"タブを開く
2. "Create Database" → "Postgres"を選択
3. データベース作成後、接続情報を取得
4. Vercel環境変数に以下を追加：
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   （これらはVercelが自動で提供）
5. `server/database-vercel.js`を修正してPostgreSQLに対応

---

## 🐛 トラブルシューティング

### ビルドエラー
**エラー**: `Command "npm run build" exited with 1`

**解決策**:
```bash
cd /home/user/webapp/order-management-system
npm install
npm run build
```
ローカルでビルドエラーがないか確認してから再プッシュ。

### 環境変数エラー
**エラー**: `JWT_SECRET is not defined`

**解決策**:
1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. `JWT_SECRET`を追加
3. Redeploy

### APIエラー
**エラー**: `404 - API endpoint not found`

**解決策**:
- `vercel.json`の`rewrites`設定を確認
- `/api/*`ファイルが正しく配置されているか確認

### データが保存されない
**原因**: SQLiteは`/tmp`に保存されるため、Serverlessの再起動で消える

**解決策**:
- Vercel Postgresまたは外部データベースに移行

---

## 📚 関連ドキュメント

- `START_HERE.md` - クイックスタートガイド
- `VERCEL_ONLY_DEPLOY.md` - Vercel詳細技術ガイド
- `README_VERCEL.md` - アーキテクチャ説明
- `.env.example` - 環境変数テンプレート

---

## ✅ 完了チェックリスト

- [ ] GitHubリポジトリ作成
- [ ] コードをプッシュ
- [ ] Vercelでインポート
- [ ] 環境変数設定（`NODE_ENV`, `JWT_SECRET`, `VERCEL`）
- [ ] デプロイ成功
- [ ] URLにアクセス
- [ ] ログイン成功（`admin` / `admin123`）
- [ ] ダッシュボード表示
- [ ] 通貨記号`¥`表示確認
- [ ] 各機能の動作確認

---

## 🎉 デプロイ成功！

デプロイが完了したら、URLを共有できます：
```
https://order-management-system-xxxxx.vercel.app
```

---

## 📞 サポート

- Vercel公式ドキュメント: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- 本プロジェクトIssues: https://github.com/あなたのユーザー名/order-management-system/issues

---

**作成日**: 2025-12-02  
**バージョン**: 1.0  
**プロジェクトパス**: `/home/user/webapp/order-management-system`
