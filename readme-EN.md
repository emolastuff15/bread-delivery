# Local Deployment / Running

How to bring the whole system up on **your own machine**: middleware in Docker, the backend as a
jar (or from IDEA), the frontend with Vite.

```
browser http://localhost:5173   Chinese frontend ┐
browser http://localhost:5174   English frontend ┤ Vite dev server (proxies /admin, /user, /ws)
                                                 ↓
frontend ──→ http://localhost:8080  backend jar (dev config by default)
backend  ──→ 127.0.0.1:3307  MySQL ┐
         ──→ 127.0.0.1:6379  Redis ├─ Docker containers
         ──→ 127.0.0.1:9000  MinIO ┘
```

> Server deployment (nginx + systemd) is documented under [`deploy/`](deploy/).
> This file covers local only.

---

## 0. Prerequisites

| Need | Version | Check |
| --- | --- | --- |
| JDK | 17 | `java -version` |
| Maven | 3.8+ | `mvn -v` |
| Node.js | 18+ | `node -v` |
| Docker Desktop | any recent version | `docker version` |

## 1. Start the middleware (Docker)

If the containers already exist, just start them:

```powershell
docker start mysql redis minio
docker ps                 # all three should be Up
```

To create them from scratch (or after deleting them) — note that **MySQL is published on 3307**
and every data directory is bind-mounted to a real host path
(3307 keeps it clear of other services on your machine; bind-mounting to the host is what prevents
data loss when Docker Desktop restarts):

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

| Middleware | Address | Credentials |
| --- | --- | --- |
| MySQL | `127.0.0.1:3307` (**not 3306**) | `root` / `123` |
| Redis | `127.0.0.1:6379` | no password |
| MinIO API | `127.0.0.1:9000` | `minioadmin` / `minioadmin` |
| MinIO console | http://localhost:9001 | same as above |

**Checkpoints**:

```powershell
docker exec -i mysql mysql -uroot -p123 -e "select version();"
docker exec -i redis redis-cli ping                                              # PONG
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:9000/minio/health/live   # 200
```

## 2. Import the database

The snapshot is at `sky-server/src/main/resources/db/sky_take_out_full.sql`
(24 dishes + categories + setmeals + employees).

```powershell
# ⚠️ PowerShell does not support "<" input redirection — wrap the command in cmd /c
cmd /c "docker exec -i mysql mysql -uroot -p123 -e ""create database if not exists sky_take_out default charset utf8mb4;"""
cmd /c "docker exec -i mysql mysql -uroot -p123 sky_take_out < sky-server\src\main\resources\db\sky_take_out_full.sql"
cmd /c "docker exec -i mysql mysql -uroot -p123 -e ""select count(*) from sky_take_out.dish;"""
# expected: 24
```

You can also import it with Navicat / Workbench against `127.0.0.1:3307` instead.

## 3. Start the backend (8080)

**No configuration changes are needed locally** — `application-dev.yml` already points at
MySQL 3307 / Redis 6379 / MinIO `localhost:9000`, and `application.yml` defaults to `active: dev`.

Option A: run `SkyApplication` from IDEA (recommended — hot restart while you edit).

Option B: run the jar from the command line:

```powershell
mvn -o clean package -DskipTests
java -jar sky-server\target\sky-server-1.0-SNAPSHOT.jar
```

> A plain `java -jar` uses the dev config — you do **NOT** need
> `--spring.profiles.active=prod` (that is the server-side usage).
>
> ⚠️ Stop the running backend before packaging, otherwise Windows locks the jar and `clean` fails
> with `Failed to delete ...sky-server-1.0-SNAPSHOT.jar`.

**Checkpoint**:

```powershell
curl.exe -s http://127.0.0.1:8080/user/shop/status
# {"code":1,"msg":null,"data":1}   (data 0 means the shop is closed — toggle it in the admin UI)
```

API docs: <http://localhost:8080/doc.html>

## 4. Start the frontend (5173 Chinese / 5174 English)

```powershell
cd sky-web
npm ci            # only the first time, or after dependency changes
npm run dev       # Chinese → http://localhost:5173
npm run dev:en    # English → http://localhost:5174   (open a second terminal)
```

Vite proxies `/admin`, `/user` and `/ws` to `http://localhost:8080` (via `VITE_API_TARGET` /
`VITE_WS_TARGET` in `.env`, which point at this machine by default). To debug against a
**remote backend**, temporarily point those two variables at the server address — restart the
dev server afterwards.

**To verify the production build** (closer to the real thing):

```powershell
npm run build && npm run preview        # Chinese → 5173
npm run build:en && npm run preview:en  # English → 5174
```

> ⚠️ `npm ci` wipes `node_modules`. If a Vite dev server or IDEA happens to be holding
> `esbuild.exe` at that moment, Windows reports
> `EPERM: operation not permitted, unlink ...esbuild.exe`.
> Stop the dev server first — or skip `npm ci` entirely and just run `npm run build`.

## 5. URLs

| Side | URL | Credentials |
| --- | --- | --- |
| Chinese · customer | http://localhost:5173/ | register on the customer side |
| Chinese · admin | http://localhost:5173/admin/login | `admin` / `123456` |
| English · customer | http://localhost:5174/ | same as above |
| English · admin | http://localhost:5174/admin/login | `admin` / `123456` |
| MinIO console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| API docs | http://localhost:8080/doc.html | — |

## Port summary

| Service | Port | Notes |
| --- | --- | --- |
| backend jar | 8080 | `server.port` |
| Chinese frontend | 5173 | `VITE_PORT` (`.env`) |
| English frontend | 5174 | `VITE_PORT` (`.env.en`) |
| MySQL | **3307** | container port 3306 published on 3307, to stay clear of other local projects |
| Redis | 6379 | |
| MinIO | 9000 / 9001 | API / console |

---

Server deployment (nginx serving both sites + systemd autostart + Docker middleware):
[`deploy/linux-docker/README.md`](deploy/linux-docker/README.md) (Linux),
[`deploy/README.md`](deploy/README.md) (Windows Server).
