FROM node:20-alpine

# 安裝 FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# 複製 package files（使用前端的 package.json）
COPY package*.json ./

# 安裝依賴（生產環境）
RUN npm ci --only=production

# 複製 video service 源代碼
COPY video-service ./video-service

# 建立必要目錄
RUN mkdir -p /app/video-service/temp /app/video-service/output

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動 video service
CMD ["node", "video-service/src/index.js"]
