# つどいシステム データ表示トラブルシューティング

## 現状確認

✅ **バックエンドAPI**: データは正常に登録されています
- 顧客: 10件
- 在庫: 10品目
- 仕入先: 12社
- 発注: 10件
- 書類: 10件

❌ **フロントエンド**: データが表示されない

## 問題の原因

フロントエンドがバックエンドAPIに正しく接続できていない可能性があります。

### 原因1: Vercel環境変数が未設定

Vercelダッシュボードで `VITE_API_URL` が設定されていない可能性があります。

### 原因2: ブラウザキャッシュ

古いキャッシュが残っている可能性があります。

### 原因3: 認証トークンの問題

ログイン後のトークンが正しく保存されていない可能性があります。

## 解決方法

### 方法1: ブラウザキャッシュをクリア（最も簡単）

1. **Chrome/Edge**:
   - `Ctrl + Shift + Delete` (Windows) または `Cmd + Shift + Delete` (Mac)
   - 「キャッシュされた画像とファイル」を選択
   - 「データを削除」をクリック

2. **Firefox**:
   - `Ctrl + Shift + Delete` (Windows) または `Cmd + Shift + Delete` (Mac)
   - 「キャッシュ」を選択
   - 「今すぐ消去」をクリック

3. **Safari**:
   - `Cmd + Option + E` でキャッシュをクリア

**その後**:
1. ブラウザを完全に閉じる
2. 再度開く
3. https://tsudoi-order-management-system2.vercel.app にアクセス
4. ログイン: `13湯麺集TSUDOI` / `admin123`

### 方法2: シークレット/プライベートモードでアクセス

1. **Chrome/Edge**: `Ctrl + Shift + N`
2. **Firefox**: `Ctrl + Shift + P`
3. **Safari**: `Cmd + Shift + N`

シークレットモードで https://tsudoi-order-management-system2.vercel.app にアクセスして確認

### 方法3: Vercel環境変数を確認・再設定

1. Vercelダッシュボードにアクセス
2. プロジェクト「tsudoi-order-management-system2」を選択
3. Settings → Environment Variables
4. `VITE_API_URL` が `https://tsudoi-backend.onrender.com/api` に設定されているか確認
5. 設定されていない場合は追加:
   - Name: `VITE_API_URL`
   - Value: `https://tsudoi-backend.onrender.com/api`
   - Environment: Production
6. 保存後、Deployments → Latest → Redeploy

### 方法4: 再デプロイ（確実）

```bash
cd /home/user/webapp/tsudoi-order-management-system
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

Vercelが自動的に再デプロイを開始します（約2-3分）

### 方法5: ローカルストレージをクリア

ブラウザの開発者ツール（F12）を開いて:

1. Consoleタブで以下を実行:
```javascript
localStorage.clear();
location.reload();
```

2. 再度ログイン

## データ確認方法（バックエンド直接確認）

ブラウザのアドレスバーに以下を入力:

```
https://tsudoi-backend.onrender.com/api/customers
```

ログインが必要と表示されればAPIは正常に稼働しています。

## 最終手段: 完全リセット

```bash
# サンドボックスで実行
cd /home/user/webapp/tsudoi-order-management-system
./restore-all-data.sh
```

その後、上記の方法1（キャッシュクリア）を実行

## サポート

問題が解決しない場合は、以下の情報をお知らせください:

1. 使用ブラウザ（Chrome, Firefox, Safari, Edge等）
2. ブラウザのバージョン
3. エラーメッセージ（F12開発者ツールのConsoleタブに表示）
4. ログインは成功しているか
5. どの画面でデータが表示されないか

---

**重要**: バックエンドにデータは確実に存在しています。
問題はフロントエンドとバックエンドの接続部分です。
