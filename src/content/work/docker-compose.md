---
title: docker-compose Up Containers
publishDate: 2024-04-10 12:00:00
img: /assets/container.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/04/10
tags:
  - Docker Compose
  - Azure SQL Edge
  - Spring Boot
  - Vue
---

使用 docker-compose.yml 一次啟動多服務。

總共需要撰寫 docker-compose.yml、前端 Dockerfile、後端 Dockerfile、start-services.sh、資料庫 init-db.sql 五個檔案。

init-db.sql 是資料庫一啟動就想要插入的資料，直接在跟目錄建立一個 data 資料夾，然後把 sql 檔案放入。

#### Docketfile 撰寫

##### Spring Boot

```Dockerfile
# 使用 Maven 和 OpenJDK 11 的官方基礎映像來構建專案
FROM maven:3.8.4-openjdk-11-slim as build

# 複製專案文件到容器內的/app目錄
COPY . /app

# 設定工作目錄為/app
WORKDIR /app

# 使用 Maven 命令來構建專案
RUN mvn clean package -DskipTests

# 使用 OpenJDK 11 的輕量級基礎映像來運行構建好的應用
FROM openjdk:11-jre-slim

# 從構建階段複製構建好的應用到運行階段的容器內
COPY --from=build /app/target/discord-0.0.1-SNAPSHOT.war /discord.war

# 指定運行應用的命令
ENTRYPOINT ["java", "-jar", "/discord.war"]

# 定義容器內應用將會使用的端口
EXPOSE 8088

```

##### Vue

```Dockerfile
# Use the official Node.js image as a build stage
FROM node:lts AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Use the official Node.js image for the runtime stage
FROM node:lts

# Set the working directory in the container
WORKDIR /app

# Copy built assets from the build stage
COPY --from=build /app .

# Expose port 8090
EXPOSE 8090

# 启动开发服务器，直接使用 Vite 提供的命令行选项来禁用自动打开浏览器的功能。
CMD ["npx", "vite", "--host", "--port", "8090", "--no-open"]

```

#### docker-compose.yml

此檔案寫入前後端、資料庫的啟動容器設定。

```yml
version: "3.8"

services:
  sql_edge:
    image: mcr.microsoft.com/azure-sql-edge:latest
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "Wawi247525="
      MSSQL_COLLATION: "Chinese_Taiwan_Stroke_CI_AI"
      TZ: "Asia/Taipei"
    ports:
      - "1433:1433"
    volumes:
      - discord_db_data:/var/opt/mssql
    networks:
      - discord_network

  sqlcmd:
    image: mcr.microsoft.com/mssql-tools:latest
    command: >
      /bin/bash -c "
        sleep 20;
        /opt/mssql-tools/bin/sqlcmd -S sql_edge -U SA -P 'Wawi247525=' -d master -i /data/init-db.sql;
        "
    volumes:
      - ./data:/data
    networks:
      - discord_network

  discord_backend:
    build:
      context: ./discord-back-end
      dockerfile: Dockerfile
    ports:
      - "8088:8088"
    volumes:
      - java_logs:/var/opt/logs/discord
    networks:
      - discord_network

  discord_frontend:
    build:
      context: ./discord-front-end
      dockerfile: Dockerfile
    ports:
      - "8090:8090"
    networks:
      - discord_network

volumes:
  discord_db_data:
  java_logs:

networks:
  discord_network:
    name: discord_network
    external: true
```

寫完此檔案，在跟目錄執行：

```bash
docker-compose up
```

就可以一次啟動整個服務。但是因為是同時啟動，如果有資料庫要先完成，後端再插入初始資料的需求，就可能在後端插入資料時資料庫還沒建好。

#### start-services.sh

此為腳本，目的為決定 docker-coompose 中服務的執行順序。在每個服務啟動中間設定等待時間，以確保後啟動的服務可以運用先啟動的服務之功能。

```sh
#!/bin/bash

# 步驟 1: 啟動資料庫服務
echo "正在啟動資料庫服務..."
docker-compose up -d sql_edge

# 等待資料庫服務啟動
echo "正在等待資料庫服務啟動..."
sleep 5

# 步驟 2: 執行資料庫初始化腳本
echo "正在初始化資料庫..."
docker-compose up -d sqlcmd

# 等待資料庫初始化完成
echo "正在等待資料庫初始化完成..."
sleep 20

# 步驟 3: 禁用 Docker BuildKit，建構並啟動後端服務
echo "正在建構並啟動後端服務..."
docker-compose up -d discord_backend

# 步驟 4: 啟動前端服務
echo "正在啟動前端服務..."
docker-compose up -d discord_frontend

echo "所有服務已啟動完成。"

```
