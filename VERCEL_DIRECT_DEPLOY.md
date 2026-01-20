# 🚀 Vercel 直接デプロイ手順

## 即座にデプロイする方法

### 方法1: Vercel CLI（推奨・最速）

```bash
# プロジェクトディレクトリで実行
cd /home/user/webapp/order-management-system

# Vercelにログイン（ブラウザが開きます）
npx vercel login

# デプロイ実行
npx vercel

# 本番環境にデプロイ
npx vercel --prod
```

#### 質問への回答例:
- **Set up and deploy?** → `Y`
- **Which scope?** → あなたのアカウントを選択
- **Link to existing project?** → `N`
- **Project name** → `order-management-system` (Enterでデフォルト)
- **In which directory is your code located?** → `./` (Enterでデフォルト)
- **Want to override the settings?** → `N`

### 方法2: Vercel ダッシュボード（GUI）

#### ステップ1: GitHubリポジトリを作成

1. https://github.com/new にアクセス
2. Repository name: `order-management-system`
3. "Create repository" をクリック

#### ステップ2: コードをプッシュ

```bash
cd /home/user/webapp/order-management-system

# GitHubリポジトリを追加（URLは作成したリポジトリのURL）
git remote add origin https://github.com/kazunarihonda83-jpg/order-management-system.git

# プッシュ
git branch -M main
git push -u origin main
```

#### ステップ3: Vercelにインポート

1. https://vercel.com/new にアクセス
2. "Import Git Repository" をクリック
3. 作成したリポジトリを選択
4. 設定を確認:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **環境変数を追加**:
   ```
   NODE_ENV=production
   JWT_SECRET=your-strong-secret-key-here
   ```
6. "Deploy" をクリック

---

## ⚠️ 重要: バックエンドについて

Vercelはフロントエンドのみホスティングされます。バックエンドAPIは別途デプロイが必要です。

### オプション1: Railway でバックエンドをデプロイ（推奨）

```bash
# 1. https://railway.app にアクセス
# 2. GitHubでログイン
# 3. "New Project" → "Deploy from GitHub repo"
# 4. リポジトリを選択
# 5. 環境変数を設定:
#    NODE_ENV=production
#    JWT_SECRET=your-secret-key
#    PORT=5000
# 6. "Generate Domain" でURLを取得
```

### オプション2: バックエンドURLを設定

Railwayでデプロイ後、フロントエンドのAPIエンドポイントを更新:

`src/utils/api.js` を編集:
```javascript
const api = axios.create({
  baseURL: 'https://your-railway-app.railway.app/api',  // RailwayのURL
  headers: {
    'Content-Type': 'application/json'
  }
});
```

変更後、再度プッシュ:
```bash
git add src/utils/api.js
git commit -m "Update API endpoint for production"
git push origin main
```

Vercelが自動的に再デプロイします。

---

## 🎯 最速デプロイフロー

```
1. Vercel CLIでログイン → 1分
2. npx vercel --prod 実行 → 3分
3. 完了！URLが表示される
```

または

```
1. GitHub にプッシュ → 1分
2. Vercel でインポート → 2分
3. 環境変数設定 → 1分
4. Deploy クリック → 3分
5. 完了！
```

---

## 📞 トラブルシューティング

### ビルドエラー
- ローカルで `npm run build` を実行して確認
- エラーログをVercelダッシュボードで確認

### APIに接続できない
- バックエンドが起動しているか確認
- CORS設定を確認
- APIのURLが正しいか確認

---

**今すぐ実行するコマンド:**

```bash
cd /home/user/webapp/order-management-system
npx vercel login
npx vercel --prod
```

これだけで完了します！🚀
