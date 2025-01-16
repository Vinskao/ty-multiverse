## 啟動：
```bash
docker build --no-cache -t papakao/ty-multiverse-frontend .
docker run -p 4321:4321 ty-multiverse-frontend

node ./dist/server/entry.mjs
docker build -t papakao/ty-multiverse-frontend:latest .
docker push papakao/ty-multiverse-frontend:latest
```