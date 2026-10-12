# 部署说明（Windows Server 版）

**形态**：后端 jar + 前端静态文件 + 三个中间件**全部直接跑在 Windows Server 上**，不用 Docker。

```
浏览器 :80    ──┐
浏览器 :8081  ──┤ nginx（C:\sky\middleware\nginx）
                ├──→ C:\sky\web-zh     中文前端静态文件
                ├──→ C:\sky\web-en     英文前端静态文件
                ├──→ 127.0.0.1:8080    后端 jar（app.jar）
                └──→ 127.0.0.1:9000    MinIO（只反代 /img/ 图片）

后端 jar ──→ 127.0.0.1:3306  MySQL
         ──→ 127.0.0.1:6379  Redis
         ──→ 127.0.0.1:9000  MinIO
```

为什么不用 Docker：**Docker Desktop 官方不支持 Windows Server**，而 mysql / redis / minio 的
官方镜像都是 Linux 镜像，装 Windows 容器也跑不了。原生安装反而更简单，而且数据就是普通
文件夹，备份等于拷目录。

---

## 0. 目录结构（先建好）

```bat
mkdir C:\sky\config
mkdir C:\sky\deploy
mkdir C:\sky\logs
mkdir C:\sky\web-zh
mkdir C:\sky\web-en
mkdir C:\sky\data\mysql
mkdir C:\sky\data\minio
mkdir C:\sky\middleware\minio
mkdir C:\sky\middleware\redis
mkdir C:\sky\middleware\nginx
```

最终长这样：

```
C:\sky\
├── app.jar                     ← mvn 打的后端 jar（改名成 app.jar）
├── config\
│   └── application-prod.yml    ← 后端配置（必须和 app.jar 同级，靠 config 目录）
├── deploy\                     ← 本目录那 5 个 .bat
├── web-zh\                     ← dist 的内容（中文）
├── web-en\                     ← dist-en 的内容（英文）
├── logs\                       ← 后端/MinIO/Redis 的日志
├── data\
│   ├── mysql\                  ← MySQL 数据文件（永久数据）
│   └── minio\                  ← ★ 上传的图片（永久数据）
└── middleware\
    ├── nginx\                  ← nginx for Windows 解压到这
    ├── redis\                  ← redis-server.exe 放这
    └── minio\                  ← minio.exe 放这
```

---

## 1. 要下载/安装的 5 样东西

| 东西 | 从哪拿 | 关键设置 |
| --- | --- | --- |
| **JDK 17** | Adoptium 或 Oracle 的 Windows x64 安装包 | 装完确认 `java -version` 是 17；**必须加进系统级 PATH**（见下面的坑） |
| **MySQL 8.0** | 官方 `mysql-installer-community-*.msi` | 端口 `3306`、root 密码 `123`、勾选 **Configure MySQL Server as a Windows Service**、数据目录改成 `C:\sky\data\mysql` |
| **MinIO** | 单文件 exe：`https://dl.min.io/server/minio/release/windows-amd64/minio.exe` | 丢到 `C:\sky\middleware\minio\`，不用安装 |
| **Redis** | `https://github.com/tporadowski/redis/releases` 的 `Redis-x64-5.0.14.1.zip` | 解压到 `C:\sky\middleware\redis\`；Redis 没有官方 Windows 版，这个移植版够用（只存营业状态和套餐缓存） |
| **nginx for Windows** | `http://nginx.org/download/nginx-1.27.x.zip` | 解压到 `C:\sky\middleware\nginx\`（路径别有空格） |

> ⚠️ **JDK 一定要加到"系统变量"的 PATH，不能只加用户变量**。因为后面用任务计划程序以
> `SYSTEM` 账户启动，用户级 PATH 它看不到，表现是任务一闪而过、日志里写
> `'java' 不是内部或外部命令`。
> 验证：`where java` 能输出路径，且在 `C:\Windows\System32` 目录下敲 `java -version` 也有输出。

---

## 2. MySQL 收尾（两件事）

**① 让 MySQL 只听本机**（防止公网直接连你的 3306）：

打开 MySQL 的配置文件（一般是 `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`），
在 `[mysqld]` 段里确认有这一行，没有就加上，然后重启服务：

```ini
[mysqld]
bind-address=127.0.0.1
```

**② 导入数据**（在**服务器上**执行）：

```bat
sc query MySQL80                          :: 先确认服务起来了（服务名可能是 MySQL80）
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p123 -e "select version();"
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p123 < C:\sky\sky_take_out_full.sql
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p123 -e "select count(*) from sky_take_out.dish;"
:: 期望 24
```

> ⚠️ **在 PowerShell 里不要直接写 `<`**，PowerShell 不支持输入重定向，会报
> `'<' 运算符保留供将来使用`。两个办法：
> - 用 `cmd /c "…… < C:\sky\sky_take_out_full.sql"`（推荐）
> - 或者全程在 `cmd.exe` 窗口里执行上面的命令

---

## 3. 从本机把文件传上去

服务器是 Windows，最省事的是 **RDP 远程桌面进去直接复制粘贴**。如果装了 OpenSSH Server
（`Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0` + `Start-Service sshd`），
也可以用 scp：

```powershell
# 在本机 sky-take-out 目录下执行
scp sky-server\target\sky-server-1.0-SNAPSHOT.jar   administrator@<IP>:C:/sky/app.jar
scp deploy\config\application-prod.yml              administrator@<IP>:C:/sky/config/
scp deploy\start-backend.bat deploy\start-minio.bat deploy\start-redis.bat deploy\start-nginx.bat deploy\install-autostart.bat administrator@<IP>:C:/sky/deploy/
scp sky-server\src\main\resources\db\sky_take_out_full.sql  administrator@<IP>:C:/sky/
scp -r sky-web\dist    administrator@<IP>:C:/sky/
scp -r sky-web\dist-en administrator@<IP>:C:/sky/
# 然后在服务器上把内容挪进去。注意 C:\sky\web-zh 已经建过了，
# 直接 `move C:\sky\dist C:\sky\web-zh` 会把 dist 整个塞进去变成
# C:\sky\web-zh\dist\ —— 用 xcopy 拷"里面的内容"：
#   xcopy /E /I /Y C:\sky\dist\*    C:\sky\web-zh\
#   xcopy /E /I /Y C:\sky\dist-en\* C:\sky\web-en\
#   rmdir /S /Q C:\sky\dist
#   rmdir /S /Q C:\sky\dist-en
#   检查点：dir C:\sky\web-zh\index.html
```

nginx 的配置：把本仓库 `deploy\nginx.conf` 覆盖到
`C:\sky\middleware\nginx\conf\nginx.conf`。

**唯一必须改的一行**在 `C:\sky\config\application-prod.yml`：

```yaml
    public-base-url: http://<服务器公网IP>/img     # ← 换成你的公网 IP，别删结尾的 /img
