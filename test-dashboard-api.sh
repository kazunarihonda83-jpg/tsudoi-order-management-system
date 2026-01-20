#!/bin/bash
# ログインしてトークンを取得
TOKEN=$(curl -s -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"13湯麺集TSUDOI","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"
echo ""
echo "Testing Dashboard APIs:"
echo "======================="
echo ""

echo "1. GET /api/customers:"
curl -s http://localhost:5050/api/customers \
  -H "Authorization: Bearer $TOKEN" | jq -r 'if type=="array" then "✓ OK - " + (length|tostring) + " customers" else "✗ ERROR" end'

echo "2. GET /api/suppliers:"
curl -s http://localhost:5050/api/suppliers \
  -H "Authorization: Bearer $TOKEN" | jq -r 'if type=="array" then "✓ OK - " + (length|tostring) + " suppliers" else "✗ ERROR" end'

echo "3. GET /api/documents:"
curl -s http://localhost:5050/api/documents \
  -H "Authorization: Bearer $TOKEN" | jq -r 'if type=="array" then "✓ OK - " + (length|tostring) + " documents" else "✗ ERROR" end'

echo "4. GET /api/purchases/orders:"
curl -s http://localhost:5050/api/purchases/orders \
  -H "Authorization: Bearer $TOKEN" | jq -r 'if type=="array" then "✓ OK - " + (length|tostring) + " orders" else "✗ ERROR" end'

echo "5. GET /api/inventory:"
curl -s http://localhost:5050/api/inventory \
  -H "Authorization: Bearer $TOKEN" | jq -r 'if type=="array" then "✓ OK - " + (length|tostring) + " items" else "✗ ERROR" end'
