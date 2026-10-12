# 苍穹外卖 React 前端（sky-web）

基于后端 [sky-take-out](../)（Spring Boot 苍穹外卖项目）构建的 **React 外卖网页**，包含：

- **C 端用户点餐网页**：登录 / 注册 / 修改密码、首页（分类 + 菜品 + 套餐浏览、口味选择、加购）、购物车、下单结算、历史订单、订单详情、地址簿
- **管理端后台**：登录、工作台（今日数据）、营业状态开关、员工管理、分类管理、菜品管理（含图片上传、口味）、套餐管理、订单管理（搜索 / 接单 / 拒单 / 派送 / 完成 / 取消）

技术栈：**Vite 5 + React 18 + TypeScript + Ant Design 5 + React Router 6 + Zustand + Axios**

---

## 一、快速启动

```bash
# 1. 安装依赖（使用工作区内缓存目录，避免沙箱/权限问题）
npm install --cache ./.npm-cache

# 2. 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 3. 生产构建
npm run build
```

> Vite 开发服务器已配置代理：`/admin`、`/user` → `http://localhost:8080`，前端代码无需关心跨域。

## 二、页面入口

| 端 | 入口 | 说明 |
| --- | --- | --- |
| C 端用户 | `http://localhost:5173/login` | 登录；`/register` 注册；登录后进入首页点餐 |
| 管理端 | `http://localhost:5173/admin/login` | 员工登录（默认账号见数据库 employee 表，初始密码 123456） |

## 三、后端前置条件

1. **MySQL**：创建 `sky_take_out` 库，导入教程的 `资料/day01/数据库/sky.sql`。
2. **账号表扩展**：执行迁移脚本 `sky-server/src/main/resources/db/user_account.sql`（为 `user` 表增加 `username`、`password` 列及唯一索引，支持网页注册/密码登录）。
3. **Redis**：启动本地 Redis（端口 6379，存储店铺营业状态等）。
4. **MinIO**：启动本地 MinIO（默认 `127.0.0.1:9000`，`minioadmin/minioadmin`，bucket `photo`），用于图片上传。
5. 数据库连接配置在 `sky-server/src/main/resources/application-dev.yml`（默认 `root/88888888`），按需修改。

## 四、本次新增/修改的后端内容

### 4.1 新增接口（C 端账号体系）

| 接口 | 方法 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| `/user/user/register` | POST | 用户注册（body: username, password, name?, phone?），成功直接返回 token | 免登录 |
| `/user/user/login` | POST | 用户名密码登录（body: username, password）→ `UserLoginVO{id,username,name,token}` | 免登录 |
| `/user/user/editPassword` | PUT | 修改密码（body: oldPassword, newPassword），从 token 取 userId | 需登录 |

密码统一 **MD5** 加密存储。

新增文件：
- `sky-pojo/.../dto/UserRegisterDTO.java`、`UserAccountLoginDTO.java`、`UserPasswordEditDTO.java`
- `sky-server/.../mapper/UserMapper.java`（+ `resources/mapper/UserMapper.xml` 占位）
- `sky-server/.../service/UserService.java`、`service/impl/UserServiceImpl.java`
- `sky-server/.../controller/user/UserController.java`

修改文件：
- `sky-pojo/.../entity/User.java`（+username/password）、`vo/UserLoginVO.java`（+username/name）
- `sky-server/.../config/WebMvcConfiguration.java`：注册用户端 JWT 拦截器（`/user/**`，放行 register/login/shop/status）
- `sky-server/src/main/resources/application.yml`：新增 `sky.jwt.user-*` 配置（token 头名 `authentication`）

### 4.2 顺带修复的后端 bug（原教程遗留）

| 位置 | 问题 | 修复 |
| --- | --- | --- |
| `user/OrderController#submit` | `return null`，下单无响应体 | 返回 `Result.success(orderSubmitVO)` |
| `user/OrderController#cancel` | `return null` | 返回 `Result.success()` |
| `user/ShoppingCardController#clean` | `return null` | 返回 `Result.success()` |
| `OrderServiceImpl#submitOrder` | `shoppingCart.setId(userId)` 查询条件错误 + 空购物车判断 `&&` 写反 | 改为 `setUserId`、`\|\|` |
| `OrderServiceImpl#conditionSearch` | `return null`，管理端订单搜索无数据 | 返回 `new PageResult(total, list)` |
| `admin/ReportController#export` | 未声明 `IOException`，编译失败 | 方法声明 `throws Exception` |
| `admin/ShopController`、`user/ShopController` | `RedisTemplate` 未注入（NPE） | 补 `@Autowired` |
| 购物车 | 缺少减一接口 | 新增 `POST /user/shoppingCard/sub`（Mapper 增加 `deleteById`） |

## 五、联调要点（重要）

1. **Token 头名**：管理端 `token`，用户端 `authentication`。前端 `src/api/client.ts` 已自动根据登录类型携带。
2. **401 处理**：拦截器未通过会直接返回 401（空响应体），前端拦截器已处理：清 token 并跳转对应登录页。
3. **`/user/shoppingCard/list` 是 POST**（后端如此定义），前端已按 POST 调用。
4. 购物车/订单/地址簿均依赖 `BaseContext.getCurrentId()`（来自 JWT 的 `userId`），必须登录后调用。
5. 图片 URL 为 MinIO 预签名地址（7 天有效）。
6. 微信支付（`/user/order/payment`）需要商户号等配置，网页演示中下单后为「待付款」状态，可通过管理端取消或走后续支付对接。

