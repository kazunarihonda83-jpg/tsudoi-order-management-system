# 🚀 株式会社食彩厨房やくも - 受発注管理システム デプロイガイド

## ✅ システム完成状況

**100%完了** - すぐにデプロイ可能です！

---

## 📋 システム情報

### 会社情報
- **会社名**: 株式会社食彩厨房やくも
- **業種**: 居酒屋、日本酒バー、ビアバー
- **住所**: 北海道札幌市中央区大通東2-3-1 第36桂和ビル B2F
- **電話番号**: 050-5600-7609
- **従業員数**: 7人

### ログイン情報
- **ユーザー名**: `食彩厨房やくも`
- **パスワード**: `admin123`

### プロジェクトパス
```
/home/user/webapp/order-management-system-yakumo
```

---

## 🎯 3ステップデプロイ（5分）

### ステップ1: GitHubリポジトリを作成

1. https://github.com/new にアクセス
2. **Repository name**: `order-management-system-yakumo`
3. **Public** を選択
4. **⚠️ 重要**: "Initialize this repository with" のチェックを**すべて外す**
5. **"Create repository"** をクリック

---

### ステップ2: コードをGitHubにプッシュ

ターミナルで以下を実行：

```bash
cd /home/user/webapp/order-management-system-yakumo

# リモートが既に追加されているか確認
git remote -v

# リモートが追加されていない場合のみ実行
git remote add origin https://github.com/kazunarihonda83-jpg/order-management-system-yakumo.git

# プッシュ
git branch -M master
git push -u origin master
```

**認証が必要な場合**:
- Username: あなたのGitHubユーザー名
- Password: Personal Access Token (https://github.com/settings/tokens で作成)

---

### ステップ3: Vercelでデプロイ

1. **Vercelにアクセス**: https://vercel.com/new
2. GitHubアカウントでログイン
3. **"Import Git Repository"** をクリック
4. **`order-management-system-yakumo`** リポジトリを選択
5. **"Import"** をクリック

#### デプロイ設定:

**Framework Preset**: `Vite` (自動検出)

**Environment Variables** (環境変数を追加):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `yakumo-strong-secret-2025` |
| `VERCEL` | `1` |

⚠️ **重要**: `JWT_SECRET` は必ず強力なランダム文字列に変更してください。

6. **"Deploy"** ボタンをクリック

---

## ⏱️ デプロイ時間

- ビルド: 約1〜2分
- デプロイ完了後、URLが表示されます

例: `https://order-management-system-yakumo.vercel.app`

---

## 🎯 デプロイ完了後の確認

### 1. アクセス
```
https://order-management-system-yakumo-xxxxx.vercel.app
```

### 2. ログイン
- **ユーザー名**: `食彩厨房やくも`
- **パスワード**: `admin123`

### 3. データ確認

#### 仕入先管理
以下の4社が表示されます：
- ✅ 北海道鮮魚卸（鮮魚）
- ✅ 札幌酒類販売（日本酒・焼酎・ビール）
- ✅ 道産野菜センター（北海道産野菜）
- ✅ 北の食肉センター（ジンギスカン・豚肉・牛タン）

#### 発注管理
以下の5件の発注が表示されます：
- ✅ PO-2025-001: 本マグロ、サーモン、ホタテ、イカ
- ✅ PO-2025-002: 獺祭、八海山、サッポロクラシック、芋焼酎
- ✅ PO-2025-003: じゃがいも、玉ねぎ、アスパラガス、大根
- ✅ PO-2025-004: ラム肉、豚肉、鶏肉、牛タン
- ✅ PO-2025-005: ホッケ、ズワイガニ、ウニ

---

## 📊 サンプルデータ詳細

### 発注データ集計

#### 鮮魚（北海道鮮魚卸）
- 本マグロ: ¥17,000
- サーモン: ¥11,200
- ホタテ: ¥9,600
- イカ: ¥3,600
- ホッケ: ¥4,000
- ズワイガニ: ¥12,600
- ウニ: ¥14,000

#### 酒類（札幌酒類販売）
- 獺祭: ¥21,000
- 八海山: ¥12,600
- サッポロクラシック: ¥9,600
- 芋焼酎 魔王: ¥11,600

#### 青果（道産野菜センター）
- じゃがいも: ¥3,600
- 玉ねぎ: ¥2,400
- アスパラガス: ¥7,500
- 大根: ¥1,800

#### 食肉（北の食肉センター）
- ラム肉: ¥14,000
- 豚肉: ¥4,800
- 鶏肉: ¥2,800
- 牛タン: ¥9,000

**総発注額**: ¥173,700（税込）

---

## 🔧 カスタマイズ済み項目

### 会社情報
- ✅ ユーザー名: 食彩厨房やくも
- ✅ メールアドレス: info@shokusai-yakumo.com
- ✅ ログイン画面の表示更新

### 仕入先データ
- ✅ 居酒屋・日本酒バー・ビアバー向け
- ✅ 北海道の仕入先（鮮魚、酒類、青果、食肉）
- ✅ 銀行情報完備

### 発注データ
- ✅ 5件の発注（刺身、日本酒、野菜、肉類）
- ✅ リアルな単価と数量
- ✅ 消費税込み計算

---

## ⚠️ 重要な注意点

### データベースについて

現在、SQLiteを`/tmp`ディレクトリに保存しています。
Vercelの`/tmp`は一時的で、データは永続化されません。

**本番運用での推奨**:
- **Vercel Postgres** (https://vercel.com/docs/storage/vercel-postgres)
- **Supabase** (https://supabase.com)
- **PlanetScale** (https://planetscale.com)
- **Neon** (https://neon.tech)

### セキュリティ

- `JWT_SECRET` は必ず変更してください
- 本番環境では管理者パスワードを変更してください

---

## 📞 トラブルシューティング

### ビルドエラー
```bash
cd /home/user/webapp/order-management-system-yakumo
npm install
npm run build
```
ローカルでビルドエラーがないか確認してから再プッシュ。

### 環境変数エラー
Vercel Dashboard → プロジェクト → Settings → Environment Variables で確認・追加。

### ログインできない
- ユーザー名: `食彩厨房やくも`（全角）
- パスワード: `admin123`
- ブラウザのコンソール（F12）でエラーを確認

---

## 📚 関連ドキュメント

- `README.md` - システム概要
- `VERCEL_デプロイ手順_日本語.md` - 詳細デプロイガイド
- `START_HERE.md` - クイックスタート
- `.env.example` - 環境変数テンプレート

---

## ✅ 完了チェックリスト

- [ ] GitHubリポジトリ作成
- [ ] コードをプッシュ
- [ ] Vercelでインポート
- [ ] 環境変数設定（`NODE_ENV`, `JWT_SECRET`, `VERCEL`）
- [ ] デプロイ成功
- [ ] URLにアクセス
- [ ] ログイン成功（`食彩厨房やくも` / `admin123`）
- [ ] 仕入先4社表示確認
- [ ] 発注5件表示確認
- [ ] 各機能の動作確認

---

## 🎉 デプロイ成功！

デプロイが完了したら、URLを確認してください：
```
https://order-management-system-yakumo-xxxxx.vercel.app
```

すべての機能が正常に動作することを確認してください。

---

**作成日**: 2025-01-20  
**システム名**: 受発注管理システム  
**対応会社**: 株式会社食彩厨房やくも  
**プロジェクトパス**: `/home/user/webapp/order-management-system-yakumo`
