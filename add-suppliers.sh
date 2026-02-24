#!/bin/bash

# つどいシステム 仕入先追加スクリプト
API_URL="https://tsudoi-backend.onrender.com/api"
USERNAME="13湯麺集TSUDOI"
PASSWORD="admin123"

echo "========================================="
echo "つどいシステム 仕入先追加"
echo "========================================="

# ログイン
echo "🔐 ログイン中..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi

echo "✅ ログイン成功"
echo ""

# 仕入先データ
declare -a SUPPLIERS=(
  "業務スーパー東初富店|047-404-2831|〒270-0034 千葉県松戸市新松戸3-2-1|食材・調味料|gyomu-higashihatsutomi@example.com|山田太郎|毎週月・水・金 9:00-12:00"
  "さかいストアー|047-443-5833|〒270-0034 千葉県松戸市新松戸|食材|sakai-store@example.com|酒井花子|火・木 10:00-15:00"
  "ビッグボス|047-443-5008|〒270-0034 千葉県松戸市新松戸|食材・飲料|bigboss@example.com|大場一郎|毎日 8:00-18:00"
  "ウエルシア松戸五香店|047-311-8011|〒270-2261 千葉県松戸市常盤平5-18-1|日用品・消耗品|welcia-goko@example.com|井上美咲|平日 9:00-20:00"
  "佐藤製麺|047-367-3577|〒270-0034 千葉県松戸市新松戸|麺類専門|sato-seimen@example.com|佐藤健太|月～土 8:00-17:00"
  "長谷川畜産株式会社|047-386-1568|〒270-0034 千葉県松戸市新松戸|精肉専門|hasegawa-chikusan@example.com|長谷川誠|月～金 7:00-16:00"
  "株式会社常陽牧場|0297-624-598|〒300-2706 茨城県常総市新石下|畜産・乳製品|joyo-farm@example.com|田村和夫|月～土 6:00-18:00"
  "株式会社松戸萬味|047-366-8430|〒270-0034 千葉県松戸市新松戸|調味料・加工品|matsudo-manmi@example.com|松本さくら|月～金 9:00-17:00"
)

SUCCESS=0
FAILED=0

echo "📦 仕入先登録開始..."
echo ""

for supplier in "${SUPPLIERS[@]}"; do
  IFS='|' read -r name phone address category email contact delivery_schedule <<< "$supplier"
  
  echo "登録中: $name"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/suppliers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"supplier_type\": \"企業\",
      \"name\": \"$name\",
      \"postal_code\": \"270-0034\",
      \"address\": \"$address\",
      \"phone\": \"$phone\",
      \"email\": \"$email\",
      \"payment_terms\": 30,
      \"bank_name\": \"みずほ銀行\",
      \"branch_name\": \"松戸支店\",
      \"account_type\": \"普通\",
      \"account_number\": \"1234567\",
      \"account_holder\": \"$contact\",
      \"notes\": \"取引条件: $delivery_schedule\"
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  ✅ 成功"
    ((SUCCESS++))
  else
    echo "  ❌ 失敗 (HTTP $HTTP_CODE)"
    ((FAILED++))
  fi
  
  sleep 0.5
done

echo ""
echo "========================================="
echo "📊 仕入先登録結果"
echo "========================================="
echo "✅ 成功: $SUCCESS 件"
echo "❌ 失敗: $FAILED 件"
echo "📦 合計: $((SUCCESS + FAILED)) 件"
echo ""

# 最終確認
echo "🔍 現在の仕入先データ確認..."
FINAL_CHECK=$(curl -s -X GET "$API_URL/suppliers" \
  -H "Authorization: Bearer $TOKEN")

SUPPLIER_COUNT=$(echo $FINAL_CHECK | grep -o '"id":' | wc -l)
echo "📊 仕入先総数: $SUPPLIER_COUNT 社"
echo ""
echo "========================================="
echo "システムアクセス情報"
echo "========================================="
echo "🌐 URL: https://tsudoi-order-management-system2.vercel.app"
echo "👤 ユーザー名: $USERNAME"
echo "🔑 パスワード: $PASSWORD"
echo "========================================="