## 六、目录结构

```
sky-web/
├── docs/api-catalog.md          # 86 个后端接口的完整清单（自动生成，含字段与示例）
├── src/
│   ├── api/                     # axios 封装 + 各模块接口
│   │   ├── client.ts            # 请求/响应拦截、token 管理
│   │   ├── auth.ts              # 注册/登录/改密（用户端+管理端）
│   │   ├── user.ts              # C 端：店铺/分类/菜品/套餐/购物车/订单/地址簿
│   │   └── admin.ts             # B 端：员工/分类/菜品/套餐/订单/店铺/工作台/上传
│   ├── types/index.ts           # 与后端实体/VO/DTO 对应的 TS 类型
│   ├── stores/auth.ts           # zustand 登录态
│   ├── components/RequireAuth.tsx  # 路由守卫
│   ├── layouts/                 # UserLayout / AdminLayout
│   └── pages/
│       ├── user/                # Login Register ChangePassword Home Cart Checkout Orders OrderDetail AddressBook
│       └── admin/               # Login Dashboard ShopStatus Employees Categories Dishes Setmeals Orders
└── vite.config.ts               # 代理 /admin /user -> :8080
```

## 七、账号说明

- **管理端**：employee 表里的员工账号（如 `admin`），初始密码 `123456`（MD5 存储）。注意本项目员工登录目前是明文比对（教程遗留 TODO），若修改员工密码请同时留意。
- **用户端**：网页直接注册新账号，或使用已注册账号登录。

---

## 八、管理端页面（对齐原版 Vue 管理端）

原版 Vue 管理端位于教程目录 `苍穹外卖前端课程\代码\day03\project-sky-admin-vue-ts`（实为 Vue 2 + Element UI + TS），已移植为 React：

| 菜单 | 路由 | 说明 |
| --- | --- | --- |
| 工作台 | `/admin/dashboard` | 今日数据、订单概览、菜品/套餐总览、今日订单列表 |
| 数据统计 | `/admin/statistics` | 营业额曲线、订单统计、销量 Top10、报表导出（ECharts） |
| 订单管理 | `/admin/orders` | 状态 Tab + 搜索 + 详情抽屉 + 接单/拒单/派送/完成/取消 |
| **预定订单** | `/admin/reservations` | **新增**：按预约时间区间查看预约单，含"距离预约"倒计时、一键接单 |
| 套餐管理 | `/admin/setmeals` | 套餐 CRUD、套餐菜品、图片上传 |
| 菜品管理 | `/admin/dishes` | 菜品 CRUD、口味编辑、图片上传、库存查看与调整（见下） |
| 分类管理 | `/admin/categories` | 分类 CRUD、启停、类型筛选 |
| 员工管理 | `/admin/employees` | 员工 CRUD、启停 |
| 图表统计 | `/admin/chart` | 原版 `chart` 页：顶部数据框 + 时段趋势 + 分类占比 + 销售排行（接口**已全部实现**，见第十三/十四/十五节）|
| 来单提醒 | `/admin/inform` | 原版消息/通知页（同上） |
| 营业状态 | `/admin/shop` | 店铺营业/打烊开关 |
| 修改密码 | 右上角头像菜单 | 弹窗形式（原版 `password.vue`） |

### ⚠️ 关于"原版照搬"的接口

原版 Vue 管理端有一部分接口对接的是**黑马自己的演示服务器**，当前 sky-take-out 后端并未实现，已按"全部照搬"保留在 `src/api/legacy.ts`，运行时这些页面的请求会返回 404（页面已做容错，不会白屏）：

- `/admin/report/{payTypeCollect,datePayTypeCollect,privilegeCollect,privilegeByDate}`（chart 页剩余的 4 个）—— ❌ **已按需求删除**：系统里没有优惠/折扣业务、也没有多种收款方式，没有数据来源，前端对应 UI（店内收款构成饼图、优惠指标列表）已一并移除
  - chart 页**实际使用**的报表接口已**全部实现**：`amountCollect`、`dayCollect`、`hourCollect`、`dayAmountCollect`、`categoryCollect`、`dateCategoryCollect`、`currentDishRank`、`dishRankForDate`，见第十三/十四节
- `/admin/messages/{page,countUnread,batch,{id}}`（来单提醒页）
- `/admin/dish/status/{status}`（菜品启停）

要真正可用，需要在后端补这些接口。

## 九、WebSocket 实时提醒

管理端登录后会自动建立 WebSocket 连接（`src/hooks/useAdminSocket.ts`，移植自原版 `layout/components/Navbar/index.vue`）：

| 消息 | 行为 |
| --- | --- |
| `type=1` 来单提醒 | 播放 `public/audio/preview.mp3`，弹通知，点击跳 `/admin/orders?orderId=xxx` |
| `type=2` 客户催单 | 播放 `public/audio/reminder.mp3`，弹通知，点击跳订单 |
| `type=3` 预约提醒 | 播放提示音，弹汇总通知（含待处理单数与最近一单剩余分钟），点击跳 `/admin/reservations` |

相比原版补充了**断线自动重连**（指数退避，最长 30 秒）——原版掉线后就再也收不到提醒。

连接地址走 Vite 代理：前端连 `ws://localhost:5173/ws/{随机id}` → 代理到后端 `ws://localhost:8080/ws/{id}`（见 `vite.config.ts` 的 `'/ws'` 配置，`ws: true`）。

## 十、预约单提醒链路（后端配套）

