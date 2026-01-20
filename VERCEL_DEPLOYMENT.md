# Vercelデプロイガイド

## 前提条件
- Vercelアカウント（https://vercel.com/signup から無料登録）
- GitHubアカウント（リポジトリ連携用）

## デプロイ手順

### 方法1: GitHub経由でのデプロイ（推奨）

#### ステップ1: GitHubリポジトリにプッシュ
```bash
# 既存のリモートリポジトリがある場合
git add -A
git commit -m "Prepare for Vercel deployment"
git push origin master

# 新規リポジトリを作成する場合
# 1. GitHubで新しいリポジトリを作成
# 2. 以下のコマンドを実行
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

#### ステップ2: Vercelでインポート
1. https://vercel.com/dashboard にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」でGitHubリポジトリを選択
4. プロジェクト設定:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### ステップ3: 環境変数の設定
Vercelダッシュボードで以下の環境変数を設定:
```
NODE_ENV=production
JWT_SECRET=your-secret-key-here-change-this-in-production
```

#### ステップ4: デプロイ
「Deploy」ボタンをクリックすると、自動的にビルドとデプロイが開始されます。

### 方法2: Vercel CLIでのデプロイ

#### ステップ1: Vercel CLIでログイン
```bash
npx vercel login
```

#### ステップ2: プロジェクトをデプロイ
```bash
# 初回デプロイ（設定を対話式で行う）
npx vercel

# プロダクションデプロイ
npx vercel --prod
```

#### 質問への回答例:
- **Set up and deploy?**: Y
- **Which scope?**: (あなたのアカウント)
- **Link to existing project?**: N
- **Project name**: order-management-system
- **In which directory is your code located?**: ./
- **Want to override the settings?**: N

## 重要な注意事項

### 1. データベースについて
現在のプロジェクトはSQLiteを使用していますが、Vercelの環境は読み取り専用のため、以下のいずれかを選択してください:

**オプションA: Vercel Postgres（推奨）**
- Vercelダッシュボードから「Storage」→「Postgres」を追加
- 環境変数が自動的に設定されます
- コード側でPostgreSQLに対応する必要があります

**オプションB: 外部データベース**
- Supabase（無料枠あり）: https://supabase.com
- PlanetScale（無料枠あり）: https://planetscale.com
- Railway（無料枠あり）: https://railway.app
- Neon（無料枠あり）: https://neon.tech

**オプションC: フロントエンドのみデプロイ**
- バックエンドは別途ホスティング（Railway, Render, Fly.ioなど）
- 現在の設定でフロントエンドのみVercelにデプロイ可能

### 2. APIエンドポイント
フロントエンドのみデプロイする場合:
- `src/utils/api.js` の baseURL を外部バックエンドのURLに変更
```javascript
const api = axios.create({
  baseURL: 'https://your-backend-url.com/api', // 変更が必要
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 3. 環境変数
本番環境では必ず以下を変更してください:
- `JWT_SECRET`: 強力なランダム文字列に変更
- データベース接続情報

### 4. セキュリティ
- `.env` ファイルは絶対にGitHubにプッシュしない（`.gitignore`に含まれています）
- 本番環境用の強力なパスワードとシークレットを使用

## トラブルシューティング

### ビルドエラーが発生する場合
1. ローカルでビルドを確認:
```bash
npm run build
```

2. エラーログを確認してVercelダッシュボードで確認

### デプロイ後に画面が表示されない場合
1. Vercelダッシュボードでデプロイログを確認
2. ブラウザのコンソールでエラーを確認
3. 環境変数が正しく設定されているか確認

## 次のステップ

デプロイ完了後:
1. カスタムドメインの設定（任意）
2. HTTPSは自動的に有効化されます
3. 継続的デプロイメント（CI/CD）が自動的に設定されます

---

## 現在の構成

### ✅ 設定済み
- `vercel.json` - Vercelの設定ファイル
- `.vercelignore` - デプロイ時に除外するファイル
- `package.json` - ビルドスクリプトの追加
- Vite設定 - 本番ビルド対応

### ⚠️ 追加設定が必要
- データベース移行（SQLite → PostgreSQL/外部DB）
- API エンドポイントの設定
- 環境変数の設定

## サポート

問題が発生した場合:
1. Vercel公式ドキュメント: https://vercel.com/docs
2. Vercelコミュニティ: https://github.com/vercel/vercel/discussions

---
**作成日**: 2025-12-02
**最終更新**: 2025-12-02
