# デプロイオプション完全ガイド

このプロジェクトには複数のデプロイオプションがあります。それぞれの特徴と手順を説明します。

## オプション1: フロントエンド（Vercel）+ バックエンド（Railway）【推奨】

### メリット
- ✅ 完全無料（両方とも無料枠あり）
- ✅ 設定が簡単
- ✅ SQLiteをそのまま使える
- ✅ 自動デプロイ対応
- ✅ 高速

### 手順

#### A. バックエンドをRailwayにデプロイ

1. **Railwayアカウント作成**
   - https://railway.app にアクセス
   - GitHubアカウントでサインアップ

2. **新規プロジェクト作成**
   - 「New Project」→「Deploy from GitHub repo」
   - このリポジトリを選択

3. **設定**
   - Root Directory: `/`
   - Start Command: `node server/index.js`
   - 環境変数を追加:
     ```
     PORT=5000
     NODE_ENV=production
     JWT_SECRET=your-strong-secret-key-change-this
     ```

4. **ドメインを有効化**
   - Settings → Generate Domain
   - URLをメモ（例: `https://your-app.railway.app`）

#### B. フロントエンドをVercelにデプロイ

1. **APIベースURLを更新**
   
   `src/utils/api.js` を編集:
   ```javascript
   const api = axios.create({
     baseURL: 'https://your-app.railway.app/api',  // Railway のURL
     headers: {
       'Content-Type': 'application/json'
     }
   });
   ```

2. **GitHubにプッシュ**
   ```bash
   git add -A
   git commit -m "Configure for Railway backend"
   git push origin main
   ```

3. **Vercelでインポート**
   - https://vercel.com/dashboard にアクセス
   - 「Import Project」→ GitHubリポジトリを選択
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - 「Deploy」をクリック

4. **完成！**
   - Vercelが提供するURLからアクセス可能

---

## オプション2: すべてをRailwayにデプロイ【最も簡単】

### メリット
- ✅ 設定が最も簡単
- ✅ フロントエンドとバックエンドが一緒
- ✅ SQLiteをそのまま使える
- ✅ 無料枠あり

### 手順

1. **Railwayアカウント作成**
   - https://railway.app にアクセス

2. **プロジェクトをデプロイ**
   - 「New Project」→「Deploy from GitHub repo」
   - このリポジトリを選択

3. **ビルド設定**
   - Build Command: `npm install && npm run build`
   - Start Command: `node server/index.js`
   
4. **環境変数設定**
   ```
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=your-strong-secret-key-change-this
   ```

5. **静的ファイル配信設定**
   
   `server/index.js` に以下を追加（既に含まれている場合はスキップ）:
   ```javascript
   import path from 'path';
   import { fileURLToPath } from 'url';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   
   // Serve static files from dist
   app.use(express.static(path.join(__dirname, '../dist')));
   
   // Handle SPA routing
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../dist/index.html'));
   });
   ```

6. **ドメイン生成**
   - Settings → Generate Domain

---

## オプション3: Vercel + Vercel Postgres【フルVercel】

### メリット
- ✅ すべてVercelで完結
- ✅ 高速なエッジネットワーク
- ✅ 自動スケーリング

### デメリット
- ⚠️ PostgreSQLへの移行が必要
- ⚠️ コード修正が必要

### 手順

1. **Vercelダッシュボード**
   - Storage → Create Database → Postgres

2. **データベース接続情報取得**
   - 自動的に環境変数が設定されます

3. **コード修正**
   - `server/database.js` をPostgreSQL対応に変更
   - `better-sqlite3` → `pg` (PostgreSQLドライバー)

4. **デプロイ**
   - 通常のVercelデプロイ手順に従う

---

## オプション4: Render（フルスタック）

### メリット
- ✅ 無料枠あり
- ✅ SQLiteも使える（一部制限あり）
- ✅ 簡単設定

### 手順

1. **Renderアカウント作成**
   - https://render.com にアクセス

2. **新規Webサービス作成**
   - 「New」→「Web Service」
   - GitHubリポジトリを接続

3. **設定**
   - Build Command: `npm install && npm run build`
   - Start Command: `node server/index.js`
   - Environment: Node

4. **環境変数**
   ```
   NODE_ENV=production
   JWT_SECRET=your-strong-secret-key
   ```

---

## オプション5: Netlify + 外部API

### メリット
- ✅ 無料枠が大きい
- ✅ 高速CDN
- ✅ 簡単な設定

### 手順

1. **フロントエンド（Netlify）**
   - https://netlify.com でサインアップ
   - GitHubリポジトリを接続
   - Build Command: `npm run build`
   - Publish Directory: `dist`

2. **バックエンド（Railway/Render）**
   - 上記のいずれかの方法でデプロイ

---

## 推奨構成まとめ

| 構成 | コスト | 難易度 | パフォーマンス | おすすめ度 |
|------|--------|--------|----------------|-----------|
| Vercel + Railway | 無料 | 低 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Railway単体 | 無料 | 最低 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Vercel + Vercel Postgres | 無料* | 中 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Render単体 | 無料 | 低 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Netlify + Railway | 無料 | 低 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

*Vercel Postgres は無料枠に制限があります

---

## クイックスタート：最速デプロイ（Railway）

```bash
# 1. GitHubにプッシュ（まだの場合）
git add -A
git commit -m "Ready for deployment"
git push origin main

# 2. Railway.app にアクセスしてログイン

# 3. 「New Project」→「Deploy from GitHub repo」

# 4. リポジトリを選択 → 自動デプロイ開始

# 5. 完了！URLが生成されます
```

---

## トラブルシューティング

### ビルドエラー
```bash
# ローカルで確認
npm install
npm run build
```

### APIに接続できない
- CORS設定を確認
- バックエンドのURLが正しいか確認
- 環境変数が設定されているか確認

### データベースエラー
- Railway/Render: SQLiteのパスを確認
- Vercel: PostgreSQLへの移行が必要

---

**作成日**: 2025-12-02
**推奨オプション**: Railway単体デプロイ（最も簡単で確実）
