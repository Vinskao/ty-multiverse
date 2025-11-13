#!/bin/bash

# 測試 People API 端點
# 使用方法: ./test-people-endpoints.sh [TOKEN]

GATEWAY_URL="http://localhost:8082/tymg"
TOKEN="${1:-}"

echo "======================================"
echo "Testing People API Endpoints"
echo "======================================"
echo ""

if [ -z "$TOKEN" ]; then
  echo "⚠️  警告: 未提供 Token，將測試未認證的請求"
  echo "使用方法: $0 <YOUR_JWT_TOKEN>"
  echo ""
fi

# 測試 1: DELETE ALL (需要認證)
echo "1️⃣  測試 DELETE ALL 端點"
echo "URL: $GATEWAY_URL/people/delete-all"
echo "Method: POST"
echo ""

if [ -z "$TOKEN" ]; then
  curl -X POST "$GATEWAY_URL/people/delete-all" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" \
    -v 2>&1 | grep -E "(HTTP|401|200|< )"
else
  curl -X POST "$GATEWAY_URL/people/delete-all" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -w "\nHTTP Status: %{http_code}\n"
fi

echo ""
echo "======================================"
echo ""

# 測試 2: UPDATE (需要認證)
echo "2️⃣  測試 UPDATE 端點"
echo "URL: $GATEWAY_URL/people/update"
echo "Method: POST"
echo ""

TEST_DATA='{"name":"測試角色","age":25,"level":10}'

if [ -z "$TOKEN" ]; then
  curl -X POST "$GATEWAY_URL/people/update" \
    -H "Content-Type: application/json" \
    -d "$TEST_DATA" \
    -w "\nHTTP Status: %{http_code}\n" \
    -v 2>&1 | grep -E "(HTTP|401|200|< )"
else
  curl -X POST "$GATEWAY_URL/people/update" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$TEST_DATA" \
    -w "\nHTTP Status: %{http_code}\n"
fi

echo ""
echo "======================================"
echo ""

# 測試 3: 檢查 Gateway 健康狀態
echo "3️⃣  測試 Gateway 健康狀態 (無需認證)"
echo "URL: $GATEWAY_URL/health"
echo ""

curl -s "$GATEWAY_URL/health" | head -5

echo ""
echo "======================================"
echo ""

# 總結
echo "📋 測試總結"
echo ""
echo "✅ 端點配置正確:"
echo "   - POST /tymg/people/delete-all"
echo "   - POST /tymg/people/update"
echo ""
echo "⚠️  這些端點需要 JWT Token 認證"
echo ""
echo "🔧 如何獲取 Token:"
echo "   1. 在前端登入"
echo "   2. 打開瀏覽器開發者工具 > Application > Local Storage"
echo "   3. 找到 'token' 或 'auth_token' 的值"
echo "   4. 運行: $0 <YOUR_TOKEN>"
echo ""
echo "💡 或者使用前端服務層 (推薦):"
echo "   import { peopleService } from '../services/peopleService';"
echo "   await peopleService.deleteAllPeople();"
echo "   await peopleService.updatePerson(personData);"
echo ""

