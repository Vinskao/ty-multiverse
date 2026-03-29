#!/bin/bash
# 啟動所有 TY Multiverse 專案
# 使用方式: bash run-all-windows.sh

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 將 Unix 路徑轉換為 Windows 路徑（支援 /mnt/x/ 和 /x/ 兩種格式）
to_win_path() {
  echo "$1" | sed 's|^/mnt/\([a-zA-Z]\)/|\1:/|' | sed 's|^/\([a-zA-Z]\)/|\1:/|' | sed 's|/|\\|g'
}

echo "=== TY Multiverse 啟動腳本 ==="
echo "BASE_DIR: $BASE_DIR"
echo ""

# 啟動順序：
# 1. Backend (其他服務依賴)
# 2. Gateway (依賴 Backend)
# 3. Consumer (獨立)
# 4. Maya-sawa (獨立)
# 5. Frontend (獨立)

# --- Backend ---
echo "[1/5] 啟動 Backend (port 8080)..."
WIN_PATH="$(to_win_path "$BASE_DIR/ty-multiverse-backend")"
cmd.exe /c start "ty-multiverse-backend" cmd /k "cd /d \"$WIN_PATH\" && mvn spring-boot:run"

echo "      等待 Backend 啟動 (15s)..."
sleep 15

# --- Gateway ---
echo "[2/5] 啟動 Gateway (port 8082)..."
WIN_PATH="$(to_win_path "$BASE_DIR/ty-multiverse-gateway")"
cmd.exe /c start "ty-multiverse-gateway" cmd /k "cd /d \"$WIN_PATH\" && mvn spring-boot:run"

# --- Consumer ---
echo "[3/5] 啟動 Consumer..."
WIN_PATH="$(to_win_path "$BASE_DIR/ty-multiverse-consumer")"
cmd.exe /c start "ty-multiverse-consumer" cmd /k "cd /d \"$WIN_PATH\" && mvn spring-boot:run -Dspring-boot.run.profiles=local"

# --- Maya-sawa ---
echo "[4/5] 啟動 Maya-sawa (port 8000)..."
WIN_PATH="$(to_win_path "$BASE_DIR/maya-sawa")"
cmd.exe /c start "maya-sawa" cmd /k "cd /d \"$WIN_PATH\" && poetry run uvicorn maya_sawa.main:app --reload --log-level debug --host 0.0.0.0 --port 8000"

# --- Frontend ---
echo "[5/5] 啟動 Frontend (port 4321)..."
WIN_PATH="$(to_win_path "$BASE_DIR/ty-multiverse-frontend")"
cmd.exe /c start "ty-multiverse-frontend" cmd /k "cd /d \"$WIN_PATH\" && npm run dev"

echo ""
echo "=== 所有服務已啟動 ==="
echo ""
echo "服務端點："
echo "  Frontend  : http://localhost:4321/tymultiverse"
echo "  Backend   : http://localhost:8080/tymb/swagger-ui/index.html"
echo "  Gateway   : http://localhost:8082/actuator/health"
echo "  Maya-sawa : http://localhost:8000"
echo "  Consumer  : (background worker)"