```
用户下单（带预约时间）→ status=1 待付款
   ↓ 付款成功
status=0 预约中（已付款，等待预约时间到达）
   ↓ 预约时间进入 1 小时窗口
ReservationRemindTask 每分钟扫描 → 汇总推送 type=3 给管理端
   ↓ 店员在"预定订单"页接单（PUT /admin/order/confirm）
status=3 已接单 → 提醒自动停止
```

- 提醒任务**纯只读**（不改任何状态），无状态化设计：只要未处理，每分钟都会再推一次，因此断线期间不会永久漏（上线后 ≤60 秒内会收到）
- 查询条件：`status=0 AND reservation_time < now+1h`，走索引 `idx_status_reservation_time(status, reservation_time)`
- 已超时未处理的预约单会持续提醒，并在消息里以 `overdueCount` 单独计数

## 十一、菜品库存规则（新增）

菜品表用 `dish.number` 记剩余份数（`NOT NULL DEFAULT 0`）。管理端"菜品管理"页新增了**剩余库存**列和行内按钮：

| 场景 | 前端按钮 | 后端接口 | 行为 |
| --- | --- | --- | --- |
| 店铺**营业中** 且 菜品**起售** | 添加库存 | `PUT /admin/dish/stock/add` | 只能累加：`number = number + N`（N > 0） |
| 店铺**已打烊** 或 菜品**停售** | 编辑库存 | `PUT /admin/dish/stock` | 直接覆盖：`number = N`（N ≥ 0） |

- 判定依据：Redis `SHOP_STATUS`（`1` 营业中）+ `dish.status`（`1` 起售）；Redis 取不到状态时按"已打烊"处理，因此营业中误改库存会被后端拒绝（前端也会退化成"编辑库存"按钮，请求会被拦下）
- 库存扣减发生在**下单时**（`submitOrder`，`UPDATE ... WHERE number >= N`），订单取消 / 超时 / 拒单都会回补，见 `OrderServiceImpl.restoreStockByOrderId`
- 用户端 `/user/dish/list` 返回的库存恒为 `null`（`DishServiceImpl.listWithFlavor` 中清空），避免把经营信息暴露给顾客
- 新增菜品未传 `number` 时后端默认给 `100` 份（`DishServiceImpl.DEFAULT_DISH_STOCK`），否则新建菜品库存为 0、无法下单；新增弹窗里有「初始库存」输入框（默认 100），`DishDTO.number` 是 `Integer`，传 0 = 真的 0 份、传负数报错
- 修改菜品接口（`PUT /admin/dish`）**不会**改库存，即使 body 里带了 `number` 也被忽略（update SQL 不含该列），库存只能走上面两个接口

## 十二、越权修复 + 员工密码策略（新增）

### 12.1 越权修复：管理端功能不能再从 `/user/**` 调用

原来有三处"管理端功能被放在用户端路径下"，而 `/user/**` 只校验用户端 JWT，**任何注册顾客拿着自己的 token 就能调用**（实测 `GET /user/employee/page` 能拉出全部员工含明文密码，`POST /user/category` 能增删改分类，`POST /user/setmeal/status/0?id=x` 能停售套餐）：

| 原路径 | 处理 | 结果 |
| --- | --- | --- |
| `/user/employee/**`（7 个接口） | 删除整个 `user/EmployeeController` | 404 |
| `/user/category`（POST/page/DELETE/PUT/status） | 删除，仅保留 `GET /user/category/list?type=` | 越权接口 404，C 端菜单正常 |
| `/user/setmeal/status/{status}` | 移到 `POST /admin/setmeal/status/{status}` | 用户端 404，管理端可用 |

- 管理端功能现在只存在于 `/admin/**`，由 `JwtTokenAdminInterceptor` + 管理员 JWT 保护
- 新增的 `/admin/setmeal/status/{status}` 带 `@CacheEvict("setmealCache")`，启停后顾客端立即生效（原来放用户端时没有清缓存，改了顾客还看到旧套餐）
- `PUT /admin/setmeal`（修改套餐）也补上了 `@CacheEvict`，同样修掉"改了套餐顾客端不更新"的缓存不刷新问题

### 12.2 员工密码：明文/MD5 双兼容

原本 `EmployeeServiceImpl.save` 新增员工时存 **MD5**，而 `login` 用**明文**比对 —— 结果是**管理端新建的员工永远登不进去**（实测 `admin/123456` 能登，但同样密码 123456 的新员工返回"密码错误"）。

修复方式（**不会把任何人锁在门外**）：

- `login`：明文和 MD5 **两种格式都接受** → 老账号（如 `admin/123456` 明文）照旧能登
- `updatePassword`（`PUT /admin/employee/editPassword`）：校验旧密码同样兼容两种格式，**写入统一存 MD5**
- `empId` 由后端从 token 取（`BaseContext.getCurrentId()`），前端不传，避免改到别人的密码
- 想要把历史明文账号彻底刷成 MD5，可以按需批量执行：`UPDATE employee SET password = MD5(password) WHERE password NOT REGEXP '^[0-9a-f]{32}$';`（执行后仍能正常登录，因为 MD5 比对已生效）

> 当前库里 `admin` 的密码已是 `MD5("123456")`（登录时依然输 `123456`），员工 `张三` 的密码本来就是 MD5，但其 `status=0` 被禁用。

### 12.3 顺带修掉的 bug

