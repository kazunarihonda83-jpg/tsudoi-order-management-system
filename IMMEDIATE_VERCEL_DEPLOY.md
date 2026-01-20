# ⚡ 今すぐVercelにデプロイする

## 🎯 3つの方法から選んでください

---

## 方法1: Vercel CLI（最速・推奨）⭐⭐⭐⭐⭐

### 実行コマンド（これだけ！）

```bash
cd /home/user/webapp/order-management-system
npx vercel login
npx vercel --prod
```

### 詳細手順

1. **ログイン**
   ```bash
   npx vercel login
   ```
   - メールアドレスを入力
   - 受信したメールの認証リンクをクリック

2. **デプロイ**
   ```bash
   npx vercel --prod
   ```
   
3. **質問に回答**（すべてEnterでOK）
   - Set up and deploy? → `Y`
   - Which scope? → あなたのアカウント
   - Link to existing project? → `N`
   - Project name → `order-management-system`
   - In which directory? → `./`
   - Override settings? → `N`

4. **完了！**
   - URLが表示されます
   - 例: `https://order-management-system-xxx.vercel.app`

**所要時間**: 3分

---

## 方法2: Vercel Dashboard（GUI）⭐⭐⭐⭐

### ステップ1: GitHubにプッシュ

```bash
cd /home/user/webapp/order-management-system

# GitHubで新規リポジトリを作成後
git remote add origin https://github.com/YOUR_USERNAME/order-management-system.git
git branch -M main
git push -u origin main
```

### ステップ2: Vercelでインポート

1. **https://vercel.com/login** でログイン
2. **"Add New..." → "Project"** をクリック
3. **"Import Git Repository"** を選択
4. **GitHubリポジトリを接続**
5. **リポジトリを選択**: `order-management-system`
6. **設定を確認**:
   - Framework Preset: **Vite** ✅
   - Root Directory: **`./`** ✅
   - Build Command: **`npm run build`** ✅
   - Output Directory: **`dist`** ✅
7. **環境変数を追加**:
   ```
   NODE_ENV = production
   JWT_SECRET = your-strong-random-secret-key-change-this
   ```
8. **"Deploy"** をクリック

**所要時間**: 5分

---

## 方法3: Vercel GitHub Integration（自動）⭐⭐⭐⭐⭐

### 完全自動デプロイ

1. **GitHub にプッシュ**
   ```bash
   git push origin main
   ```

2. **Vercel でGitHub連携**
   - https://vercel.com/dashboard
   - "Import Project"
   - GitHubリポジトリを選択

3. **以降は自動**
   - git push するたびに自動デプロイ
   - プルリクエストごとにプレビュー生成

**所要時間**: 初回5分、以降は自動

---

## ⚠️ 重要: バックエンドAPI

Vercelはフロントエンドのみホストします。
バックエンドは **Railway** で別途デプロイしてください。

### Railway デプロイ（3分）

```bash
# 1. https://railway.app にアクセス
# 2. GitHubでログイン
# 3. "Deploy from GitHub repo" を選択
# 4. リポジトリを選択
# 5. 環境変数を設定:
NODE_ENV=production
JWT_SECRET=your-secret-key
PORT=5000
# 6. "Generate Domain" でURL取得
```

### APIエンドポイントを更新

Railway デプロイ後:

1. **`src/utils/api.js` を編集**:
   ```javascript
   const api = axios.create({
     baseURL: 'https://your-app-name.railway.app/api',  // ← RailwayのURL
     headers: {
       'Content-Type': 'application/json'
     }
   });
   ```

2. **コミット＆プッシュ**:
   ```bash
   git add src/utils/api.js
   git commit -m "Update API endpoint"
   git push origin main
   ```

3. **Vercel が自動的に再デプロイ**

---

## 🚀 今すぐ実行するコマンド

### オプションA: CLI（最速）

```bash
cd /home/user/webapp/order-management-system
npx vercel login
npx vercel --prod
```

### オプションB: GitHub経由

```bash
cd /home/user/webapp/order-management-system

# 1. GitHubでリポジトリ作成: https://github.com/new
# 2. 以下を実行:
git remote add origin https://github.com/YOUR_USERNAME/order-management-system.git
git branch -M main
git push -u origin main

# 3. https://vercel.com/new でインポート
```

---

## ✅ デプロイ後の確認

1. **Vercel URLにアクセス**
2. **ログインページが表示される**
3. **admin / admin123 でログイン**
4. **ダッシュボードが表示される**

### APIエラーが出る場合

→ Railwayのバックエンドデプロイが必要です（上記参照）

---

## 📊 完了したこと

✅ Vercel設定ファイル完備  
✅ ビルド設定完了  
✅ 環境変数テンプレート準備  
✅ ローカルビルドテスト成功  
✅ Git コミット完了  

---

## 🎯 推奨フロー

```
1. npx vercel login → 1分
2. npx vercel --prod → 2分
3. Railway でバックエンド → 3分
4. API URL更新 → 1分
5. 完了！ → 合計7分
```

---

**今すぐ実行:**

```bash
cd /home/user/webapp/order-management-system
npx vercel login
```

これだけで始められます！🚀
