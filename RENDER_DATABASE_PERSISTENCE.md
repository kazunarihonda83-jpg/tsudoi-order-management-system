# Render データベース永続化設定ガイド

## 🚨 現在の問題

**Renderの無料プランでデータベースが頻繁にリセットされています**

原因：
- Renderの無料プランはディスクが永続化されていない
- サービスが非アクティブになるとデータベースファイルが削除される
- 再起動のたびにデータが消失する

## 🔧 解決方法

### 方法1: Renderの永続ディスクを設定（推奨）

1. **Renderダッシュボードにアクセス**
   - https://dashboard.render.com/

2. **バックエンドサービスを選択**
   - `tsudoi-backend` を選択

3. **Disks設定を追加**
   - 左メニューから「Environment」→「Disks」を選択
   - 「Add Disk」をクリック
   - 設定:
     ```
     Name: tsudoi-database
     Mount Path: /data
     Size: 1GB (無料プランの制限内)
     ```
   - 保存

4. **環境変数を確認**
   - データベースファイルパスが `/data/tsudoi.db` になっているか確認
   - なければ環境変数 `DATABASE_PATH=/data/tsudoi.db` を追加

5. **サービスを再起動**

### 方法2: PostgreSQL等の外部データベースを使用

**無料オプション:**

#### A. Supabase（推奨）
- 無料枠: 500MB、最大2プロジェクト
- PostgreSQL互換
- 永続的なデータストレージ

設定手順:
1. https://supabase.com/ でアカウント作成
2. 新しいプロジェクトを作成
3. Database URLを取得
4. Renderの環境変数に設定:
   ```
   DATABASE_URL=postgresql://...
   ```

#### B. Neon（推奨）
- 無料枠: 3GB、無制限プロジェクト
- PostgreSQL互換
- サーバーレス

設定手順:
1. https://neon.tech/ でアカウント作成
2. 新しいプロジェクトを作成
3. Connection stringを取得
4. Renderの環境変数に設定

#### C. Render PostgreSQL
- 無料枠: 90日間（期限後削除）
- 注意: 90日後にデータが削除される

### 方法3: 有料プランにアップグレード

**Render Starter Plan:**
- 月額 $7
- 永続ディスク込み
- 自動バックアップ
- 24/7稼働

## 📝 現在の応急処置

データが消えた場合の復旧手順:

```bash
cd /home/user/webapp/tsudoi-order-management-system
./restore-all-data.sh
```

このスクリプトで以下が自動復旧されます:
- 顧客データ: 10件
- 在庫データ: 10品目
- 仕入先データ: 12社（新規8社含む）
- 発注データ: 10件
- 書類データ: 10件

## 🔄 定期バックアップの実装（推奨）

### GitHub Actionsで自動バックアップ

`.github/workflows/backup.yml` を作成:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 0 * * *'  # 毎日午前0時
  workflow_dispatch:  # 手動実行も可能

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Backup Database
        run: |
          curl -X GET "https://tsudoi-backend.onrender.com/api/backup" \
            -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}" \
            -o backup-$(date +%Y%m%d).json
      
      - name: Upload Backup
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backup-*.json
          retention-days: 30
```

## 🎯 推奨される恒久的解決策

1. **最優先**: Renderに永続ディスクを設定
2. **次善策**: Supabase/Neonの無料PostgreSQLを使用
3. **長期的**: Render有料プラン（$7/月）にアップグレード

## 📞 サポート

設定でお困りの場合は、以下の情報と共にお知らせください:
- Renderのプラン（Free/Starter）
- 現在のディスク設定
- エラーメッセージ

---

**重要**: 現在の応急処置（restore-all-data.sh）は一時的な対策です。
永続化設定を行わないと、データは引き続き消失します。