- `EmployeeMapper.xml` 的员工姓名搜索：`<if test="name != ' '">` 里的 `' '` 在 OGNL 中是 **char 字面量**，与 String 比较会走数值转换 → `NumberFormatException: For input string: "admin"`，导致 `/admin/employee/page?name=xx` **一搜就 500**。已改为 `name != ''`。
- `/admin/report/top10` 的 500：`OrderMapper.xml` 里 `limit 0,10` 被写成了 `` `limit` 0,10 ``，MySQL 8 在 LIMIT 子句位置不接受反引号 → `SQLSyntaxErrorException near '`limit` 0,10'`。已去掉反引号。

## 十三、图表页已实现的两个图（菜品分类占比 + 菜单销售排行）

`/admin/chart` 页的**图表现已全部可用**（顶部数据框见第十五节，收款构成与优惠指标已删除）：

| 图 | 场景 | 接口 | 单位 |
| --- | --- | --- | --- |
| 菜品分类占比（饼图） | 当日 | `GET /admin/report/categoryCollect/{type}/{date}` | type=1 金额**分**、type=2 销量 |
| 菜品分类占比（饼图） | 时间段 | `GET /admin/report/dateCategoryCollect/{type}/{start}/{end}` | 同上 |
| 菜单销售排行（柱状图） | 时间段 | `GET /admin/report/dishRankForDate/{start}/{end}` | 金额**分**（前端 /100） |
| 菜单销售排行（柱状图） | 当日 | `GET /admin/report/currentDishRank/{date}` | 销量**份数**（前端不除） |

- 饼图返回 `[{name, value, percent}]`（`ChartValueVO`）；柱状图返回 `{xaxis:[...], series:[...]}`（`ChartXYVO`）
- **单位差异是原版前端定的**：`ChartStats.tsx` 里区间排行 `toXYData(res, true)` 会 `/100`，当日排行 `toXYData(res, false)` 不除 —— 所以后端一个返回分、一个返回份数，照着填就行
- 口径：`orders.status = 5`（已完成）
  - 分类饼图 join 了 dish/category，所以**套餐不计入**
  - 菜单排行直接 `group by order_detail.name`，所以**套餐会计入**（想排除就加 `join dish d on od.dish_id = d.id`）
  - 排行取前 10
- 实测（造 4 条明细，销量与金额排序故意相反，验完清理）：

```
数据：米饭 8份/16元   北冰洋 5份/50元   王老吉 3份/99元   馒头 1份/2元

dishRankForDate（金额）: xaxis=[王老吉,北冰洋,米饭,馒头] series=[9900,5000,1600,200] → 前端 /100 → [99,50,16,2]
currentDishRank（销量） : xaxis=[米饭,北冰洋,王老吉,馒头] series=[8,5,3,1]
```

## 十四、时段销售趋势（已实现）

前端 `chartA` 的橙色柱状图 `TrendBarChart title="时段销售趋势"` 现在有真实数据：

| 场景 | 接口 | x 轴 |
| --- | --- | --- |
| 区间按天（**主路径**） | `GET /admin/report/dayAmountCollect/{type}/{start}/{end}` | 区间内每一天（补零，标签 `MM-dd`） |
| 当日按小时 | `GET /admin/report/hourCollect/{type}/{date}` | `0时` ~ `23时`（固定 24 个刻度，补零） |

实现要点（前 8 条是设计思路，第 9 条是踩到的坑）：

1. **返回结构**：`{xaxis:[...], series:[...]}`，复用 `ChartXYVO`
2. **必须补零/补日期**：SQL 只返回"有单的那些小时/那些天"，直接画会柱子错位、日期跳格。做法是在 Java 里先按 `0..23` 或 `begin..end` 造骨架，再用 `Map<key,value>` 回填（`ReportServiceImpl.getSalesTrend`）
3. **type 两个口径**：`type=2` 按单数 = `count(*)`；`type=1` 按金额 = `sum(orders.amount)`（**与"营业额统计"同口径，含打包费**，没用 `sum(order_detail.amount)`）
4. **单位**：`type=1` 返回**分**（`round(sum(amount)*100)`），前端 `toXYData(res, tA===1)` 会 `/100`
5. **时间边界**：`o.status=5` + `o.order_time >= 开始 00:00:00` + `<= 结束 23:59:59.999999999`
6. **周报/月报不用后端管**：前端 `changeDate()` 已把周/月换算成 `start`/`end` 传进来（`ChartStats.tsx:415-431`），三种粒度共用同一条按天 SQL
7. **SQL 不排序也行**：骨架由 Java 按自然顺序（小时 0→23、日期升序）生成，所以 SQL 里**不能** `order by value desc`（那是饼图/排行图的逻辑）
8. **当日接口不是主路径**：类型开关（按金额/按单数）无论日报还是区间都调**区间**接口（`topActiveHandle` → `fetchTrendByRange`），`hourCollect` 只在"手动选今天"时被调用
9. ⚠️ **MySQL 8 `only_full_group_by` 坑**：按小时分组时，`select cast(hour(order_time) as char)` 配 `group by hour(order_time)` 会报
   `Expression #1 of SELECT list is not in GROUP BY clause ... incompatible with sql_mode=only_full_group_by`
   —— 因为套了 `cast` 之后 MySQL 不再推断函数依赖。**`group by` 必须和 select 里写完全一样的表达式**（`group by cast(hour(order_time) as char)`）
10. 性能：报表都按 `(status, order_time)` 过滤聚合，建议补联合索引 `idx_status_order_time(status, order_time)`

实测（造 5 单跨 3 天 3 个小时，其中 1 单是已取消 `status=6`，验完已清理）：

