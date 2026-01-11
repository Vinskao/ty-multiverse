# Video Merge Service

Node.js 服務，使用 FFmpeg 處理影片合併與去背。已整合至 `ty-multiverse-frontend` 專案中。

## 📁 目錄結構

```
ty-multiverse-frontend/
├── video-service/
│   ├── src/
│   │   ├── index.js          # Express 伺服器
│   │   ├── routes/
│   │   │   └── video.js      # 影片 API 路由
│   │   ├── services/
│   │   │   ├── ffmpeg.js     # FFmpeg 處理邏輯
│   │   │   └── download.js   # 影片下載
│   │   └── utils/
│   │       └── color.js      # 背景色偵測
│   ├── temp/                 # 暫存目錄
│   ├── output/               # 輸出目錄
│   ├── Dockerfile            # 容器化配置
│   └── README.md
├── k8s/
│   └── ffmpeg.sh             # K8s 部署腳本
└── package.json              # 包含 video service 依賴
```

## 🚀 本地開發

### 1. 安裝 FFmpeg

請參考前端專案根目錄的 `AGENTS.md` 中的 FFmpeg 安裝指南。

### 2. 安裝依賴

```bash
# 在前端專案根目錄
npm install
```

### 3. 啟動 Video Service

```bash
# 在前端專案根目錄
npm run video-service

# 或使用 nodemon 自動重啟
npm run video-service:dev
```

服務將在 `http://localhost:3000` 運行。

### 4. 測試 API

```bash
# Health check
curl http://localhost:3000/health

# 測試影片合併
curl -X POST http://localhost:3000/api/videos/merge \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrls": [
      "http://peoplesystem.tatdvsonorth.com/images/people/Lily.mp4",
      "http://peoplesystem.tatdvsonorth.com/images/people/Yuki1.mp4",
      "http://peoplesystem.tatdvsonorth.com/images/people/Anna.mp4",
      "http://peoplesystem.tatdvsonorth.com/images/people/Maria2.mp4"
    ],
    "outputFormat": "webm",
    "removeBackground": true
  }'
```

## 🐳 Docker 部署

```bash
# 在前端專案根目錄，使用 video-service 的 Dockerfile
docker build -f video-service/Dockerfile -t your-registry/video-merge-service:latest .
docker push your-registry/video-merge-service:latest
```

## ☸️ Kubernetes 部署

```bash
# 使用前端專案的一鍵部署腳本
cd k8s
chmod +x ffmpeg.sh
./ffmpeg.sh
```

## 📡 API 端點

### POST /api/videos/merge
合併 4 個影片

**Request:**
```json
{
  "videoUrls": ["url1", "url2", "url3", "url4"],
  "outputFormat": "webm",
  "removeBackground": true
}
```

**Response:**
```json
{
  "status": "success",
  "outputUrl": "/api/videos/download/1736606000000.webm",
  "duration": 0,
  "fileSize": 2048576
}
```

### GET /api/videos/download/:filename
下載合併後的影片

### DELETE /api/videos/cleanup/:filename
刪除已處理的影片檔案

## 🔧 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| PORT | 3000 | 服務端口 |
| NODE_ENV | development | 環境模式 |

## 📝 注意事項

- Video Service 需要本地安裝 FFmpeg
- Dev 環境：在 `localhost:3000` 運行
- Prod 環境：部署為獨立的 K8s Pod
- 前端透過 `PUBLIC_VIDEO_SERVICE_URL` 環境變數連接服務

## 🔗 相關文件

- 前端 AGENTS.md - FFmpeg 安裝指南
- k8s/ffmpeg.sh - K8s 部署腳本
- .env.development - Dev 環境配置
- .env.production - Prod 環境配置