```

---

## 4. 启动（先手动跑一遍，确认没问题）

```bat
:: 三个中间件 + nginx（各自开一个窗口，或分别双击这些 bat）
C:\sky\deploy\start-redis.bat
C:\sky\deploy\start-minio.bat
C:\sky\deploy\start-backend.bat
C:\sky\deploy\start-nginx.bat
```

这些 bat 都是**死循环 + 崩了自动重启**，并带 `chcp 65001`，所以 cmd 窗口里中文日志不会乱码。
关掉窗口就是停止（真正的开机自启看第 5 节）。

**顺序别搞反**：中间件先起，后端后起。`start-backend.bat` 里已经等了 15 秒，
万一 MySQL 还没就绪，后端崩了也会在 5 秒后自动重试，不用你管。

---

## 5. 开机自启（任务计划程序）

**右键 `C:\sky\deploy\install-autostart.bat` → 以管理员身份运行。**

它会注册 4 个开机任务（`sky-redis` / `sky-minio` / `sky-backend` / `sky-nginx`），
以 `SYSTEM` 账户运行，所以**不需要有人登录**，也不会弹出黑窗口：

```bat
schtasks /Create /TN "sky-backend" /TR "C:\sky\deploy\start-backend.bat" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
```

（MySQL 不在里面：装 MSI 的时候它已经把自己注册成自动启动的 Windows 服务了。）

不想重启就能验证的话：

```bat
schtasks /Run /TN "sky-redis"
schtasks /Run /TN "sky-minio"
schtasks /Run /TN "sky-backend"
schtasks /Run /TN "sky-nginx"
```

---

## 6. 防火墙放行

**只放行 80 和 8081**，别的端口（3306/6379/8080/9000/9001）都只绑在 `127.0.0.1`，公网连不到：

```bat
netsh advfirewall firewall add rule name="sky-http-80"   dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="sky-http-8081" dir=in action=allow protocol=TCP localport=8081
```

如果服务器在阿里云/腾讯云，**安全组**里也要放行 80 和 8081（这是两层，都要做）。

---

## 7. 验收

```bat
:: Windows 10+ 自带 curl.exe。注意在 PowerShell 里要写 curl.exe，
:: 因为 PowerShell 把 curl 当成 Invoke-WebRequest 的别名了
curl.exe -s http://127.0.0.1:8080/user/shop/status
:: 期望 {"code":1,"msg":null,"data":1}

curl.exe -s -o nul -w "%{http_code}" -H "Accept: text/html" http://127.0.0.1/admin/dishes
:: 期望 200
```

浏览器里再确认这几件事：

- `http://<公网IP>/` → 中文版首页，菜品图片显示正常
- `http://<公网IP>:8081/` → 英文版 Bread Takeaway
- 管理端 `admin` / `123456` 能登录
- 上传一张 **大于 1MB** 的菜品图片（验证 nginx 的 `client_max_body_size` 和后端 multipart 都放开了）
- 管理端打开"来单提醒"页，另一台设备下一单 → 能收到 WebSocket 弹窗
- `/portal` 首页能进

---