```
数据：09-10 11:30/50元、09-10 12:10/60元、09-10 12:40/70元、09-12 19:00/500元、09-11 13:00/999元(已取消)

dayAmountCollect/1/2026-09-09/2026-09-13
  xaxis = [09-09, 09-10, 09-11, 09-12, 09-13]
  series(分) = [0, 18000, 0, 50000, 0] → 前端 /100 → [0, 180, 0, 500, 0]
                                              ↑补零    ↑50+60+70  ↑09-11 那条已取消，正确地是 0
dayAmountCollect/2/... 同区间
  series(单数) = [0, 3, 0, 1, 0]

hourCollect/1/2026-09-10
  刻度 24 个，非零：11时 → 50元、12时 → 130元
hourCollect/2/2026-09-10
  非零：11时 → 1单、12时 → 2单
```

## 十五、顶部三个数据框 + 已删除的两个图

### 15.1 顶部数据框（已实现）

| 场景 | 接口 |
| --- | --- |
| 当日 | `GET /admin/report/amountCollect/{date}` |
| 时间段（周报/月报/自定义） | `GET /admin/report/dayCollect/{start}/{end}` |

返回 `{payTotal, noPayTotal, totalPerson}`（`ChartTopVO`）：

| 字段 | 口径 | 单位 |
| --- | --- | --- |
| `payTotal` 实收金额 | `pay_status=1`（已支付）订单金额合计 | **分**，前端 /100 |
| `noPayTotal` 未收金额 | `pay_status=0` 且未取消（`status not in (6,7)`）金额合计 | **分** |
| `totalPerson` 就餐人数 | 该时间段**去重下单用户数** `count(distinct user_id)`（同样排除已取消/退款） | 人 |

- ⚠️ 顶部三个框**只在"日报"模式下显示**（`act === 'day'`），周报/月报不显示
- 空区间返回 `0`（不是 `null`）
- 实测：造 5 单（含 1 单已取消、1 单未付款）→

```
09-20 当日：实收 150元(15000分)  未收 30元(3000分)  就餐人数 2 人
            （已取消那单 999元 既不计未收也不计人数）
09-20~09-21：实收 170元  未收 30元  人数 2 人
空区间 2026-01-01：{"payTotal":0,"noPayTotal":0,"totalPerson":0}
```

### 15.2 已删除的两个图（无数据源）

| 图 | 原接口 | 删除原因 |
| --- | --- | --- |
| 店内收款构成（饼图） | `payTypeCollect` / `datePayTypeCollect` | 本系统只有 `pay_method`（1微信 2支付宝）且是模拟支付，没有"多种收款方式"业务 |
| 优惠指标（列表） | `privilegeCollect` / `privilegeByDate` | 系统里**完全没有优惠/折扣业务**（无优惠券/满减表） |

前端 `ChartStats.tsx` 的对应 UI、状态、请求函数，以及 `api/legacy.ts` 里这 4 个封装函数都已删除（删完 `npx tsc --noEmit` 通过）。这 4 个后端接口本来也没实现，现在调用返回 404。

## 十六、Redis 初始化（新增 `RedisInitializer`）

项目原来只有 `RedisConfiguration`（建 `RedisTemplate`、设置 key 序列化器），**没有任何初始化逻辑**，`SHOP_STATUS` 要等管理员手动点一次"营业状态"开关才会存在。真实表现（实测确认）：

```
Redis 里没有 SHOP_STATUS
  → GET /user/shop/status / GET /admin/shop/status 里那行 status == 1 对 Integer 拆箱
  → NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because "<local1>" is null
  → 接口 HTTP 500（不是返回 null）
  → 用户端 Home.tsx 的 .catch(() => setShopOpen(true)) 把它兜成「营业中」
  → 管理端营业状态页显示"获取状态失败，请检查 Redis 是否可用"（其实是键不存在，不是 Redis 挂了）
```

> 注意：`DishServiceImpl` 里判断营业状态用的是 `StatusConstant.ENABLE.equals(status)`，**null 安全**（按"已打烊"处理），所以库存编辑那条链路不会 500。

新增 `sky-server/.../config/RedisInitializer.java`（`ApplicationRunner`，启动时执行），做两件事：

1. **探活**：`PING` 一次并打日志 —— Redis 挂了这个日志会明确告诉你（和 `MinioBucketInitializer` 的风格一致）
2. **初始化营业状态**：Redis 里**没有** `SHOP_STATUS` 才写入默认值，**绝不覆盖**管理员已设置的值

```yaml
# application.yml
sky:
  shop-status:
    default: 1      # 1=营业中 0=已打烊；只在键缺失时写一次
```

三种情况实测（用 `--sky.redis.database=1` 模拟"全新 Redis"、`--spring.redis.port=6399` 模拟"Redis 挂了"）：

| 场景 | 启动日志 | 结果 |
| --- | --- | --- |
| 键缺失（空库 db1） | `Redis 连接正常：PING -> PONG` + `Redis 缺少 SHOP_STATUS 键，已初始化为默认值 1（营业中）` | `/user/shop/status` → **1**（原来是 null） |
| 键已存在（db0=1） | `Redis 营业状态已存在：1（营业中），保持不变` | 不覆盖 ✅ |
| Redis 不可用（6399） | `WARN Redis 初始化未完成，Redis 未启动或不可用：Unable to connect to localhost:6399` | **应用照常启动**，登录接口 `code=1` ✅ |

