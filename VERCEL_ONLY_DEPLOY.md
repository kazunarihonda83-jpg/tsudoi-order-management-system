# 🚀 Vercel単体デプロイ - 完全ガイド

## ✅ Vercel のみでフルスタックデプロイ

バックエンドもVercel Serverless Functionsで動作するように設定しました。
**Railway不要**です。

---

## 📦 設定内容

### Vercel Serverless Functions
各APIエンドポイントを個別の関数として配置:

```
api/
├── auth.js          # /api/auth/*
├── customers.js     # /api/customers/*
├── documents.js     # /api/documents/*
├── suppliers.js     # /api/suppliers/*
├── purchases.js     # /api/purchases/*
└── accounting.js    # /api/accounting/*
```

### データベース
- SQLiteを `/tmp` ディレクトリで使用（Vercel環境）
- 初回起動時に自動的にテーブルとデフォルトデータを作成

---

## 🚀 デプロイ手順（3ステップ）

### ステップ1: GitHubリポジトリ作成
https://github.com/new
- Repository name: `order-management-system`
- Public
- "Create repository" をクリック

### ステップ2: コードをプッシュ
```bash
cd /home/user/webapp/order-management-system
git push -u origin master
```

### ステップ3: Vercelにデプロイ
https://vercel.com/new

1. **"Import Git Repository"** をクリック
2. GitHubリポジトリを接続
3. `order-management-system` を選択
4. **設定確認**:
   - Framework Preset: **Vite** ✅
   - Root Directory: **`./`** ✅
   - Build Command: **`npm run build`** ✅
   - Output Directory: **`dist`** ✅

5. **環境変数を設定**:
   ```
   NODE_ENV=production
   JWT_SECRET=your-very-strong-random-secret-key-change-this
   VERCEL=1
   ```

6. **"Deploy"** をクリック

**完了！** 5分でフルスタックデプロイ完了

---

## ⚠️ 重要: データベースについて

### 現在の設定
- SQLiteを使用（Vercelの `/tmp` ディレクトリ）
- **注意**: `/tmp` は一時的なストレージで、関数の再起動時にリセットされます

### 本番環境の推奨オプション

#### オプション1: Vercel Postgres（推奨）
```bash
# Vercelダッシュボードで:
# 1. Storage → Create Database → Postgres
# 2. 自動的に環境変数が設定されます
# 3. データベース接続コードを更新（後述）
```

#### オプション2: Vercel KV（Redis）
```bash
# キャッシュやセッション管理に適しています
```

#### オプション3: 外部データベース
- Supabase (https://supabase.com) - 無料枠あり
- PlanetScale (https://planetscale.com) - 無料枠あり
- Neon (https://neon.tech) - 無料枠あり

---

## 🔧 Vercel CLI でデプロイ（代替方法）

```bash
cd /home/user/webapp/order-management-system

# ログイン
npx vercel login

# デプロイ
npx vercel --prod
```

---

## 📊 デプロイ後の確認

1. **Vercel URLにアクセス**
   - 例: `https://order-management-system-xxx.vercel.app`

2. **ログインページが表示される**

3. **テストログイン**
   - Username: `admin`
   - Password: `admin123`

4. **すべての機能をテスト**
   - ダッシュボード
   - 顧客管理
   - 書類管理
   - 仕入先管理
   - 発注管理
   - 会計帳簿

---

## 🎯 vercel.json 設定

すでに設定済みです:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "routes": [
    {
      "src": "/api/auth/(.*)",
      "dest": "/api/auth.js"
    },
    {
      "src": "/api/customers/(.*)",
      "dest": "/api/customers.js"
    },
    ...
  ]
}
```

---

## 💾 データ永続化のためのアップグレード

### Vercel Postgres に移行する場合

1. **Vercel Postgresを追加**
   - Vercelダッシュボード → Storage → Postgres

2. **環境変数を確認**
   - 自動的に `POSTGRES_URL` などが設定されます

3. **データベースコードを更新**
   - `server/database.js` をPostgreSQL用に書き換え
   - `pg` パッケージを使用

---

## ✅ 現在のメリット

✅ **すべてVercelで完結**
✅ **Railway不要**
✅ **自動スケーリング**
✅ **グローバルCDN**
✅ **無料枠で十分使える**
✅ **https 自動設定**
✅ **CI/CD 自動化**

---

## 📞 トラブルシューティング

### API接続エラー
- Vercelダッシュボードでログを確認
- 環境変数が正しく設定されているか確認

### ビルドエラー
- ローカルで `npm run build` を実行して確認
- `package.json` の dependencies を確認

### データが消える
- `/tmp` は一時的なストレージです
- 本番環境ではVercel Postgresへの移行を推奨

---

## 🚀 今すぐデプロイ

### 方法1: GitHub + Vercel Dashboard
```bash
# 1. GitHubリポジトリ作成
# 2. プッシュ
git push -u origin master
# 3. https://vercel.com/new でインポート
```

### 方法2: Vercel CLI
```bash
npx vercel login
npx vercel --prod
```

---

**プロジェクト場所**: `/home/user/webapp/order-management-system`

**すべての設定完了**: ✅

**Railway不要**: ✅

**今すぐデプロイ可能**: ✅

🚀 準備完了！デプロイしてください！
