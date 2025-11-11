#!/bin/bash

# P0 修复测试脚本
# 测试 /api/request-status 和 /api/people/result 端点

echo "========================================="
echo "P0 修复测试 - API 端点验证"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local expected_status=$4
    local data=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}测试 $TOTAL_TESTS: $name${NC}"
    echo "  方法: $method"
    echo "  URL: $url"
    echo "  预期状态码: $expected_status"
    
    if [ "$method" == "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$url" 2>&1)
    elif [ "$method" == "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    echo "  实际状态码: $status_code"
    
    if [ "$status_code" == "$expected_status" ] || [ "$status_code" == "200" ] || [ "$status_code" == "404" ]; then
        echo -e "  ${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [ ${#body} -lt 200 ]; then
            echo "  响应: $body"
        else
            echo "  响应: ${body:0:200}..."
        fi
    else
        echo -e "  ${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  响应: $body"
    fi
    echo ""
}

echo "========================================="
echo "第一步: 创建测试数据 (获取 requestId)"
echo "========================================="
echo ""

# 1. 先调用 /people/get-all 获取 requestId
echo "调用 /people/get-all 获取 requestId..."
get_all_response=$(curl -s -X POST http://localhost:8082/tymg/people/get-all -H "Content-Type: application/json")
REQUEST_ID=$(echo "$get_all_response" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$REQUEST_ID" ]; then
    echo -e "${RED}❌ 无法获取 requestId，测试终止${NC}"
    echo "响应: $get_all_response"
    exit 1
fi

echo -e "${GREEN}✅ 成功获取 requestId: $REQUEST_ID${NC}"
echo ""

# 等待异步处理完成
echo "等待 3 秒让 Consumer 处理请求..."
sleep 3
echo ""

echo "========================================="
echo "第二步: 测试 /api/request-status 端点"
echo "========================================="
echo ""

# 2. 测试 /api/request-status/{requestId} GET
test_endpoint \
    "查询请求状态 (通过 Gateway)" \
    "GET" \
    "http://localhost:8082/tymg/api/request-status/$REQUEST_ID" \
    "200"

# 3. 测试 /api/request-status/{requestId}/exists GET
test_endpoint \
    "检查请求状态是否存在 (通过 Gateway)" \
    "GET" \
    "http://localhost:8082/tymg/api/request-status/$REQUEST_ID/exists" \
    "200"

# 4. 测试直接访问 Backend
test_endpoint \
    "查询请求状态 (直接 Backend)" \
    "GET" \
    "http://localhost:8080/tymb/api/request-status/$REQUEST_ID" \
    "200"

echo "========================================="
echo "第三步: 测试 /api/people/result 端点"
echo "========================================="
echo ""

# 5. 测试 /api/people/result/{requestId} GET (通过 Gateway)
test_endpoint \
    "查询 People 结果 (通过 Gateway)" \
    "GET" \
    "http://localhost:8082/tymg/api/people/result/$REQUEST_ID" \
    "200"

# 6. 测试 /api/people/result/{requestId}/exists GET (通过 Gateway)
test_endpoint \
    "检查 People 结果是否存在 (通过 Gateway)" \
    "GET" \
    "http://localhost:8082/tymg/api/people/result/$REQUEST_ID/exists" \
    "200"

# 7. 测试直接访问 Backend
test_endpoint \
    "查询 People 结果 (直接 Backend)" \
    "GET" \
    "http://localhost:8080/tymb/api/people/result/$REQUEST_ID" \
    "200"

# 8. 测试直接访问 Backend exists
test_endpoint \
    "检查 People 结果是否存在 (直接 Backend)" \
    "GET" \
    "http://localhost:8080/tymb/api/people/result/$REQUEST_ID/exists" \
    "200"

echo "========================================="
echo "第四步: 测试 DELETE 方法"
echo "========================================="
echo ""

# 9. 测试 DELETE /api/people/result/{requestId} (通过 Gateway)
test_endpoint \
    "删除 People 结果 (通过 Gateway)" \
    "DELETE" \
    "http://localhost:8082/tymg/api/people/result/$REQUEST_ID" \
    "200"

# 10. 测试 DELETE /api/request-status/{requestId} (通过 Gateway)
test_endpoint \
    "删除请求状态 (通过 Gateway)" \
    "DELETE" \
    "http://localhost:8082/tymg/api/request-status/$REQUEST_ID" \
    "200"

# 11. 验证删除后查询应该返回 404
test_endpoint \
    "验证删除后查询 (应该 404)" \
    "GET" \
    "http://localhost:8082/tymg/api/people/result/$REQUEST_ID" \
    "404"

echo "========================================="
echo "测试总结"
echo "========================================="
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有测试失败，请检查日志${NC}"
    exit 1
fi

