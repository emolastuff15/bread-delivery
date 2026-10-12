# 部署说明（Linux 版：应用裸跑 + 中间件 Docker）

> 这是**备用方案**。当前主线是 Windows Server（见上一级 `deploy\README.md`）。
> 如果你把服务器换成 Linux，照这份走；文件都在本目录里，自成一套。

```
浏览器 :80    ──┐
浏览器 :8081  ──┤ nginx（宿主机 apt 安装）
                ├──→ /opt/sky/web-zh   中文前端
                ├──→ /opt/sky/web-en   英文前端
                ├──→ 127.0.0.1:8080    后端 jar（systemd 管理）
                └──→ 127.0.0.1:9000    MinIO（只反代 /img/）

后端 jar ──→ 127.0.0.1:3306  MySQL   ┐
         ──→ 127.0.0.1:6379  Redis   ├─ 这三个跑在 Docker 里
         ──→ 127.0.0.1:9000  MinIO   ┘
```

推荐系统：**Ubuntu 22.04 / 24.04 LTS**（Debian 12 也一样）。

---

## 0. 服务器准备

```bash
# ① 时区（很重要：订单时间、预约提醒都依赖它）
sudo timedatectl set-timezone Asia/Shanghai
timedatectl                      # 确认显示 CST +0800

# ② JDK 17 + nginx
sudo apt update
sudo apt install -y openjdk-17-jre-headless nginx
java -version                    # 期望 17.x

# ③ Docker（官方脚本，装完自带 docker compose v2）
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
docker version && docker compose version

# ④ 目录
sudo mkdir -p /opt/sky/{config,web-zh,web-en,data/{mysql,mysql-init,redis,minio}}
```

> 如果用云服务器，**控制台里"重装系统"会清空整块盘**，重装前先确认没别的数据。

---

## 1. 目录结构

```
/opt/sky/
├── app.jar                          # mvn 打的 jar（改名成 app.jar）
├── config/application-prod.yml      # 后端配置（必须和 app.jar 同级）
├── web-zh/                          # dist 的内容
├── web-en/                          # dist-en 的内容
└── data/                            # ★ 永久数据，备份就是拷这里
    ├── mysql/                       #   MySQL 库文件
    ├── mysql-init/                  #   放 .sql 会首次自动导入（可选）
    ├── redis/                       #   AOF + RDB
    └── minio/                       #   ★ 上传的图片
```

---

## 2. 中间件（Docker Compose）

```bash
# 网络（compose 里声明了 external，必须先建）
docker network create hm-net 2>/dev/null || true

sudo cp docker-compose.middleware.yml /opt/sky/
cd /opt/sky
docker compose -f docker-compose.middleware.yml up -d
docker compose -f docker-compose.middleware.yml ps      # 三个都 running / healthy
```

这份 compose 已经按演示项目配好了，**不用改**：

| 项 | 值 |
| --- | --- |
| MySQL | `8.0`，`127.0.0.1:3306`，root 密码 `123`，库 `sky_take_out`，utf8mb4 |
| Redis | `redis:7`，`127.0.0.1:6379`，开 AOF |
| MinIO | `127.0.0.1:9000`（控制台 9001），账号密码 `minioadmin` |
| 数据目录 | `/opt/sky/data/**` → 宿主机真实路径，**容器删了重建也不丢** |
| 重启策略 | `restart: unless-stopped` → 服务器重启自动回来 |

> 端口都绑在 `127.0.0.1` 上，所以公网连不到这几个端口，安全组只开 80/8081 就行。

---

## 3. 导入数据

**不用装 MySQL 客户端**，直接借用容器里的：

```bash
# 本机传上来的 SQL 在 /opt/sky/ 或 /tmp/
docker exec -i mysql mysql -uroot -p123 -e "select version();"
docker exec -i mysql mysql -uroot -p123 -e "create database if not exists sky_take_out default charset utf8mb4;"
docker exec -i mysql mysql -uroot -p123 sky_take_out < /tmp/sky_take_out_full.sql
docker exec -i mysql mysql -uroot -p123 -e "select count(*) from sky_take_out.dish;"    # 期望 24
```

> 也可以把 SQL 丢进 `/opt/sky/data/mysql-init/`，MySQL **首次启动且数据目录为空**时自动执行
> （只生效一次，之后再加文件就没用了）。

---

## 4. 从本机上传

```powershell
# 本机 sky-take-out 目录下执行
scp sky-server/target/sky-server-1.0-SNAPSHOT.jar   user@<IP>:/opt/sky/app.jar
scp deploy/config/application-prod.yml              user@<IP>:/opt/sky/config/
scp deploy/linux-docker/sky.service                 user@<IP>:/tmp/
scp deploy/linux-docker/nginx-sky.conf              user@<IP>:/tmp/
scp sky-server/src/main/resources/db/sky_take_out_full.sql  user@<IP>:/tmp/
scp -r sky-web/dist    user@<IP>:/opt/sky/
scp -r sky-web/dist-en user@<IP>:/opt/sky/
# ⚠️ /opt/sky/web-zh 已经用 mkdir 建过了，此时 `mv /opt/sky/dist /opt/sky/web-zh`
#    会把整个 dist 目录塞进去，变成 /opt/sky/web-zh/dist/ —— 要挪"里面的内容"，
#    所以结尾必须带 /*：
ssh user@<IP> "sudo mv /opt/sky/dist/* /opt/sky/web-zh/ && sudo rmdir /opt/sky/dist && \
               sudo mv /opt/sky/dist-en/* /opt/sky/web-en/ && sudo rmdir /opt/sky/dist-en"
ssh user@<IP> "ls -lh /opt/sky/web-zh/index.html /opt/sky/web-en/index.html"   # 检查点
```

