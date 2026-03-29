#!/bin/bash
# 啟動所有 TY Multiverse 專案
# 使用方式: bash run-all-macos.sh

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== TY Multiverse 啟動腳本 (macOS) ==="
echo "BASE_DIR: $BASE_DIR"
echo ""

# 啟動順序：
# 1. Backend (其他服務依賴)
# 2. Gateway (依賴 Backend)
# 3. Consumer (獨立)
# 4. Maya-sawa (獨立)
# 5. Frontend (獨立)

# 函數：在新的 Terminal 窗口中執行命令
run_in_terminal() {
  local title="$1"
  local cmd="$2"
  osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$BASE_DIR' && $cmd"
end tell
EOF
}

# --- Backend ---
echo "[1/5] 啟動 Backend (port 8080)..."
run_in_terminal "ty-multiverse-backend" \
  "cd '$BASE_DIR/ty-multiverse-backend' && mvn spring-boot:run"

echo "      等待 Backend 啟動 (15s)..."
sleep 15

# --- Gateway ---
echo "[2/5] 啟動 Gateway (port 8082)..."
run_in_terminal "ty-multiverse-gateway" \
  "cd '$BASE_DIR/ty-multiverse-gateway' && mvn spring-boot:run"

# --- Consumer ---
echo "[3/5] 啟動 Consumer..."
run_in_terminal "ty-multiverse-consumer" \
  "cd '$BASE_DIR/ty-multiverse-consumer' && mvn spring-boot:run -Dspring-boot.run.profiles=local"

# --- Maya-sawa ---
echo "[4/5] 啟動 Maya-sawa (port 8000)..."
run_in_terminal "maya-sawa" \
  "cd '$BASE_DIR/maya-sawa' && poetry run uvicorn maya_sawa.main:app --reload --log-level debug --host 0.0.0.0 --port 8000"

# --- Frontend ---
echo "[5/5] 啟動 Frontend (port 4321)..."
run_in_terminal "ty-multiverse-frontend" \
  "cd '$BASE_DIR/ty-multiverse-frontend' && npm run dev"

echo ""
echo "=== 所有服務已啟動 ==="
echo ""
echo "服務端點："
echo "  Frontend  : http://localhost:4321/tymultiverse"
echo "  Backend   : http://localhost:8080/tymb/swagger-ui/index.html"
echo "  Gateway   : http://localhost:8082/actuator/health"
echo "  Maya-sawa : http://localhost:8000"
echo "  Consumer  : (background worker)"