> 注：验证"键缺失"时我用了 db1（项目不使用这个库），所以 Redis 的 **db1 里会残留一个 `SHOP_STATUS` 键**，与项目无关，可以忽略；db0 未受影响。
>
> 另外，`RedisConfiguration` 只设置了 **key** 的序列化器（`StringRedisSerializer`），**value** 仍是默认的 JDK 序列化（redis-cli 里看到的是二进制）。这是教程原样，改成 JSON 序列化会导致已有缓存不可读（含 `setmealCache`），需要单独评估，本次没动。

## 十七、Docker 环境（MySQL / Redis / MinIO 全部容器化）

三个中间件都已跑在 Docker 里，应用侧只用改 `application-dev.yml` 的数据库连接：

| 容器 | 镜像 | 宿主机端口 | 账号 | 应用配置位置 |
| --- | --- | --- | --- | --- |
| `mysql` | mysql（26.7.0） | **3307** → 3306 | `root` / `123` | `application-dev.yml`：`port: 3307`、`password: 123` |
| `redis` | redis:7 | 6379 | 无密码 | `application.yml`：`sky.redis.port: 6379` |
| `minio` | gowah/minio | 9000（控制台 9001） | `minioadmin` / `minioadmin` | `application.yml`：`sky.minio.*` |

### 17.1 数据迁移记录（本机 MySQL → 容器）

原来 `sky_take_out` 在本机原生 MySQL（3306，root/88888888），容器里只有另一个项目（hmall）的库。迁移过程：

```bash
# 1) 导出（--result-file 直接写文件，避免 PowerShell 重定向搞坏 UTF-8）
mysqldump --host=127.0.0.1 --port=3306 -uroot -p88888888 \
  --databases sky_take_out --single-transaction --default-character-set=utf8mb4 \
  --routines --triggers --events --result-file=sky_take_out_full.sql

# 2) 导入容器（mysql 客户端的 source 按字节读，UTF-8 安全）
mysql --host=127.0.0.1 --port=3307 -uroot -p123 --default-character-set=utf8mb4 \
  -e "source sky_take_out_full.sql"
```

- 导出文件：`sky-server/src/main/resources/db/sky_take_out_full.sql`（30 KB）
- 校验：11 张表行数**两边完全一致**
  `address_book=1, category=10, dish=24, dish_flavor=24, employee=2, order_detail=7, orders=4, setmeal=0, setmeal_dish=0, shopping_cart=12, user=9`
- 中文编码：用 `HEX(name)` 比对两边（`dish46=E78E8BE88081E59089`=王老吉、`cat11=E98592E6B0B4E9A5AEE69699`=酒水饮料）**完全一致**，没有乱码

### 17.2 ⚠️ 最大的坑：改了 `application-dev.yml` 必须重新打包

Spring Boot 的 jar 把 `application*.yml` **内嵌**在 `BOOT-INF/classes/` 里。只改源码配置文件、不重新 `mvn package`，跑起来还是旧配置。实测踩过：

```
改完 yml（3307/123）直接启动旧 jar
  → 通过接口新建的探针菜品落进了 3306（本机库），3307 里 0 条
  → 解开 jar 看 BOOT-INF/classes/application-dev.yml：还是 port: 3306 / password: 88888888
重新 mvn package 后再测
  → 3307 = 1 条、3306 = 0 条 ✅ 这才真的连上容器
```

所以每次改 `application*.yml` 都要：`mvn -o package -DskipTests` → 重启（IDE 里跑的话删掉 `target/classes` 重新编译更保险）。

### 17.3 三个中间件的验收证据

| 中间件 | 证据 |
| --- | --- |
| **MySQL（容器）** | 登录 `code=1`、`/admin/dish/page` total=24；接口新建探针菜品 → **只出现在 3307**；报表接口返回真实日期序列 |
| **Redis（容器）** | 启动日志 `Redis 连接正常：PING -> PONG`、`营业状态已存在：1（营业中），保持不变`；调 `PUT /admin/shop/0` → 用户端读到 `0`，切回 `1`；容器内 `INFO server` 显示 `os:Linux…WSL2 / redis_version:7.4.11`（原生 redis-server 已停）|
| **MinIO（容器）** | 启动日志由原来的 `WARN MinIO 初始化未完成…` 变成 `已创建 MinIO bucket：photo` + `已设置为公共读…`；上传 1×1 PNG 返回 `http://127.0.0.1:9000/photo/xxx.png`，**不带 token 访问该 URL → HTTP 200 / image/png / 70 字节**（公共读 OK）|

### 17.4 两个运维提醒

- ⚠️ 三个容器的**重启策略都是 `no`**：重启电脑 / Docker Desktop 后它们不会自动起来（Redis 挂了营业状态接口会 500、MinIO 挂了图片上传会失败）。建议：
  ```bash
  docker update --restart unless-stopped mysql redis minio
  ```
- redis / minio 的数据目录挂的是 `/opt/redis/data`、`/opt/minio/data`（Linux 路径，实际在 WSL / Docker VM 里），能持久化但不能直接从 Windows 资源管理器打开；mysql 的数据目录是 `F:/project/springcloud/root/mysql/data`（可见）。
- 验证时在 MinIO 的 `photo` 桶里留了一个 70 字节的探针图 `f40ffa7b-….png`，可在控制台（9001）删掉，留着也无影响。
- 📌 **数据修复记录**：`dish.id=69` 的 `name`/`description` 曾被双重编码（早期用 PowerShell `Invoke-RestMethod` 读接口时 PS 5.1 把 UTF-8 响应按 Latin-1 解码，再通过 `PUT /admin/dish` 回写导致）。已用 `sky-server/src/main/resources/db/fix_dish69_encoding.sql` 修回 `平菇豆腐汤` / `配料：豆腐，平菇`，并全表扫描确认无其它残留。