**唯一必须改的一行**在 `/opt/sky/config/application-prod.yml`：

```yaml
    public-base-url: http://<服务器公网IP>/img     # ← 换成你的公网 IP，别删结尾的 /img
```

---

## 5. 后端（systemd 开机自启）

```bash
sudo cp /tmp/sky.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sky

systemctl status sky --no-pager
journalctl -u sky -n 30 --no-pager        # 看到 "Started SkyApplication" 就成了
journalctl -u sky -f                      # 实时看日志，Ctrl+C 退出
```

`sky.service` 里已经处理好几件容易忘的事：

- `WorkingDirectory=/opt/sky` → Spring Boot 才找得到 `config/application-prod.yml`
- `--spring.profiles.active=prod` → **不加这个会走 jar 内默认的 dev 配置（连 3307），必炸**
- `-Duser.timezone=Asia/Shanghai -Dfile.encoding=UTF-8` → 时间正确、中文日志不乱码
- `-Xms256m -Xmx512m` → 1G 内存的机器也够；内存大可以调高
- `Restart=always` → 崩了自动重启

---

## 6. nginx

```bash
sudo cp /tmp/nginx-sky.conf /etc/nginx/conf.d/sky.conf
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx
```

配置里 `/img/` 反代到 MinIO，所以**浏览器只访问 80 端口**，不需要把 9000 开到公网。

---

## 7. 防火墙

```bash
# Ubuntu/Debian 默认 ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 8081/tcp
sudo ufw enable
sudo ufw status verbose

# CentOS/RHEL 用 firewalld
# sudo firewall-cmd --permanent --add-port=80/tcp --add-port=8081/tcp && sudo firewall-cmd --reload
```

云服务器**还要在控制台的安全组里放行 80 和 8081**（这是两层，都要做）。

---

## 8. 验收

```bash
curl -s http://127.0.0.1:8080/user/shop/status          # {"code":1,"msg":null,"data":1}
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: text/html' http://127.0.0.1/admin/dishes   # 200
docker compose -f /opt/sky/docker-compose.middleware.yml ps
```

> `/admin/dishes` 那个 `-H 'Accept: text/html'` 不能省：nginx 是靠 Accept 头区分
> "前端路由"和"后端接口"的，curl 默认发 `*/*` 会被当成接口反代到后端，然后 404。

浏览器里再确认：

- `http://<公网IP>/` 中文版，菜品图片正常显示
- `http://<公网IP>:8081/` 英文版 Bread Takeaway
- 管理端 `admin` / `123456` 登录
- 上传一张 **大于 1MB** 的菜品图片（验证 nginx `client_max_body_size` + 后端 multipart）
- 管理端开"来单提醒"，另一台设备下一单 → 能收到 WebSocket 弹窗

---

## 9. 常见故障

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 启动失败 `ClassNotFoundException: ${sky.datasource.driver-class-name}` | `config/application-prod.yml` 漏了 `driver-class-name` | 补上（模板里已有；jar 内也加了默认值） |
| 连到 3307 / `Access denied` | 启动没带 `--spring.profiles.active=prod` | `sky.service` 里已有；手敲 `java -jar` 最容易漏 |
| 端口还是 8080 之外的值 | `config/` 没和 jar 同级，或 `WorkingDirectory` 不对 | `/opt/sky/config/` + `/opt/sky/app.jar`，工作目录 `/opt/sky` |
| 浏览器图片裂 | `public-base-url` 没填公网 IP | 改完 `sudo systemctl restart sky`（老图 URL 已落库，要 `UPDATE dish SET image=REPLACE(...)`） |
| 上传 >1MB 报"网络错误" | nginx `client_max_body_size` 或后端 multipart | 都放到 20m / 10MB（模板已配） |
| 管理端 WebSocket 连不上 | 反代缺 `Upgrade`/`Connection` | 用本目录 `nginx-sky.conf`（已处理） |
| `docker compose` 报网络不存在 | `hm-net` 没建 | `docker network create hm-net` |
| 重启服务器后 Redis 键/图片没了 | 数据目录挂到容器内路径了 | 本 compose 已挂 `/opt/sky/data/**`；MinIO 桶由后端启动时自愈 |

日志：

```bash
journalctl -u sky -f                                    # 后端
docker compose -f /opt/sky/docker-compose.middleware.yml logs -f mysql
tail -f /var/log/nginx/sky.access.log
```

---

## 10. 数据与备份

| 数据 | 位置 |
| --- | --- |
| MySQL | `/opt/sky/data/mysql` |
| Redis | `/opt/sky/data/redis` |
| **MinIO 图片** | `/opt/sky/data/minio` |

```bash
sudo tar czf /backup/sky-$(date +%F).tar.gz /opt/sky/data     # 备份
# 恢复：停容器 → 拷回目录 → 起容器
```

---

## 11. 安全收尾（演示项目整节跳过）

> 演示默认值：MySQL `root/123`、MinIO `minioadmin/minioadmin`、JWT `itcast`，**不改也能跑**。
> 唯一建议守住的：防火墙/安全组只开 80 和 8081（第 7 节），别放 3306/6379/9000。

- [ ] MySQL / MinIO 换强密码（compose 与 `application-prod.yml` 两处都要改）
- [ ] `sky.jwt.admin-secret-key` / `user-secret-key` 换成随机串（`openssl rand -base64 48`），两者不同
- [ ] 管理端 `admin/123456` 改掉
- [ ] Google Maps Key 加 HTTP referrer 限制（它被打进前端包）
- [ ] 上 HTTPS（certbot 签证书），否则浏览器一直显示"不安全"
