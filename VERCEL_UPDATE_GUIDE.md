# Vercel 更新手順

## 🔄 在庫管理機能を本番環境に反映する

### ✅ 完了している作業

- ✅ データベーススキーマに在庫管理テーブルを追加
- ✅ バックエンドAPIルート作成（在庫CRUD、入出庫、アラート）
- ✅ フロントエンド在庫管理ページ作成
- ✅ バグ修正（Warehouseアイコンインポート）
- ✅ すべての変更をGitHubにプッシュ済み

---

## 🚀 デプロイ方法

### 方法1: 自動デプロイ（推奨）

Vercelは GitHubと連携しているため、**自動的にデプロイされます**。

#### ステップ

1. **Vercelダッシュボードにアクセス**
   ```
   https://vercel.com/dashboard
   ```

2. **プロジェクトを選択**
   - `order-management-system-yakumo` をクリック

3. **デプロイ状況を確認**
   - 「Deployments」タブを開く
   - 最新のコミット（`4510db9 fix: Layout.jsx...`）が表示されているはず
   - ステータスが「Building」→「Ready」になるまで待つ（2〜3分）

4. **完了！**
   - デプロイURLをクリックして動作確認

---

### 方法2: 手動トリガー

自動デプロイが動作しない場合：

1. **Vercelダッシュボード**にアクセス
2. プロジェクト（`order-management-system-yakumo`）を開く
3. **「Deployments」タブ**をクリック
4. 右上の **「Redeploy」ボタン**をクリック
5. 確認ダイアログで **「Redeploy」**をクリック

---

### 方法3: CLIでデプロイ

ターミナルから直接デプロイ：

```bash
cd /home/user/webapp/order-management-system-yakumo
npx vercel --prod
```

※ 初回は認証が必要です

---

## 📝 デプロイ後の確認事項

### 1. 在庫管理メニューの確認

デプロイされたURLにアクセス：
- サイドバーに「在庫管理」メニューが表示されているか確認

### 2. 在庫管理機能のテスト

1. **ログイン**
   - ユーザー名: `食彩厨房やくも`
   - パスワード: `admin123`

2. **在庫管理ページにアクセス**
   - サイドバーから「在庫管理」をクリック

3. **初期データの確認**
   - 16品目の在庫が表示されるか確認
   - 統計カード（総アイテム数、在庫不足数など）が表示されるか確認

4. **在庫操作のテスト**
   - 新規在庫登録
   - 入出庫記録
   - 在庫検索・フィルター

### 3. アラート機能の確認

- 在庫不足アラートが表示されるか
- 賞味期限警告が表示されるか

---

## ⚠️ トラブルシューティング

### デプロイが失敗する場合

1. **ビルドログを確認**
   - Vercelダッシュボードの「Deployments」タブ
   - 失敗したデプロイをクリック
   - 「Build Logs」でエラーを確認

2. **環境変数を確認**
   - Settings → Environment Variables
   - 以下が設定されているか確認：
     - `NODE_ENV=production`
     - `JWT_SECRET=yakumo-secret-key-2025-production-secure`
     - `VERCEL=1`

3. **ローカルでビルドテスト**
   ```bash
   cd /home/user/webapp/order-management-system-yakumo
   npm run build
   ```

### データベースエラーが出る場合

Vercelの`/tmp`は一時的なので、データが永続化されません。
本番運用には以下を推奨：

- **Vercel Postgres**（推奨）
- **Supabase**
- **PlanetScale**
- **Neon**

---

## 📊 新機能の概要

### 在庫管理機能

#### データベース
- `inventory` - 在庫マスター
- `inventory_movements` - 入出庫履歴
- `stock_alerts` - 在庫アラート

#### API エンドポイント
- `GET /api/inventory` - 在庫一覧
- `POST /api/inventory` - 在庫登録
- `PUT /api/inventory/:id` - 在庫更新
- `DELETE /api/inventory/:id` - 在庫削除
- `POST /api/inventory/:id/movement` - 入出庫記録
- `GET /api/inventory/alerts/list` - アラート一覧
- `GET /api/inventory/stats/summary` - 在庫統計

#### 画面機能
- 在庫一覧表示
- 在庫登録・編集
- 入出庫・在庫調整
- カテゴリ・仕入先フィルター
- 在庫不足・賞味期限アラート
- 統計ダッシュボード

---

## 🎉 完了

デプロイが完了したら、本番環境で在庫管理機能を使用できます！

**作成日**: 2026-01-20  
**対象バージョン**: v1.1.0（在庫管理機能追加）
