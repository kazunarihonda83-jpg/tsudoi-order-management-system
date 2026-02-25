#!/bin/bash

# つどいシステム 全データ復旧スクリプト
# Renderのデータベースがリセットされた時に実行

echo "========================================="
echo "🔄 つどいシステム データ復旧開始"
echo "========================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. 基本データ登録（顧客・在庫・発注・書類）
echo "📦 ステップ 1/2: 基本データ登録中..."
echo ""
"$SCRIPT_DIR/register-tsudoi-data.sh"

if [ $? -ne 0 ]; then
  echo "❌ 基本データ登録に失敗しました"
  exit 1
fi

echo ""
echo "✅ 基本データ登録完了"
echo ""

# 少し待機
sleep 2

# 2. 仕入先追加（8社）
echo "🏪 ステップ 2/2: 仕入先追加中..."
echo ""
"$SCRIPT_DIR/add-suppliers.sh"

if [ $? -ne 0 ]; then
  echo "❌ 仕入先追加に失敗しました"
  exit 1
fi

echo ""
echo "✅ 仕入先追加完了"
echo ""

# 最終確認
API_URL="https://tsudoi-backend.onrender.com/api"
USERNAME="13湯麺集TSUDOI"
PASSWORD="admin123"

echo "🔍 最終データ確認中..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログインに失敗しました"
  exit 1
fi

CUSTOMERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/customers" | grep -o '"id":' | wc -l)
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/inventory" | grep -o '"id":' | wc -l)
SUPPLIERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/suppliers" | grep -o '"id":' | wc -l)
ORDERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/purchases/orders" | grep -o '"id":' | wc -l)
DOCUMENTS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/documents" | grep -o '"id":' | wc -l)

TOTAL=$((CUSTOMERS + INVENTORY + SUPPLIERS + ORDERS + DOCUMENTS))

echo "========================================="
echo "✅ 全データ復旧完了！"
echo "========================================="
echo ""
echo "📊 登録データ件数:"
echo "  ✓ 顧客:     $CUSTOMERS 件"
echo "  ✓ 在庫:     $INVENTORY 品目"
echo "  ✓ 仕入先:   $SUPPLIERS 社"
echo "  ✓ 発注:     $ORDERS 件"
echo "  ✓ 書類:     $DOCUMENTS 件"
echo ""
echo "📦 合計: $TOTAL 件"
echo ""
echo "========================================="
echo "🌐 システムアクセス"
echo "========================================="
echo "URL: https://tsudoi-order-management-system2.vercel.app"
echo ""
echo "👤 ログイン情報:"
echo "  ユーザー名: $USERNAME"
echo "  パスワード: $PASSWORD"
echo "========================================="
echo ""
echo "✅ データ復旧が完了しました！"
echo "   システムにアクセスして確認してください。"
echo "========================================="