## 8. 常见故障（Windows 专有，都是实际会踩的）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 任务计划里任务"上次运行结果 0x1"，日志写 `'java' 不是内部或外部命令` | JDK 只加进了**用户** PATH，`SYSTEM` 账户看不到 | 把 JDK 的 `bin` 加到**系统** PATH，重启任务 |
| nginx 起不来：`bind() to 0.0.0.0:80 failed (10013: permission denied)` | 80 端口被 IIS / `http.sys` 占了 | `netstat -ano \| findstr :80` 看 PID；`sc stop W3SVC` 或 `iisreset /stop` 停 IIS |
| nginx `[emerg] open() "logs/sky.access.log" failed` | nginx 自己的 `logs` 目录不存在 | 用 `start-nginx.bat` 启动（它会自动建 logs/temp），或手动 `mkdir C:\sky\middleware\nginx\logs` |
| 双击 .bat"闪一下就没了" | 脚本跑完或报错了 | 别双击，看 `C:\sky\logs\*.log`；或在 cmd 窗口里手动执行里面那条命令 |
| 后端日志 `Access denied for user 'root'@'localhost'` | MySQL 密码不是 `123` | 核对 `my.ini` 和 `application-prod.yml` 里的密码；`net start MySQL80` 重启服务 |
| 后端日志 `Communications link failure` | MySQL 服务没起来 | `sc query MySQL80`，然后 `net start MySQL80` |
| 8080 没监听 | 端口被占，或后端起来就崩了 | `netstat -ano \| findstr :8080` 看占用；`taskkill /F /PID <PID>`；再看 backend.log |
| 本机能打开网站，别的机器打不开 | 防火墙入站规则没加，或云安全组没放行 | 见第 6 节，两层都要 |
| 图片全裂 | `public-base-url` 还是 `<服务器公网IP>` 没换成真 IP | 改完重启后端任务：`schtasks /End /TN sky-backend` + `schtasks /Run /TN sky-backend` |
| 管理端 WebSocket 连不上 | nginx 反代缺 `Upgrade`/`Connection` 头 | 用本仓库的 `deploy\nginx.conf`（`/ws/` 段已经处理好） |
| PowerShell 里导入 SQL 报 `'<' 运算符保留供将来使用` | PowerShell 不支持 `<` 输入重定向 | 用 `cmd /c "…… < 文件.sql"` |
| 中文日志在窗口里乱码 | cmd 用的是 OEM 代码页 | 本仓库的 bat 已带 `chcp 65001`；手动跑时先敲一次 `chcp 65001` |

日志位置：

```powershell
Get-Content C:\sky\logs\backend.log -Tail 50 -Wait     # 相当于 Linux 的 tail -f，Ctrl+C 退出
Get-Content C:\sky\logs\minio.log   -Tail 30
Get-Content C:\sky\logs\redis.log   -Tail 30
```

---

## 9. 数据与备份

| 数据 | 位置 |
| --- | --- |
| MySQL 库文件 | `C:\sky\data\mysql` |
| Redis（营业状态、套餐缓存） | `C:\sky\middleware\redis` |
| **MinIO 上传的图片** | `C:\sky\data\minio` |

都是**普通文件夹**，备份就是拷目录：

```bat
:: 停后端 → 拷 → 起后端（拷之前停一下，保证一致性）
schtasks /End /TN "sky-backend"
xcopy C:\sky\data D:\backup\sky-data\ /E /I /Y
schtasks /Run /TN "sky-backend"
```

MinIO 的 bucket 和"公共读"策略由后端启动时自动补齐（`MinioBucketInitializer`），
所以就算换了台机器、换了数据目录，图片也能自愈。

---

## 10. 安全收尾（演示项目整节跳过）

> 配置里全是演示默认值（MySQL `root/123`、MinIO `minioadmin/minioadmin`、JWT `itcast`），
> **不改也能跑**。唯一建议守住的：别在防火墙/安全组里放行 3306、6379、9000 ——
> 第 6 节只放 80/8081 就对了。

- [ ] MySQL / MinIO 密码换强密码
- [ ] `sky.jwt.admin-secret-key` / `user-secret-key` 换成随机串，且两者不同
- [ ] 管理端 `admin/123456` 改掉；员工密码统一 MD5（见项目 README）
- [ ] Google Maps Key 在 Google Cloud 控制台加 HTTP referrer 限制（它会被打进前端包）
- [ ] 有条件的话上 HTTPS（nginx 配证书），否则浏览器地址栏一直显示"不安全"

---

## 附：换机器 / 换环境时要改什么

| 要改的 | 在哪 |
| --- | --- |
| 服务器公网 IP | `C:\sky\config\application-prod.yml` 的 `public-base-url` |
| 项目换个盘（不用 C 盘） | `C:\sky\deploy\*.bat` 里的路径（每个 bat 顶部都有说明）+ `nginx.conf` 的 `root` |
| MySQL 端口/密码 | `application-prod.yml` 的 `sky.datasource.*`（**改这个不用重新打包 jar**） |
| 前端 | 不用动，产物里没有写死的地址，靠 nginx 同源代理 |

---

## 附：Linux + Docker 的旧方案

用不上了，但没删，放在 `deploy\linux-docker\`（`docker-compose.middleware.yml` + `sky.service`），
里面有端口绑定、数据目录挂载、`-Duser.timezone`/`-Xmx` 这些参数的参考价值。
