# 本地部署 / 运行

在**本机**把整套系统跑起来的步骤：中间件用 Docker，后端跑 jar（或 IDEA），前端用 Vite。

```
浏览器 http://localhost:5173   中文前端 ┐
浏览器 http://localhost:5174   英文前端 ┤ Vite dev server（代理 /admin、/user、/ws）
                                       ↓
前端 ──→ http://localhost:8080  后端 jar（默认 dev 配置）
后端 ──→ 127.0.0.1:3307  MySQL ┐
     ──→ 127.0.0.1:6379  Redis ├─ Docker 容器
     ──→ 127.0.0.1:9000  MinIO ┘
```

> 服务器部署（nginx + systemd）见 [`deploy/`](deploy/) 目录下的两份文档，本文只讲本地。

---

## 0. 前置条件

| 需要 | 版本 | 验证 |
| --- | --- | --- |
| JDK | 17 | `java -version` |
| Maven | 3.8+ | `mvn -v` |
| Node.js | 18+ | `node -v` |
| Docker Desktop | 任意较新版本 | `docker version` |

## 1. 起中间件（Docker）

容器已经建好了的话，直接启动：

```powershell
docker start mysql redis minio
docker ps                 # 三个都是 Up
```

要从零创建（或容器被删了），注意 **MySQL 映射到 3307**、数据目录挂宿主机真实路径
（MySQL 特意用 3307 避开本机其他服务；数据挂宿主机目录，才不会在 Docker Desktop 重启后丢）：

```powershell
docker run -d --name mysql -p 3307:3306 `
  -e MYSQL_ROOT_PASSWORD=123 -e MYSQL_DATABASE=sky_take_out `
  -v F:/project/springcloud/root/mysql/data:/var/lib/mysql `
  --restart unless-stopped mysql:8.0 `
  --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci --default-time-zone=+08:00

docker run -d --name redis -p 6379:6379 `
  -v F:/project/springcloud/root/redis/data:/data `
  --restart unless-stopped redis:7 redis-server --appendonly yes

docker run -d --name minio -p 9000:9000 -p 9001:9001 `
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin `
  -v F:/project/springcloud/root/minio/data:/data `
  --restart unless-stopped minio/minio:RELEASE.2025-04-22T22-12-26Z server /data --console-address ":9001"
```

| 中间件 | 地址 | 账号 |
| --- | --- | --- |
| MySQL | `127.0.0.1:3307`（**不是 3306**） | `root` / `123` |
| Redis | `127.0.0.1:6379` | 无密码 |
| MinIO API | `127.0.0.1:9000` | `minioadmin` / `minioadmin` |
| MinIO 控制台 | http://localhost:9001 | 同上 |

**检查点**：

```powershell
docker exec -i mysql mysql -uroot -p123 -e "select version();"
docker exec -i redis redis-cli ping                                              # PONG
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:9000/minio/health/live   # 200
```

## 2. 导数据库

数据快照在 `sky-server/src/main/resources/db/sky_take_out_full.sql`（含 24 个菜品 + 分类 + 套餐 + 员工）。

```powershell
# ⚠️ PowerShell 不支持 "<" 输入重定向，用 cmd /c 包一层
cmd /c "docker exec -i mysql mysql -uroot -p123 -e ""create database if not exists sky_take_out default charset utf8mb4;"""
cmd /c "docker exec -i mysql mysql -uroot -p123 sky_take_out < sky-server\src\main\resources\db\sky_take_out_full.sql"
cmd /c "docker exec -i mysql mysql -uroot -p123 -e ""select count(*) from sky_take_out.dish;"""
# 检查点：24
```

不想用命令行也可以拿 Navicat / Workbench 连 `127.0.0.1:3307` 导入。

## 3. 起后端（8080）

**本机不用改任何配置** —— `application-dev.yml` 里已经写好了 MySQL 3307 / Redis 6379 /
MinIO `localhost:9000`，而 `application.yml` 里默认就是 `active: dev`。

方式 A：IDEA 直接跑 `SkyApplication`（推荐，改代码能热重启）。

方式 B：命令行跑 jar：

```powershell
mvn -o clean package -DskipTests
java -jar sky-server\target\sky-server-1.0-SNAPSHOT.jar
```

> 直接 `java -jar` 走的就是 dev 配置，**不需要**加 `--spring.profiles.active=prod`（那是服务器上的用法）。
>
> ⚠️ 打包前必须先停掉正在运行的后端，否则 Windows 会锁住 jar，`clean` 报
> `Failed to delete ...sky-server-1.0-SNAPSHOT.jar`。

**检查点**：

```powershell
curl.exe -s http://127.0.0.1:8080/user/shop/status
# {"code":1,"msg":null,"data":1}   （data 为 0 = 店铺处于"已打烊"，管理端切换即可）
```

接口文档：<http://localhost:8080/doc.html>

## 4. 起前端（5173 中文 / 5174 英文）

```powershell
cd sky-web
npm ci            # 只有首次或依赖变更时需要
npm run dev       # 中文 → http://localhost:5173
npm run dev:en    # 英文 → http://localhost:5174   （另开一个窗口）
```

Vite 会把 `/admin`、`/user`、`/ws` 代理到 `http://localhost:8080`（`.env` 里的
`VITE_API_TARGET` / `VITE_WS_TARGET`，默认就是本机）。想让它连**远程后端**调试，
把这两行临时改成服务器地址即可（改完要重启 dev server）。

**想验证打包产物**（更接近线上）：

```powershell
npm run build && npm run preview        # 中文 → 5173
npm run build:en && npm run preview:en  # 英文 → 5174
```

> ⚠️ `npm ci` 会清空 `node_modules`。此时若 Vite dev server 或 IDEA 正占着
> `esbuild.exe`，Windows 会报 `EPERM: operation not permitted, unlink ...esbuild.exe`。
> 先把 dev server 停掉；或干脆跳过 `npm ci`，直接 `npm run build`（本地已有依赖时够用）。

## 5. 访问地址

| 端 | 地址 | 账号 |
| --- | --- | --- |
| 中文 · 客户端 | http://localhost:5173/ | C 端自行注册 |
| 中文 · 管理端 | http://localhost:5173/admin/login | `admin` / `123456` |
| 英文 · 客户端 | http://localhost:5174/ | 同上 |
| 英文 · 管理端 | http://localhost:5174/admin/login | `admin` / `123456` |
| MinIO 控制台 | http://localhost:9001 | `minioadmin` / `minioadmin` |
| 接口文档 | http://localhost:8080/doc.html | — |

## 端口总表

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| 后端 jar | 8080 | `server.port` |
| 中文前端 | 5173 | `VITE_PORT`（`.env`） |
| 英文前端 | 5174 | `VITE_PORT`（`.env.en`） |
| MySQL | **3307** | 容器 3306 映射出来的，避开本机别的项目 |
| Redis | 6379 | |
| MinIO | 9000 / 9001 | API / 控制台 |

---

服务器部署（nginx 双站 + systemd 自启 + Docker 中间件）：
[`deploy/linux-docker/README.md`](deploy/linux-docker/README.md)（Linux）、
[`deploy/README.md`](deploy/README.md)（Windows Server）。
