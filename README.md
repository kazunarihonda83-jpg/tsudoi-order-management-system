# 受発注管理システム - 13湯麺　集TSUDOI

ラーメン店向けの受発注管理システム（最終更新: 2026-01-20）

## 🏢 会社情報

- **店舗名**: 13湯麺　集TSUDOI
- **業種**: ラーメン店
- **住所**: 千葉県鎌ヶ谷市道野辺本町2-22-1
- **電話番号**: 090-9383-8430
- **従業員数**: 2人
- **HP**: https://tabelog.com/chiba/A1203/A120303/12061712/

## 🔐 ログイン情報

- **ユーザー名**: `13湯麺集TSUDOI`
- **パスワード**: `admin123`

## 📦 主な仕入先

1. **千葉食材センター** - 麺類（中華麺、自家製麺）
2. **関東青果市場** - 青果（ネギ、もやし、メンマ、白菜、ニラ）
3. **東京食肉卸** - 食肉（豚バラ、チャーシュー用豚肉、鶏ガラ）
4. **調味料専門店** - 調味料（醤油、味噌、塩、香辛料、ラー油）

## 📊 機能

- ✅ ダッシュボード（売上・費用・利益の可視化）
- ✅ 顧客管理
- ✅ 伝票管理（見積書・納品書・請求書）
- ✅ 仕入先管理（銀行情報含む）
- ✅ 発注管理
- ✅ **在庫管理** 🆕
  - 在庫の登録・編集・削除
  - 入庫・出庫・在庫調整の記録
  - 在庫不足アラート（発注点設定）
  - 賞味期限アラート（7日前通知）
  - カテゴリ・仕入先別フィルター
  - 在庫統計（総在庫額、在庫不足数など）
  - 保管場所管理
  - アラート削除機能（個別・一括）
- ✅ **領収書OCR機能** 🆕
  - 領収書の写真から自動的にデータ抽出
  - 店舗名、日付、金額、品目を自動認識
  - 手動修正・確認機能
  - 経費管理への自動反映
- ✅ 会計管理（仕訳・試算表・損益計算書・貸借対照表）
- ✅ CSVエクスポート

## 🚀 デプロイ

### Vercelへのワンクリックデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkazunarihonda83-jpg%2Forder-management-system-yakumo&env=NODE_ENV,JWT_SECRET,VERCEL&envDescription=Required%20environment%20variables%20for%20deployment&envLink=https%3A%2F%2Fgithub.com%2Fkazunarihonda83-jpg%2Forder-management-system-yakumo%2Fblob%2Fmaster%2FVERCEL_%25E3%2583%2587%25E3%2583%2597%25E3%2583%25AD%25E3%2582%25A4_%25E7%25B0%25A1%25E5%258D%2598%25E6%2589%258B%25E9%25A0%2586.md)

または、手動でデプロイ：

### 手動デプロイ手順

1. **https://vercel.com/new** にアクセス
2. GitHubアカウントでログイン
3. **order-management-system-yakumo** リポジトリをインポート
4. 環境変数を設定：
   - `NODE_ENV=production`
   - `JWT_SECRET=yakumo-secret-key-2025-production-secure`
   - `VERCEL=1`
5. **Deploy** をクリック

詳細な手順は [VERCEL_デプロイ_簡単手順.md](./VERCEL_デプロイ_簡単手順.md) を参照してください。

## 💻 開発環境

### ローカル起動

```bash
# 依存関係のインストール
npm install

# フロントエンド開発サーバー起動
npm run dev

# バックエンドサーバー起動
npm run server
```

### ビルド

```bash
npm run build
```

## 🛠️ 技術スタック

- **フロントエンド**: React 18.3 + Vite
- **バックエンド**: Node.js + Express.js
- **データベース**: SQLite3
- **認証**: JWT
- **デプロイ**: Vercel Serverless Functions

## 📝 サンプルデータ

初回起動時に以下のサンプルデータが自動的に作成されます：

- 管理者ユーザー: 食彩厨房やくも
- 仕入先: 4社（鮮魚、酒類、青果、食肉）
- 発注データ: 5件（本マグロ、日本酒、野菜、ラム肉など）
- **在庫データ: 16品目（鮮魚4、酒類4、野菜4、食肉4）** 🆕
- **在庫アラート: 低在庫・賞味期限警告** 🆕

## ⚠️ 注意事項

### データベースについて

Vercel環境では、SQLiteを`/tmp`ディレクトリに保存しています。
`/tmp`のデータは永続化されないため、本番運用では以下を推奨：

- **Vercel Postgres** (推奨)
- **Supabase**
- **PlanetScale**
- **Neon**

### セキュリティ

- `JWT_SECRET`は必ず強力なランダム文字列に変更してください
- 本番環境では管理者パスワードを変更してください

## 📞 サポート

システムに関するお問い合わせは、開発元までご連絡ください。

---

**作成日**: 2025-01-20  
**バージョン**: 1.0.0  
**対応会社**: 株式会社食彩厨房やくも