### 17.5 redis / minio 数据持久化修复（重要）

上面那行"能持久化但不能从资源管理器打开"的**实际后果**：Docker Desktop 重启后 `/opt/...` 这些路径被重置，**数据直接丢失**。实测证据：MinIO 的 bucket 被重新创建、Redis 里 `SHOP_STATUS` 键消失（而后端的 `RedisInitializer` 自动补回了 1，顾客端才没变成"已打烊"），而用 Windows 路径挂载的 MySQL **24 个菜品一条没少**。

而且这两个容器是用 `docker run` 起的（**没有任何 compose 标签**）、`restart=no`，所以 Docker 重启后 MinIO 根本不回来。

已按原配置重建（只改数据目录 + 加重启策略）：

```bash
docker rm -f redis minio
docker run -d --name redis --network hm-net -p 6379:6379 --restart unless-stopped \
  -v F:/project/springcloud/root/redis/data:/data -w /data redis:7 redis-server --appendonly yes
docker run -d --name minio --network hm-net -p 9000:9000 -p 9001:9001 --restart unless-stopped \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -v F:/project/springcloud/root/minio/data:/data \
  gowah/minio:RELEASE.2025-04-22T22-12-26Z server /data --console-address ":9001"
```

`docker restart minio redis` 之后的验证：

| 检查 | 结果 |
| --- | --- |
| 重启前上传的同一张图片 URL | **HTTP 200** ✅ |
| 重启前设为 0 的营业状态 | 仍是 **0** ✅（Redis 没被清空）|
| 宿主机文件 | `redis/data/dump.rdb`、`redis/data/appendonlydir/*.aof*`、`minio/data/photo`、`minio/data/.minio.sys/*` 资源管理器里可见 ✅ |

> ⚠️ 那份含 `- /opt/redis/data:/data` 老写法的 compose 文件以后如果还要用，记得同步改成 Windows 路径并加 `restart: unless-stopped`；否则 compose 会按老路径重建容器，数据又会丢。注意这些容器不是 compose 建的，直接 `docker compose up` 还可能撞容器名。

### 17.6 MinIO 图片改为永久保存（已落实并验证）

图片现在落在**宿主机真实目录**，不在容器内部的临时路径：

```
F:\project\springcloud\root\minio\data\photo\<对象名>\xl.meta     ← 宿主机可见、可备份
```

- 容器挂载：`-v F:/project/springcloud/root/minio/data:/data`
- 三个中间件的重启策略都改成了 `unless-stopped`（服务器/Docker 重启后自动回来）：`docker inspect mysql redis minio` → 全是 `unless-stopped` ✅
- 永久性实测：上传 2MB 图 → `docker restart minio` → 同一个 URL 仍然 **HTTP 200** ✅，宿主机文件 `Test-Path` 为 `True`
- 桶和"公共读"策略也存在数据目录里（`.minio.sys/`）；即使换了新目录，后端启动时的 `MinioBucketInitializer` 会自动重建桶并设回公共读
- 备份/恢复：
  ```bash
  tar czf /backup/sky-minio-$(date +%F).tar.gz F:/project/springcloud/root/minio/data
  # 恢复：停容器 → 拷回目录 → 起容器
  ```

### 17.7 顺便修掉的：上传大小限制（实测 2MB 必失败）

原来没有任何 `spring.servlet.multipart` 配置 → 用默认 **1MB**，而 `GlobalExceptionHandler` 没捕获 `MaxUploadSizeExceededException`，所以：

```
① 旧 jar 传 2MB        → HTTP 500 Internal Server Error（前端只弹"网络错误"，完全看不出是图太大）
② 加上 10MB 重新打包后再传同样的 2MB → {"code":1,"data":"http://localhost:9000/photo/…"} → 取回 HTTP 200 ✅
③ 对象落在宿主机：minio\data\photo\3a323cf9-….png  2048.4 KB ✅
```

> 部署时 nginx 也要放开：`client_max_body_size 20m;`（默认 1m，只改 Spring 仍会 413）

## 十九、部署（jar + nginx 裸跑，中间件用 Docker）

应用不打 Dockerfile，**jar 和前端静态文件直接放服务器**，中间件用 compose 装。仓库里 `deploy/` 目录已备好全部文件：

| 文件 | 用途 |
| --- | --- |
| `deploy/README.md` | **部署步骤 + 验收清单 + 安全清单**（先看这个）|
| `deploy/config/application-prod.yml` | 生产配置模板（放 jar 同级 `config/`，优先于 jar 内配置 → 同一份 jar 可部署多环境）|
| `deploy/docker-compose.middleware.yml` | mysql / redis / minio：端口只绑 `127.0.0.1`、数据落在 `/opt/sky/data/**`、`restart: unless-stopped` |
| `deploy/nginx.conf` | SPA 回退 + `/admin`（含 Accept 判断）+ `/user` + `/ws`（WebSocket 头）+ `/img`（反代 MinIO）+ `client_max_body_size` |
| `deploy/sky.service` | systemd：开机自启、崩溃重启、时区/编码/堆内存参数 |

关键点（详见 `deploy/README.md`）：
- **同机部署** → jar 里数据源写 `127.0.0.1:宿主机端口`（如 MySQL `3307`）；只有 `sky.minio.public-base-url` 必须写公网可达地址（那是给浏览器看的）
- 中间件端口只绑 `127.0.0.1` + 安全组只开 80/443 → 数据库/对象存储不暴露
- `-Duser.timezone=Asia/Shanghai -Dfile.encoding=UTF-8`（否则订单时间和预约提醒会差 8 小时）



