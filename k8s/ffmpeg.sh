#!/bin/bash
# Video Merge Service - 一鍵部署腳本
# 部署 FFmpeg 影片合併服務到 Kubernetes

set -e

echo "========================================="
echo "🎬 TY Multiverse Video Merge Service"
echo "========================================="
echo ""

# 檢查 kubectl 是否可用
if ! command -v kubectl &> /dev/null; then
    echo "❌ 錯誤: kubectl 未安裝或不在 PATH 中"
    exit 1
fi

echo "📦 正在部署 Video Merge Service..."
echo ""

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: video-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-merge-service
  namespace: video-service
  labels:
    app: video-merge-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: video-merge-service
  template:
    metadata:
      labels:
        app: video-merge-service
    spec:
      containers:
      - name: video-merge
        image: your-registry/video-merge-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: PORT
          value: "3000"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        volumeMounts:
        - name: temp-storage
          mountPath: /app/temp
        - name: output-storage
          mountPath: /app/output
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: temp-storage
        emptyDir:
          sizeLimit: 5Gi
      - name: output-storage
        emptyDir:
          sizeLimit: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: video-merge-service
  namespace: video-service
  labels:
    app: video-merge-service
spec:
  selector:
    app: video-merge-service
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: video-merge-ingress
  namespace: video-service
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  rules:
  - host: video.tatdvsonorth.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: video-merge-service
            port:
              number: 80
EOF

echo ""
echo "✅ Video Merge Service 已部署到 video-service namespace"
echo ""
echo "📝 常用指令:"
echo "  檢查 Pods: kubectl get pods -n video-service"
echo "  查看日誌: kubectl logs -f deployment/video-merge-service -n video-service"
echo "  檢查服務: kubectl get svc -n video-service"
echo "  檢查 Ingress: kubectl get ingress -n video-service"
echo ""
echo "🌐 服務 URL: https://video.tatdvsonorth.com"
echo ""
echo "⏳ 等待 Pods 就緒..."
kubectl wait --for=condition=ready pod -l app=video-merge-service -n video-service --timeout=120s || echo "⚠️ Pods 尚未就緒，請手動檢查"
echo ""
echo "✨ 部署完成！"
