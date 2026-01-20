# デプロイ情報

## 本番環境

### バックエンド（Render）
- URL: https://tsudoi-backend.onrender.com
- プラン: Free
- リポジトリ: kazunarihonda83-jpg/tsudoi-order-management-system

### フロントエンド（Vercel）
- デプロイ準備完了
- 環境変数: VITE_API_URL=https://tsudoi-backend.onrender.com/api

## デプロイ手順

### 1. バックエンド（Render） - 完了
✅ https://render.com でデプロイ済み

### 2. フロントエンド（Vercel）

1. https://vercel.com にアクセス
2. GitHubでログイン
3. "Add New" → "Project" をクリック
4. リポジトリ選択: `kazunarihonda83-jpg/tsudoi-order-management-system`
5. 設定:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - Name: `VITE_API_URL`
     - Value: `https://tsudoi-backend.onrender.com/api`
6. "Deploy" をクリック

## ログイン情報

- ユーザー名: `13湯麺集TSUDOI`
- パスワード: `admin123`

## 注意事項

- Renderの無料プランは15分間アクセスがないとスリープします
- 初回アクセス時は起動に30秒程度かかる場合があります