## 十八、中英文双版本前端

同一份代码，通过构建时环境变量切换语言，**两个版本可以同时运行**。

| 版本 | 启动 | 端口 | 产物 |
| --- | --- | --- | --- |
| 中文（默认） | `npm run dev` / `npm run build` | 5173 | `dist/` |
| 英文 | `npm run dev:en` / `npm run build:en` | **5174** | `dist-en/` |
| 静态预览英文产物 | `npm run build:en` 后 `npm run preview:en` | 5174 | 走 `dist-en/`（`preview.proxy` 已配好，接口照样能通） |

> 访问入口一样：英文版 `http://localhost:5174/portal`（门户）、`/login`（用户登录）、`/admin/login`（管理端登录）；中文版把 5174 换成 5173。

### 18.1 设计：用中文原文当 key

`src/i18n/index.ts` 只导出一个 `tr(zh, params?)`：

```ts
tr('菜品管理')                       // 中文模式 → '菜品管理'（原样返回，行为与改造前完全一致）
                                     // 英文模式 → 'Dish management'（查 src/i18n/en.ts）
tr('共 {n} 条', { n: total })         // 插值，两种模式都会替换 {n}
```

- 字典 `src/i18n/en.ts` 的 key 就是中文原文 → 包装时代码里 `tr('删除')` 一眼能看懂
- 同一句话在多处出现**只翻译一次**（自动去重，555 条 UI 串最终 570 条词条）
- 漏翻时降级为中文，不会出现空白/undefined
- **后端返回的数据（菜名、分类名、员工名、地址、订单备注…）不经过 `tr()`，因此保持中文** —— 这是刻意设计

### 18.2 覆盖范围与"页面上看到的中文"

- 31 个文件、555 条去重 UI 串全部接入（每个文件都用 `tr()` 包了字符串字面量 / JSX 文本 / JSX 属性 / 对象里的 label / antd `message` 等）
- **antd 与 dayjs 自带的文案**也切换了：`src/main.tsx` 里 `ConfigProvider locale={isEn ? enUS : zhCN}`、`dayjs.locale('en')`（否则分页、空数据、日期选择器、Popconfirm 按钮会残留中文）
- `index.html` 的 `<title>` / `<html lang>` 通过 `%VITE_APP_TITLE%`、`%VITE_HTML_LANG%` 注入（英文版 = `Bread Takeaway` / `en`）

### 18.3 环境变量

| 文件 | 作用 |
| --- | --- |
| `.env` | 所有模式共用（Google Maps Key、`VITE_APP_TITLE`、`VITE_HTML_LANG`）|
| `.env.en` | 英文版：`VITE_LANG=en`、`VITE_PORT=5174`、英文标题 |

> ⚠️ `vite --mode en` **不会**读 `.env.development`，所以 Maps Key 从那里挪到了 `.env`（两版共用）。

### 18.4 维护工具（改完代码跑一下就知道漏没漏）

```bash
npm run i18n:unwrapped   # 代码里还有哪些中文没被 tr() 包（目标：0）
npm run i18n:missing     # 哪些中文串没进字典（目标：0）
npm run i18n:scan        # 统计：每个文件多少条中文
npm run i18n:dict        # 由 src/i18n/parts/*.json 重新生成 en.ts（机器生成，别手改）
```

`scripts/i18n-scan.mjs` 用 **TypeScript 编译器 AST** 分析（注释天然不算、不会把 JSX 里的引号误判成字符串），模板字符串会还原成 `{表达式}` 占位符形式。

### 18.5 验收证据

| 检查 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | 0 错误 |
| `i18n:unwrapped` | **0 处**（所有可见中文都过 `tr()`）|
| `i18n:missing` | **0 / 558** |
| 字典质量 | 570 条，**value 里没有一条含中文**，没有空值 |
| 渲染对比（Edge headless `--dump-dom`）| `/portal`：英文版**中文片段 0**、中文版 91（原样保留）；`/admin/login`：英文版 0、中文版 5 |
| 登录后的页面（用临时 seed 页写入 token 后渲染）| `admin/dashboard`、`admin/dishes`、`admin/orders`、`admin/statistics`、`/`、`/cart`、`/orders` 的**页面文案全英文**；出现的中文经核对全部来自数据库（菜名/分类/口味/用户名/地址/订单备注），符合"后端数据不翻译" |

### 18.6 两个坑

- **Vite 文件监听的 EBUSY（已从根上修掉）**：Windows 上"原子写"（编辑器/工具先写 `.xxx.tmpdir/xxx.tmp` 再改名）会让 chokidar 抛
  `EBUSY: resource busy or locked, watch ...`，**dev server 直接崩**（我们踩过 3 次，每次都是"改了个文件 dev server 就没了"）。
  现在 `vite.config.ts` 里加了 `server.watch.ignored`：`['**/.git/**','**/node_modules/**','**/*.tmp','**/*.tmpdir/**','**/*.swp','**/*~']`。
  实测：故意写一个 `.probe-watch-test.tmpdir/probe.tmp`，两个 dev server 都照常 200 ✅
- 两个 dev server 同时跑**没问题**（5173 + 5174 各一份），但都要连同一个后端（8080）。
- 开发环境如果发现服务"自己没了"，先看后台日志是不是被系统资源挤掉（同时跑多个 JVM + Docker 时遇到过）。



