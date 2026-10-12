# 苍穹外卖（sky-take-out）后端接口清单文档

> 适用前端：Vite + React + TS + Ant Design
> 后端：Spring Boot（Maven 多模块 sky-common / sky-pojo / sky-server），默认端口 **8080**
> 文档版本：v1.0（依据当前 sky-server / sky-pojo 源码整理，含 3 个即将新增接口）
> 在线 Swagger/Knife4j 文档：`http://localhost:8080/doc.html`

---

## 目录

- [一、通用约定](#一通用约定)
- [二、用户端（C 端）接口](#二用户端c-端接口)
  - [2.1 用户认证（即将新增）](#21-用户认证即将新增)
  - [2.2 店铺状态](#22-店铺状态)
  - [2.3 分类](#23-分类)
  - [2.4 菜品](#24-菜品)
  - [2.5 套餐](#25-套餐)
  - [2.6 购物车](#26-购物车)
  - [2.7 订单](#27-订单)
  - [2.8 地址簿](#28-地址簿)
  - [2.9 通用上传（用户端）](#29-通用上传用户端)
  - [2.10 用户端调试副本接口（慎用）](#210-用户端调试副本接口慎用)
- [三、管理端（B 端）接口](#三管理端b-端接口)
  - [3.1 员工管理](#31-员工管理)
  - [3.2 分类管理](#32-分类管理)
  - [3.3 菜品管理](#33-菜品管理)
  - [3.4 套餐管理](#34-套餐管理)
  - [3.5 订单管理](#35-订单管理)
  - [3.6 购物车（管理员调试副本，慎用）](#36-购物车管理员调试副本慎用)
  - [3.7 店铺状态（管理端）](#37-店铺状态管理端)
  - [3.8 工作台](#38-工作台)
  - [3.9 数据报表](#39-数据报表)
  - [3.10 通用上传（管理端）](#310-通用上传管理端)
  - [3.11 支付回调](#311-支付回调)
- [四、附录](#四附录)
  - [4.1 实体 / 数据结构字段说明](#41-实体--数据结构字段说明)
  - [4.2 前端对接要点](#42-前端对接要点)

---

## 一、通用约定

### 1.1 统一响应包装 `Result<T>`

所有接口（除 `GET /admin/report/export`、`POST /notify/paySuccess` 两个特殊接口外）统一返回：

```json
{
  "code": 1,          // 1=成功，0=失败（msg 为错误信息）
  "msg": null,        // 成功时为 null，失败时为错误描述
  "data": {}          // 业务数据，可为对象 / 数组 / 基本类型 / null
}
```

- **HTTP 200**：请求被处理，业务是否成功看 `code`。
- **HTTP 401**：未登录或 token 无效/过期（拦截器直接返回 401，不走 Result 包装，响应体为空）。
- 失败示例：`{"code": 0, "msg": "用户名或密码错误", "data": null}`

### 1.2 分页响应 `PageResult`

```json
{
  "code": 1,
  "msg": null,
  "data": {
    "total": 100,       // 总记录数 (long)
    "records": [ ... ]  // 当前页数据集合 (List)
  }
}
```

### 1.3 鉴权约定

| 端 | 拦截路径 | 放行路径 | Token 请求头 | 说明 |
| --- | --- | --- | --- | --- |
| 管理端 | `/admin/**` | `/admin/employee/login` | `token` | 除登录外，管理端所有接口都要求 `token` 头 |
| 用户端 | `/user/**`（计划） | 注册 / 登录 / 修改密码 | `authentication` | 按开发计划：除上述 3 个接口外均要求 `authentication` 头 |
| 回调 | `/notify/**` | 全部 | 无 | 微信支付回调，不需要登录 |

> ⚠️ **现状说明（与代码保持一致）**：`JwtTokenAdminInterceptor` 已在 `WebMvcConfiguration` 中注册生效；`JwtTokenUserceptor`（用户端拦截器，从 `authentication` 头取 JWT，claims 中取 `userId` 写入 `BaseContext`）**已注册**，放行路径：`/user/user/login`、`/user/user/register`、`/user/shop/status`，其余 `/user/**` 均需 `authentication` 头。
>
> 注意：`token` / `authentication` 是 **HTTP 请求头（Header）名称**，不是 Cookie，也不是 URL 参数。

### 1.4 通用说明

- 时间格式：Query 参数日期使用 `yyyy-MM-dd`（报表接口），`LocalDateTime` 类型 JSON 使用 `yyyy-MM-dd HH:mm:ss`。
- 上传接口使用 `multipart/form-data`，字段名为 `file`。
- 金额字段类型为 `BigDecimal`（JSON 中为 number），传输时前端建议保留两位小数。
- 订单状态枚举：`1 待付款`、`2 待接单`、`3 已接单`、`4 派送中`、`5 已完成`、`6 已取消`、`7 退款`。
- 支付方式 `payMethod`：`1 微信`、`2 支付宝`。
- 启停状态 `status`：`0 停售/禁用`、`1 起售/启用`。

---

## 二、用户端（C 端）接口

> 基础路径：`/user/**`，除 2.1 节 3 个接口外均需登录（请求头 `authentication`）。

### 2.1 用户认证（即将新增）

> 后端正在开发中，按以下规格对接；路径前缀为 `/user/user`，不要与微信小程序登录（code 换 openid）混淆。

#### 2.1.1 POST /user/user/register —— 注册

| 项 | 内容 |
| --- | --- |
| 鉴权 | 无需登录 |
| Content-Type | `application/json` |

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户名（唯一，建议前端做重名校验） |
| password | string | 是 | 密码（后端 MD5 加密存储） |
| name | string | 否 | 姓名 |
| phone | string | 否 | 手机号 |

响应 `Result<UserLoginVO>`：注册成功 **直接返回 token**，前端保存后即可视为已登录：

```json
{
  "code": 1,
  "msg": null,
  "data": {
    "id": 1,
    "username": "zhangsan",
    "name": "张三",
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

#### 2.1.2 POST /user/user/login —— 用户名密码登录

| 项 | 内容 |
| --- | --- |
| 鉴权 | 无需登录 |
| Content-Type | `application/json` |

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

响应 `Result<UserLoginVO>`（字段：`id`、`username`、`name`、`token`）：

```json
{
  "code": 1,
  "msg": null,
  "data": {
    "id": 1,
    "username": "zhangsan",
    "name": "张三",
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

失败示例：`{"code": 0, "msg": "用户名或密码错误", "data": null}`

#### 2.1.3 PUT /user/user/editPassword —— 修改密码

| 项 | 内容 |
| --- | --- |
| 鉴权 | **需要登录**，请求头 `authentication: <token>` |
| Content-Type | `application/json` |

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码 |

响应：`Result`（无 data）`{"code": 1, "msg": null, "data": null}`；旧密码错误时 `{"code": 0, "msg": "旧密码错误", "data": null}`。

---

### 2.2 店铺状态

#### 2.2.1 GET /user/shop/status —— 获取营业状态

| 项 | 内容 |
| --- | --- |
| 鉴权 | 按计划需要登录（当前未强制） |
| 参数 | 无 |

响应 `Result<Integer>`：`data` 为 `1`（营业中）或 `0`（打烊中）。

```json
{ "code": 1, "msg": null, "data": 1 }
```

---

### 2.3 分类

> 注意：`/user/category` 与 `/admin/category` 的接口定义完全相同（user 包下是调试副本，见 2.10），C 端页面通常只需要下面第 2.3.6 的「根据类型查询分类」。

#### 2.3.1 POST /user/category —— 新增分类

- 鉴权：需要登录；Body `CategoryDTO`：`id`(Long,改时用)、`type`(Integer, 1菜品分类 2套餐分类)、`name`(String, 分类名称)、`sort`(Integer, 排序)。
- 响应：`Result`。

#### 2.3.2 GET /user/category/page —— 分类分页查询

- 鉴权：需要登录；Query：`page`(int, 页码, 必填)、`pageSize`(int, 每页条数, 必填)、`name`(String, 分类名称模糊)、`type`(Integer, 1菜品 2套餐)。
- 响应：`Result<PageResult>`，records 为 `Category` 数组（字段见 4.1.1）。

#### 2.3.3 DELETE /user/category?id=xx —— 删除分类

- 鉴权：需要登录；Query：`id`(Long, 分类id, 必填)。
- 响应：`Result`；被关联数据占用时 `code=0`（如「当前分类下关联了菜品，不能删除」）。

#### 2.3.4 PUT /user/category —— 修改分类

- 鉴权：需要登录；Body `CategoryDTO`（需带 `id`）。
- 响应：`Result`。

#### 2.3.5 POST /user/category/status/{status}?id=xx —— 启用/禁用分类

- 鉴权：需要登录；PathVariable：`status`(Integer, 0禁用 1启用)；Query：`id`(Long)。
- 响应：`Result`。

#### 2.3.6 GET /user/category/list?type=xx —— 根据类型查询分类（C 端首页用）

- 鉴权：按计划需要登录（当前未强制）。
- Query：`type`(Integer, 选填；不传查全部，1菜品分类 2套餐分类)。
- 响应：`Result<List<Category>>`，只返回 **启用中（status=1）** 的分类，按 `sort` 升序、`create_time` 降序。

```json
{
  "code": 1,
  "msg": null,
  "data": [
    { "id": 1, "type": 1, "name": "热销榜", "sort": 1, "status": 1, "createTime": "2024-01-01 10:00:00" }
  ]
}
```

---

### 2.4 菜品

#### 2.4.1 GET /user/dish/list?categoryId=xx —— 根据分类 id 查询起售菜品

| 项 | 内容 |
| --- | --- |
| 鉴权 | 按计划需要登录（当前未强制） |
| Query | `categoryId`(Long, 分类id, 必填) |

响应 `Result<List<DishVO>>`（只含 `status=1` 起售菜品）：

```json
{
  "code": 1,
  "msg": null,
  "data": [
    {
      "id": 1, "name": "鱼香肉丝", "categoryId": 1, "price": 23.50,
      "image": "http://127.0.0.1:9000/photo/xxx.jpg", "description": "微辣",
      "status": 1, "updateTime": "2024-01-01 10:00:00", "categoryName": "热销榜",
      "flavors": [ { "id": 1, "dishId": 1, "name": "辣度", "value": "[\"不辣\",\"微辣\",\"中辣\"]" } ]
    }
  ]
}
```

---

### 2.5 套餐

#### 2.5.1 GET /user/setmeal/list?categoryId=xx —— 根据分类 id 查询起售套餐

- 鉴权：按计划需要登录（当前未强制）；Query：`categoryId`(Long, 必填)。
- 响应：`Result<List<Setmeal>>`（仅 `status=1`，字段见 4.1.5）。

#### 2.5.2 GET /user/setmeal/dish/{id} —— 根据套餐 id 查询包含的菜品列表

- 鉴权：按计划需要登录（当前未强制）；PathVariable：`id`(Long, 套餐id)。
- 响应：`Result<List<DishItemVO>>`：

```json
{
  "code": 1, "msg": null,
  "data": [
    { "name": "鱼香肉丝", "copies": 1, "image": "http://...", "description": "微辣" }
  ]
}
```

> ⚠️ 安全修复：`POST /user/setmeal/status/{status}`、`/user/employee/**`（整套员工管理）、
> `/user/category` 下的增删改/启停/分页 **已全部移除**。它们原本是管理端接口被误复制到用户端路径，
> 而 `/user/**` 只校验用户端 JWT，任何注册顾客都能借此停售套餐、增删改分类、甚至拉出员工列表（含密码）。
> 管理端功能统一走 `/admin/**`。

---

### 2.6 购物车

> 注意：用户端「展示购物车」接口是 **POST**（非 GET）。

#### 2.6.1 POST /user/shoppingCard/add —— 添加购物车

| 项 | 内容 |
| --- | --- |
| 鉴权 | 需要登录 |
| Body `ShoppingCartDTO` | `dishId`(Long, 菜品id, 与 setmealId 二选一)、`setmealId`(Long, 套餐id)、`dishFlavor`(String, 口味, 选填) |

响应：`Result`。加购相同商品时数量自动 +1。

#### 2.6.2 POST /user/shoppingCard/list —— 展示购物车

- 鉴权：需要登录；无参数。
- 响应：`Result<List<ShoppingCart>>`（字段见 4.1.7）。

#### 2.6.3 DELETE /user/shoppingCard/clean —— 清空购物车

- 鉴权：需要登录；无参数。
- ⚠️ **注意**：当前 Controller 直接 `return null;`，响应体为空（HTTP 200），前端需要按「成功」容错处理（不要强依赖 `code` 字段）。

---

### 2.7 订单

#### 2.7.1 POST /user/order/submit —— 用户下单

| 项 | 内容 |
| --- | --- |
| 鉴权 | 需要登录 |
| Body `OrdersSubmitDTO` | 见下表 |

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| addressBookId | Long | 是 | 地址簿 id |
| payMethod | int | 是 | 支付方式：1微信 2支付宝 |
| remark | string | 否 | 备注 |
| estimatedDeliveryTime | string | 否 | 预计送达时间 `yyyy-MM-dd HH:mm:ss` |
| deliveryStatus | Integer | 否 | 配送状态：1 立即送出，0 选择具体时间 |
| tablewareNumber | Integer | 否 | 餐具数量 |
| tablewareStatus | Integer | 否 | 餐具数量状态：1 按餐量提供，0 选择具体数量 |
| packAmount | Integer | 否 | 打包费 |
| amount | number | 是 | 总金额（BigDecimal） |

- ⚠️ **注意**：Controller 声明返回 `Result<OrdersSubmitDTO>` 但当前实现 `return null;`（待完善）。预期返回 `Result<OrderSubmitVO>`：

```json
{
  "code": 1, "msg": null,
  "data": { "id": 1, "orderNumber": "171000000000001", "orderAmount": 23.50, "orderTime": "2024-03-10 12:00:00" }
}
```

#### 2.7.2 PUT /user/order/payment —— 订单支付

- 鉴权：需要登录；Body `OrdersPaymentDTO`：`orderNumber`(String, 订单号, 必填)、`payMethod`(Integer, 支付方式)。
- 响应：`Result<OrderPaymentVO>`：

```json
{
  "code": 1, "msg": null,
  "data": {
    "nonceStr": "随机字符串", "paySign": "签名", "timeStamp": "时间戳",
    "signType": "签名算法", "packageStr": "prepay_id 参数值"
  }
}
```

> ⚠️ 当前 `OrderServiceImpl.payment` 实现暂为 `return null`（微信支付联调待完善），前端需容错。

#### 2.7.3 GET /user/order/historyOrders?page=1&pageSize=10&status=2 —— 历史订单

- 鉴权：需要登录；Query：`page`(int, 必填)、`pageSize`(int, 必填)、`status`(Integer, 选填，订单状态过滤)。
- 响应：`Result<PageResult>`，records 为 `OrderVO` 数组（= `Orders` 全部字段 + `orderDishes`(String) + `orderDetailList`(List\<OrderDetail\>)，见 4.1.8 / 4.1.9）。

#### 2.7.4 GET /user/order/orderDetail/{id} —— 订单详情

- 鉴权：需要登录；PathVariable：`id`(Long, 订单id)。
- 响应：`Result<OrderVO>`（同上）。

#### 2.7.5 PUT /user/order/cancel/{id} —— 取消订单

- 鉴权：需要登录；PathVariable：`id`(Long)。
- ⚠️ **注意**：当前 Controller `return null;`（响应体为空，HTTP 200），前端按成功容错；仅状态 ≤2（待付款/待接单）可取消，否则 `code=0`。

#### 2.7.6 GET /user/order/reminder/{id} —— 客户催单

- 鉴权：需要登录；PathVariable：`id`(Long, 订单id)。
- 响应：`Result`；催单通过 WebSocket 推送商家端，超时可返回 `code=0`。

---

### 2.8 地址簿

#### 2.8.1 GET /user/addressBook/list —— 查询当前用户所有地址

- 鉴权：需要登录；无参数（自动按 token 中 userId 过滤）。
- 响应：`Result<List<AddressBook>>`。

#### 2.8.2 POST /user/addressBook —— 新增地址

- 鉴权：需要登录；Body `AddressBook`（userId 由后端从 token 取，前端可不传；字段见 4.1.2）。
- 响应：`Result`。

#### 2.8.3 GET /user/addressBook/{id} —— 根据 id 查询地址

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result<AddressBook>`。

#### 2.8.4 PUT /user/addressBook —— 根据 id 修改地址

- 鉴权：需要登录；Body `AddressBook`（需带 `id`；可改 `consignee/sex/phone/detail/label/isDefault`）。
- 响应：`Result`。

#### 2.8.5 PUT /user/addressBook/default —— 设置默认地址

- 鉴权：需要登录；Body：`{"id": 1}`（只需 id，后端会将该地址置为默认并取消其他默认）。
- 响应：`Result`。

#### 2.8.6 DELETE /user/addressBook?id=xx —— 根据 id 删除地址

- 鉴权：需要登录；Query：`id`(Long, 必填)。
- 响应：`Result`。

#### 2.8.7 GET /user/addressBook/default —— 查询默认地址

- 鉴权：需要登录；无参数。
- 响应：`Result<AddressBook>`；无默认地址时 `{"code": 0, "msg": "没有查询到默认地址", "data": null}`。

---

### 2.9 通用上传（用户端）

#### 2.9.1 POST /user/common/upload —— 上传文件

| 项 | 内容 |
| --- | --- |
| 鉴权 | 需要登录 |
| Content-Type | `multipart/form-data` |
| Form 字段 | `file`(File, 必填) |

响应 `Result<String>`，`data` 为图片访问 URL（MinIO 预签名 URL，**7 天有效期**）：

```json
{ "code": 1, "msg": null, "data": "http://127.0.0.1:9000/photo/xxxx-xxxx.jpg?X-Amz-..." }
```

---

### 2.10 ~~用户端调试副本接口~~（已删除 · 越权修复）

> **已修复（安全）**：以下接口是把管理端整套功能复制到 `/user/**` 下的副本。
> `/user/**` 只校验用户端 JWT（`JwtTokenUserceptor`），因此**任何注册顾客拿着自己的 token 就能调用**：
> 实测 `GET /user/employee/page` 能拉出全部员工（含明文密码 `admin/123456`）、
> `POST /user/category` 能增删改分类、`POST /user/setmeal/status/0?id=x` 能把套餐停售。
>
> 处理方式：
>
> | 原路径 | 处理 |
> | --- | --- |
> | `/user/employee/**`（login/POST/logout/page/status/{id}/PUT） | **整个 Controller 已删除**（前端从未调用） |
> | `/user/category`（POST/page/DELETE/PUT/status/{status}） | **已删除**，仅保留 `GET /user/category/list?type=`（C 端菜单需要，见 2.3.6） |
> | `/user/setmeal/status/{status}` | **已移到** `POST /admin/setmeal/status/{status}`（见 3.4.8） |
>
> 管理端功能现在只存在于 `/admin/**`，由 `JwtTokenAdminInterceptor` + 管理员 JWT 保护。

---

## 三、管理端（B 端）接口

> 基础路径：`/admin/**`，除 `POST /admin/employee/login` 外**全部需要登录**（请求头 `token`）。

### 3.1 员工管理

#### 3.1.1 POST /admin/employee/login —— 员工登录（唯一免登录接口）

| 项 | 内容 |
| --- | --- |
| 鉴权 | 无需登录 |
| Body `EmployeeLoginDTO` | `username`(String, 必填)、`password`(String, 必填) |

响应 `Result<EmployeeLoginVO>`：

```json
{
  "code": 1, "msg": null,
  "data": { "id": 1, "userName": "admin", "name": "管理员", "token": "eyJhbGciOiJIUzI1NiJ9..." }
}
```

> 登录失败（账号不存在/密码错误/账号被锁定）返回 `code=0` 及错误信息。

#### 3.1.2 POST /admin/employee —— 新增员工

- 鉴权：需要登录；Body `EmployeeDTO`：`id`(Long)、`username`(String, 必填)、`name`(String, 必填)、`phone`(String)、`sex`(String)、`idNumber`(String, 身份证号)。
- 响应：`Result`；用户名重复时 `code=0`（"账号已存在"）。默认密码由后端初始化。

#### 3.1.3 POST /admin/employee/logout —— 退出登录

- 鉴权：需要登录（仍要求 token 头）。
- 响应：`Result`（后端不做 token 吊销，前端删除本地 token 即可）。

#### 3.1.4 GET /admin/employee/page?page=1&pageSize=10&name=xx —— 员工分页查询

- 鉴权：需要登录；Query：`page`(int, 必填)、`pageSize`(int, 必填)、`name`(String, 姓名模糊, 选填)。
- 响应：`Result<PageResult>`，records 为 `Employee` 数组（**含 password 字段**，前端注意不要展示）。

#### 3.1.5 POST /admin/employee/status/{status}?id=xx —— 启用/禁用员工账号

- 鉴权：需要登录；PathVariable：`status`(Integer, 0禁用 1启用)；Query：`id`(Long, 必填)。
- 响应：`Result`；不允许禁用当前登录账号（`code=0`）。

#### 3.1.6 GET /admin/employee/{id} —— 根据 id 查询员工（编辑回显）

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result<Employee>`。

#### 3.1.7 PUT /admin/employee —— 编辑员工信息

- 鉴权：需要登录；Body `EmployeeDTO`（需带 `id`）。
- 响应：`Result`。

#### 3.1.8 PUT /admin/employee/editPassword —— 修改当前登录员工的密码 ✅ 新增

- 鉴权：需要登录；Body：`{ "oldPassword": string, "newPassword": string }`。
- 说明：`empId` **不用前端传**，后端从 token（`BaseContext.getCurrentId()`）取，避免越权改别人的密码。
- 响应：`Result`；旧密码错误返回 `code=0` + "密码错误"。
- 密码格式：**写入统一存 MD5**；登录时明文与 MD5 两种格式都接受（兼容历史明文账号，见 4.2.3 第 9 条）。

---

### 3.2 分类管理

#### 3.2.1 POST /admin/category —— 新增分类

- 鉴权：需要登录；Body `CategoryDTO`：`type`(Integer, 1菜品分类 2套餐分类, 必填)、`name`(String, 必填)、`sort`(Integer, 排序)。
- 响应：`Result`；同名分类会失败 `code=0`。

#### 3.2.2 GET /admin/category/page —— 分类分页查询

- 鉴权：需要登录；Query：`page`(int, 必填)、`pageSize`(int, 必填)、`name`(String, 选填)、`type`(Integer, 选填)。
- 响应：`Result<PageResult>`，records 为 `Category`（按 `sort` 升序、`create_time` 降序）。

#### 3.2.3 DELETE /admin/category?id=xx —— 删除分类

- 鉴权：需要登录；Query：`id`(Long, 必填)。
- 响应：`Result`；分类下有菜品/套餐时 `code=0`（"当前分类下关联了菜品，不能删除"）。

#### 3.2.4 PUT /admin/category —— 修改分类

- 鉴权：需要登录；Body `CategoryDTO`（需带 `id`，可改 `type/name/sort/status`）。
- 响应：`Result`。

#### 3.2.5 POST /admin/category/status/{status}?id=xx —— 启用/禁用分类

- 鉴权：需要登录；PathVariable：`status`(Integer, 0禁用 1启用)；Query：`id`(Long, 必填)。
- 响应：`Result`。

#### 3.2.6 GET /admin/category/list?type=xx —— 根据类型查询分类（下拉选择用）

- 鉴权：需要登录；Query：`type`(Integer, 选填)。
- 响应：`Result<List<Category>>`（仅启用中的分类，同 2.3.6）。

---

### 3.3 菜品管理

#### 3.3.1 POST /admin/dish —— 新增菜品

- 鉴权：需要登录；Body `DishDTO`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Long | 否 | 新增时不需要 |
| name | string | 是 | 菜品名称 |
| categoryId | Long | 是 | 分类 id |
| price | number | 是 | 价格（BigDecimal） |
| image | string | 是 | 图片 URL（先调上传接口） |
| description | string | 否 | 描述 |
| status | Integer | 是 | 0停售 1起售 |
| flavors | DishFlavor[] | 否 | 口味列表：`{name, value}`，value 为 JSON 字符串数组（如 `["不辣","微辣"]`） |
| number | Integer | 否 | 初始库存（份）。**不传 = 后端默认 100**，传 0 表示真的 0 份，传负数报错 |

- 响应：`Result`。

#### 3.3.2 GET /admin/dish/page —— 菜品分页查询

- 鉴权：需要登录；Query：`page`(int, 必填)、`pageSize`(int, 必填)、`name`(String, 选填)、`categoryId`(Integer, 选填)、`status`(Integer, 选填)。
- 响应：`Result<PageResult>`，records 为 `DishVO`（= Dish + `categoryName` + `flavors`，见 4.1.4）。

#### 3.3.3 DELETE /admin/dish?ids=1,2,3 —— 菜品批量删除

- 鉴权：需要登录；Query：`ids`(List\<Long\>, 逗号分隔多个 id)。
- 响应：`Result`；含起售菜品时删除失败 `code=0`（"起售中的菜品不能删除"）；被套餐关联时也失败。

#### 3.3.4 GET /admin/dish/{id} —— 根据 id 查询菜品（编辑回显）

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result<DishVO>`（含 flavors 列表）。

#### 3.3.5 PUT /admin/dish —— 修改菜品

- 鉴权：需要登录；Body `DishDTO`（需带 `id`，flavors 全量提交，后端先删后插）。
- 注意：`number` 虽然在 DTO 里，但**修改菜品不会改库存**（update SQL 不含 `number`），库存只能走 3.3.7 / 3.3.8。
- 响应：`Result`。

#### 3.3.6 GET /admin/dish/list?categoryId=xx —— 根据分类 id 查询菜品（含停售）

- 鉴权：需要登录；Query：`categoryId`(Long)。
- 响应：`Result<List<Dish>>`（实体字段，无 flavors）。

#### 3.3.7 PUT /admin/dish/stock/add —— 添加菜品库存（只能增）

- 鉴权：需要登录；Body：`{ "id": Long, "number": Integer }`，`number` 必须 > 0。
- 行为：`UPDATE dish SET number = number + #{number} WHERE id = #{id}`，营业中也可操作。
- 响应：`Result`；`number` 为空或 ≤ 0 时 `code=0`。

#### 3.3.8 PUT /admin/dish/stock —— 编辑菜品库存（直接设置）

- 鉴权：需要登录；Body：`{ "id": Long, "number": Integer }`，`number` ≥ 0。
- 规则：仅当【店铺已打烊】或【该菜品已停售】时才允许；营业中且菜品在售时返回 `code=0`（"店铺营业中且菜品在售，只能添加库存，不能直接修改库存数量"）。
- 说明：店铺状态取自 Redis `SHOP_STATUS`，取不到时按"已打烊"处理。
- 响应：`Result`。

> 库存字段 `dish.number` 只出现在管理端接口（`/admin/dish/**`、`/admin/dish/page`）；用户端 `/user/dish/list` 返回的 `DishVO.number` 恒为 `null`。

---

### 3.4 套餐管理

#### 3.4.1 POST /admin/setmeal —— 新增套餐

- 鉴权：需要登录；Body `SetmealDTO`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Long | 否 | 新增时不需要 |
| categoryId | Long | 是 | 分类 id（套餐分类） |
| name | string | 是 | 套餐名称 |
| price | number | 是 | 套餐价格 |
| status | Integer | 是 | 0停用 1启用 |
| description | string | 否 | 描述 |
| image | string | 是 | 图片 URL |
| setmealDishes | SetmealDish[] | 是 | 套餐内菜品：`{dishId, name, price, copies}`（id/setmealId 可不传） |

- 响应：`Result`。

#### 3.4.2 GET /admin/setmeal/page —— 套餐分页查询

- 鉴权：需要登录；Query：`page`(int, 必填)、`pageSize`(int, 必填)、`name`(String, 选填)、`categoryId`(Integer, 选填)、`status`(Integer, 选填)。
- 响应：`Result<PageResult>`，records 为 `SetmealVO`（= Setmeal + `categoryName` + `setmealDishes`）。

#### 3.4.3 DELETE /admin/setmeal?ids=1,2 —— 套餐批量删除

- 鉴权：需要登录；Query：`ids`(List\<Long\>, 逗号分隔)。
- 响应：`Result`；起售中的套餐不能删除（`code=0`）。

#### 3.4.4 GET /admin/setmeal/{id} —— 根据 id 查询套餐（编辑回显）

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result<SetmealVO>`（含 setmealDishes）。

#### 3.4.5 PUT /admin/setmeal —— 修改套餐

- 鉴权：需要登录；Body `SetmealDTO`（需带 `id`）。
- 响应：`Result`。

#### 3.4.6 GET /admin/setmeal/list?categoryId=xx —— 根据分类 id 查询起售套餐

- 鉴权：需要登录；Query：`categoryId`(Long)。
- 响应：`Result<List<Setmeal>>`（仅 status=1）。

#### 3.4.7 GET /admin/setmeal/dish/{id} —— 根据套餐 id 查询包含的菜品

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result<List<DishItemVO>>`（`{name, copies, image, description}`）。

#### 3.4.8 POST /admin/setmeal/status/{status}?id=xx —— 套餐起售/停售

- 鉴权：需要登录；PathVariable：`status`(Integer, 0停售 1起售)；Query：`id`(Long, 套餐id)。
- 响应：`Result`；套餐内含停售菜品时起售失败 `code=0`（"套餐内包含未启售菜品，无法启售"）。
- 缓存：带 `@CacheEvict("setmealCache", allEntries=true)`，启停后顾客端立刻生效。
- 说明：该接口原先错放在用户端 `POST /user/setmeal/status/{status}`，已移回管理端（原路径已删除）。

---

### 3.5 订单管理

#### 3.5.1 GET /admin/order/conditionSearch —— 订单搜索（分页）

- 鉴权：需要登录；Query：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | int | 是 | 页码 |
| pageSize | int | 是 | 每页条数 |
| number | string | 否 | 订单号模糊 |
| phone | string | 否 | 手机号模糊 |
| status | Integer | 否 | 订单状态（1待付款 2待接单 3已接单 4派送中 5已完成 6已取消 7退款） |
| beginTime | string | 否 | 开始时间 `yyyy-MM-dd HH:mm:ss` |
| endTime | string | 否 | 结束时间 `yyyy-MM-dd HH:mm:ss` |
| userId | Long | 否 | 用户 id（一般不用） |

- 响应：`Result<PageResult>`，records 预期为 `OrderVO` 数组（含 `orderDishes`、`orderDetailList`）。
- ⚠️ ~~**注意**：当前 `OrderServiceImpl.conditionSearch` 实现 `return null;`~~ —— **已修复**，现返回 `PageResult`。

#### 3.5.2 GET /admin/order/statistics —— 订单统计（各状态数量）

- 鉴权：需要登录；无参数。
- 响应：`Result<OrderStatisticsVO>`：

```json
{
  "code": 1, "msg": null,
  "data": { "toBeConfirmed": 5, "confirmed": 3, "deliveryInProgress": 2 }
}
```

#### 3.5.3 GET /admin/order/details/{id} —— 订单详情

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result<OrderVO>`（Orders 全部字段 + `orderDishes` + `orderDetailList`）。

#### 3.5.4 PUT /admin/order/confirm —— 接单

- 鉴权：需要登录；Body `OrdersConfirmDTO`：`id`(Long, 必填)、`status`(Integer, 订单状态)。
- 响应：`Result`。

#### 3.5.5 PUT /admin/order/rejection —— 拒单

- 鉴权：需要登录；Body `OrdersRejectionDTO`：`id`(Long, 必填)、`rejectionReason`(String, 拒单原因)。
- 响应：`Result`；仅待接单（status=2）订单可拒，否则 `code=0`。

#### 3.5.6 PUT /admin/order/cancel —— 取消订单

- 鉴权：需要登录；Body `OrdersCancelDTO`：`id`(Long, 必填)、`cancelReason`(String, 取消原因)。
- 响应：`Result`。

#### 3.5.7 PUT /admin/order/delivery/{id} —— 派送订单

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result`。

#### 3.5.8 PUT /admin/order/complete/{id} —— 完成订单

- 鉴权：需要登录；PathVariable：`id`(Long)。
- 响应：`Result`。

---

### 3.6 购物车（管理员调试副本，慎用）

> 与用户端购物车逻辑相同，仅路径不同，管理员调试用，前端不建议调用。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /admin/shoppingCard/add | 添加购物车（Body `ShoppingCartDTO`） |
| POST | /admin/shoppingCard/list | 展示购物车（按当前登录人查询） |

---

### 3.7 店铺状态（管理端）

#### 3.7.1 PUT /admin/shop/{status} —— 设置营业状态

- 鉴权：需要登录；PathVariable：`status`(Integer, 1营业中 0打烊中)。
- 响应：`Result`；状态存于 Redis 键 `SHOP_STATUS`。

#### 3.7.2 GET /admin/shop/status —— 获取营业状态

- 鉴权：需要登录；无参数。
- 响应：`Result<Integer>`（1营业 0打烊）。
- 说明：`SHOP_STATUS` 这个键由 `RedisInitializer` 在**应用启动时初始化**（缺失才写，默认值见 `sky.shop-status.default`，默认 1=营业中），所以正常情况下不会再返回 `null`。

---

### 3.8 工作台

| 接口 | 方法 | 路径 | 响应 |
| --- | --- | --- | --- |
| 今日数据 | GET | /admin/workspace/businessData | `Result<BusinessDataVO>` |
| 订单管理数据 | GET | /admin/workspace/overviewOrders | `Result<OrderOverViewVO>` |
| 菜品总览 | GET | /admin/workspace/overviewDishes | `Result<DishOverViewVO>` |
| 套餐总览 | GET | /admin/workspace/overviewSetmeals | `Result<SetmealOverViewVO>` |

- 鉴权：全部需要登录；均无请求参数。

响应字段：

```json
// BusinessDataVO
{ "turnover": 1234.5, "validOrderCount": 10, "orderCompletionRate": 0.9, "unitPrice": 123.45, "newUsers": 3 }

// OrderOverViewVO
{ "waitingOrders": 2, "deliveredOrders": 1, "completedOrders": 5, "cancelledOrders": 1, "allOrders": 9 }

// DishOverViewVO / SetmealOverViewVO
{ "sold": 8, "discontinued": 2 }
```

---

### 3.9 数据报表

> Query 参数 `begin`、`end` 均为日期，格式 **yyyy-MM-dd**（`@DateTimeFormat` 解析）。

| 接口 | 方法 | 路径 | Query | 响应 |
| --- | --- | --- | --- | --- |
| 营业额统计 | GET | /admin/report/turnoverStatistics | begin, end | `Result<TurnoverReportVO>` |
| 订单统计 | GET | /admin/report/ordersStatistics | begin, end | `Result<OrderReportVO>` |
| 销量排名 Top10 | GET | /admin/report/top10 | begin, end | `Result<SalesTop10ReportVO>` |
| 菜品分类占比（当日） | GET | /admin/report/categoryCollect/{type}/{date} | 无（PathVariable） | `Result<List<ChartValueVO>>`（见 3.9.5） |
| 菜品分类占比（时间段） | GET | /admin/report/dateCategoryCollect/{type}/{start}/{end} | 无（PathVariable） | `Result<List<ChartValueVO>>`（见 3.9.6） |
| 菜单销售排行（时间段，金额分） | GET | /admin/report/dishRankForDate/{start}/{end} | 无（PathVariable） | `Result<ChartXYVO>`（见 3.9.7） |
| 菜单销售排行（当日，销量） | GET | /admin/report/currentDishRank/{date} | 无（PathVariable） | `Result<ChartXYVO>`（见 3.9.8） |
| 时段销售趋势（区间按天） | GET | /admin/report/dayAmountCollect/{type}/{start}/{end} | 无（PathVariable） | `Result<ChartXYVO>`（见 3.9.9） |
| 时段销售趋势（当日按小时） | GET | /admin/report/hourCollect/{type}/{date} | 无（PathVariable） | `Result<ChartXYVO>`（见 3.9.10） |
| 顶部数据（当日） | GET | /admin/report/amountCollect/{date} | 无（PathVariable） | `Result<ChartTopVO>`（见 3.9.11） |
| 顶部数据（时间段） | GET | /admin/report/dayCollect/{start}/{end} | 无（PathVariable） | `Result<ChartTopVO>`（见 3.9.12） |
| 运营数据报表导出 | GET | /admin/report/export | 无 | Excel 文件流（**非 Result 包装**，直接用 `response.getOutputStream()` 输出 xlsx，前端用 blob 下载） |

- 鉴权：全部需要登录。

响应字段（日期/数值均为**逗号分隔的字符串**，前端 split 后渲染图表）：

```json
// TurnoverReportVO
{ "dateList": "2024-03-01,2024-03-02", "turnoverList": "406.0,1520.0" }

// OrderReportVO
{
  "dateList": "2024-03-01,2024-03-02",
  "orderCountList": "260,210",
  "validOrderCountList": "20,21",
  "totalOrderCount": 470,
  "validOrderCount": 41,
  "orderCompletionRate": 0.087
}

// SalesTop10ReportVO
{ "nameList": "鱼香肉丝,宫保鸡丁", "numberList": "260,215" }
```

#### 3.9.5 GET /admin/report/categoryCollect/{type}/{date} —— 菜品分类占比（当日）✅ 新增

- 鉴权：需要登录；PathVariable：`type`(Integer, 1按金额 2按销量)、`date`(yyyy-MM-dd)。
- 响应：`Result<List<ChartValueVO>>`，按 value 降序：

```json
[
  { "name": "酒水饮料", "value": 8000, "percent": 95.24 },
  { "name": "传统主食", "value": 400,  "percent": 4.76  }
]
```

- ⚠️ `type=1` 时 `value` 单位是**分**（库里 `order_detail.amount` 是元，SQL 里 ×100）；前端 `ChartStats.tsx` 会 `/100` 显示成元。
- `type=2` 时 `value` 是**销量份数**。

#### 3.9.6 GET /admin/report/dateCategoryCollect/{type}/{start}/{end} —— 菜品分类占比（时间段）✅ 新增

- 与 3.9.5 同口径，只把单日换成 `start`/`end` 区间（当天 = 00:00:00 ~ 23:59:59.999999999）。
- 例：`/admin/report/dateCategoryCollect/1/2026-09-01/2026-09-30`。
- 统计口径：`orders.status = 5`（已完成）；套餐下单项 `dish_id` 为 null 会被 join 过滤，**套餐销量不计入分类饼图**。

#### 3.9.7 GET /admin/report/dishRankForDate/{start}/{end} —— 菜单销售排行（时间段）✅ 新增

- 鉴权：需要登录；PathVariable：`start`、`end`(yyyy-MM-dd)。
- 响应：`Result<ChartXYVO>`，即 `{ "xaxis": ["王老吉","北冰洋"], "series": [9900, 5000] }`
- ⚠️ **单位是分**：前端 `toXYData(res, true)` 会 `/100` 还原成元后再画柱状图（`ChartStats.tsx:277`）。
- 口径：`orders.status=5`，按 `order_detail.name` 分组取前 10（**套餐也会进入排行**，因为没有 join dish）。

#### 3.9.8 GET /admin/report/currentDishRank/{date} —— 菜单销售排行（当日）✅ 新增

- 鉴权：需要登录；PathVariable：`date`(yyyy-MM-dd)。
- 响应：`Result<ChartXYVO>`，即 `{ "xaxis": ["米饭","北冰洋"], "series": [8, 5] }`
- ⚠️ **单位是销量份数**：前端 `toXYData(res, false)` **不除 100**（`ChartStats.tsx:363`），所以这里返回份数，和 3.9.7 的金额口径不同（原版就这么设计的）。

#### 3.9.9 GET /admin/report/dayAmountCollect/{type}/{start}/{end} —— 时段销售趋势（区间按天）✅ 新增

- 鉴权：需要登录；PathVariable：`type`(1金额 2单数)、`start`、`end`。
- 响应：`Result<ChartXYVO>`，**区间内每一天都有一个刻度（没单的补 0）**，x 轴标签为 `MM-dd`：

```json
{ "xaxis": ["09-09","09-10","09-11"], "series": [0, 18000, 0] }
```

- ⚠️ `type=1` 时 `series` 是**分**（前端 `toXYData(res, tA===1)` 会 `/100`）。
- 口径：`orders.status=5`，金额取 `sum(orders.amount)`（**与"营业额统计"同口径，含打包费**）。
- 周报/月报不用后端换算，前端已把周/月算成 `start`/`end` 传进来。

#### 3.9.10 GET /admin/report/hourCollect/{type}/{date} —— 时段销售趋势（当日按小时）✅ 新增

- 鉴权：需要登录；PathVariable：`type`、`date`。
- 响应：`Result<ChartXYVO>`，固定 **24 个刻度** `["0时","1时",…,"23时"]`，没单的小时补 0：

```json
{ "xaxis": ["0时","1时","…","23时"], "series": [0,0,…,5000,13000,…] }
```

- 单位同 3.9.9（type=1 是分）。
- ⚠️ MySQL 8 `only_full_group_by`：按小时分组时 `group by` 表达式必须与 select 里**完全一致**（`cast(hour(order_time) as char)`），不能写成 `group by hour(order_time)`，否则报 `Expression #1 of SELECT list is not in GROUP BY clause`。

#### 3.9.11 GET /admin/report/amountCollect/{date} —— 顶部数据（当日）✅ 新增

- 鉴权：需要登录；PathVariable：`date`(yyyy-MM-dd)。
- 响应：`Result<ChartTopVO>`：

```json
{ "payTotal": 15000, "noPayTotal": 3000, "totalPerson": 2 }
```

| 字段 | 含义 | 口径 |
| --- | --- | --- |
| payTotal | 实收金额（**分**，前端 /100） | `pay_status=1`（已支付）的订单金额合计 |
| noPayTotal | 未收金额（**分**） | `pay_status=0` 且**未取消**（`status not in (6,7)`）的金额合计 |
| totalPerson | 就餐人数 | 该时间段内下单的**去重用户数** `count(distinct user_id)`，同样排除已取消/退款订单 |

- 空区间返回 `0` 而不是 `null`。

#### 3.9.12 GET /admin/report/dayCollect/{start}/{end} —— 顶部数据（时间段）✅ 新增

- 与 3.9.11 同口径，把单日换成 `start`/`end` 区间。前端周报/月报走这个接口。
- 例：`/admin/report/dayCollect/2026-09-01/2026-09-30`。

> ❌ **已按需求删除的 4 个接口**（原版有，本项目不实现，调用返回 404）：
> `payTypeCollect`、`datePayTypeCollect`（店内收款构成）、`privilegeCollect`、`privilegeByDate`（优惠指标）
> —— 系统里没有优惠/折扣业务，也没有多种收款方式，没有数据来源，前端对应 UI 已删除。


---

### 3.10 通用上传（管理端）

#### 3.10.1 POST /admin/common/upload —— 上传文件

| 项 | 内容 |
| --- | --- |
| 鉴权 | 需要登录 |
| Content-Type | `multipart/form-data` |
| Form 字段 | `file`(File, 必填) |

响应：`Result<String>`，`data` 为图片 URL（MinIO 预签名，7 天有效）。菜品/套餐的 `image` 字段直接存该 URL。

---

### 3.11 支付回调

#### 3.11.1 POST /notify/paySuccess —— 微信支付成功回调

| 项 | 内容 |
| --- | --- |
| 鉴权 | 无需登录（不在 /admin/**、/user/** 拦截范围内） |
| 方法 | `@RequestMapping`（GET/POST 均可匹配，微信实际用 POST） |
| 请求体 | 微信支付 V3 回调密文 JSON（resource.ciphertext / nonce / associated_data） |

- 处理逻辑：解密 → 取 `out_trade_no`（商户订单号）、`transaction_id` → 更新订单状态为待接单、支付状态为已支付 → WebSocket 推送商家端来单提醒。
- 响应（非 Result 包装，给微信的应答）：

```json
{ "code": "SUCCESS", "message": "SUCCESS" }
```

> 前端**不需要**调用此接口，仅用于后端与微信对接。

---

## 四、附录

### 4.1 实体 / 数据结构字段说明

#### 4.1.1 Category（分类）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Long | 主键 |
| type | Integer | 1 菜品分类，2 套餐分类 |
| name | String | 分类名称 |
| sort | Integer | 排序 |
| status | Integer | 0 禁用，1 启用 |
| createTime / updateTime | LocalDateTime | 创建/更新时间 |
| createUser / updateUser | Long | 创建/修改人 |

#### 4.1.2 AddressBook（地址簿）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Long | 主键 |
| userId | Long | 用户 id（前端一般不传） |
| consignee | String | 收货人 |
| phone | String | 手机号 |
| sex | String | 性别（0女 1男） |
| provinceCode / provinceName | String | 省编码/名称 |
| cityCode / cityName | String | 市编码/名称 |
| districtCode / districtName | String | 区编码/名称 |
| detail | String | 详细地址 |
| label | String | 标签（如 家/公司） |
| isDefault | Integer | 0 非默认，1 默认 |

#### 4.1.3 Dish（菜品实体）

`id, name, categoryId, price(BigDecimal), image, description, status(0/1), createTime, updateTime, createUser, updateUser`

#### 4.1.4 DishVO（菜品+口味+分类名，列表/详情返回）

= Dish 字段 + `categoryName`(String) + `flavors`(List\<DishFlavor\>)

DishFlavor：`id`(Long)、`dishId`(Long)、`name`(String, 口味名)、`value`(String, 口味选项 JSON 字符串，如 `["不辣","微辣"]`)

#### 4.1.5 Setmeal（套餐实体）

`id, categoryId, name, price(BigDecimal), status(0停用 1启用), description, image, createTime, updateTime, createUser, updateUser`

#### 4.1.6 SetmealDish（套餐-菜品关系）

`id, setmealId, dishId, name, price, copies(份数)`

#### 4.1.7 ShoppingCart（购物车）

`id, name, userId, dishId, setmealId, dishFlavor, number(数量), amount(金额), image, createTime`

#### 4.1.8 Orders（订单）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Long | 主键 |
| number | String | 订单号 |
| status | Integer | 1待付款 2待接单 3已接单 4派送中 5已完成 6已取消 7退款 |
| userId | Long | 下单用户 id |
| addressBookId | Long | 地址簿 id |
| orderTime / checkoutTime | LocalDateTime | 下单/结账时间 |
| payMethod | Integer | 支付方式 1微信 2支付宝 |
| payStatus | Integer | 0未支付 1已支付 2退款 |
| amount | BigDecimal | 实收金额 |
| remark | String | 备注 |
| userName / phone / address / consignee | String | 用户名/手机号/地址/收货人 |
| cancelReason / rejectionReason | String | 取消/拒单原因 |
| cancelTime / deliveryTime | LocalDateTime | 取消/送达时间 |
| estimatedDeliveryTime | LocalDateTime | 预计送达时间 |
| deliveryStatus | Integer | 1立即送出 0选择具体时间 |
| packAmount | int | 打包费 |
| tablewareNumber | int | 餐具数量 |
| tablewareStatus | Integer | 1按餐量提供 0选择具体数量 |

#### 4.1.9 OrderDetail（订单明细）

`id, name, orderId, dishId, setmealId, dishFlavor, number(数量), amount(金额), image`

#### 4.1.10 OrderVO（订单详情/列表返回）

= Orders 全部字段 + `orderDishes`(String, 订单菜品汇总文本) + `orderDetailList`(List\<OrderDetail\>)

#### 4.1.11 Employee（员工）

`id, username, name, password(⚠️查询会返回), phone, sex, idNumber, status(0禁用 1启用), createTime, updateTime, createUser, updateUser`

#### 4.1.12 User（C 端用户，注册/登录相关）

`id, openid, username, password(MD5), name, phone, sex, idNumber, avatar, createTime`

### 4.2 前端对接要点

#### 4.2.1 登录后保存的 Token 头名称

| 端 | 登录接口 | 保存字段 | 后续请求头 |
| --- | --- | --- | --- |
| 管理端（B 端） | POST /admin/employee/login | 响应 `data.token` | `token: <jwt>` |
| 用户端（C 端） | POST /user/user/login（新增）/ POST /user/user/register（新增，直接返回 token） | 响应 `data.token` | `authentication: <jwt>` |

- Axios 拦截器建议统一注入；管理端与用户端是**两套不同的 JWT**（secret 不同、claims 不同），不要混用。
- 收到 HTTP 401 时：清除本地 token 并跳转登录页。
- 收到 `code=0` 时：用 `msg` 提示用户。

#### 4.2.2 BaseContext 用户 id 来源（JWT claims）

后端通过拦截器解析 JWT 并写入 ThreadLocal（`BaseContext`），Controller/Service 直接取 `BaseContext.getCurrentId()` 得到当前用户 id：

| 端 | 拦截器 | JWT claims 键 | BaseContext 中含义 |
| --- | --- | --- | --- |
| 管理端 | JwtTokenAdminInterceptor | `empId` | 当前员工 id |
| 用户端 | JwtTokenUserceptor | `userId` | 当前用户 id |

- 前端**不需要也不应该**把 userId 放在请求参数里（如地址簿新增、历史订单查询、购物车操作），后端一律从 token 解析，前端传了也会被忽略/覆盖。
- 常量定义见 `JwtClaimsConstant`（`EMP_ID = "empId"`、`USER_ID = "userId"`、另有 `phone / username / name` 预留）。

#### 4.2.3 已知坑点提醒（对接时注意）

1. `POST /user/shoppingCard/list` 是 **POST** 不是 GET。
2. ~~`DELETE /user/shoppingCard/clean`、`POST /user/order/submit`、`PUT /user/order/cancel/{id}` 当前实现返回空响应体（`return null`）~~ —— **已修复**，现正常返回 `Result`。
3. ~~`GET /admin/order/conditionSearch` 当前实现返回 null~~ —— **已修复**，现正常返回 `PageResult`。
4. 用户端 `GET /user/addressBook/default` 无默认地址时返回 `code=0` + msg"没有查询到默认地址"，属正常业务分支。
5. 管理端 `/admin/employee/logout` 仍要求 `token` 头。
6. 上传返回的 MinIO 预签名 URL 只有 7 天有效期，正式环境建议改走公开桶/自有域名（需后端配合）。
7. ~~套餐起售/停售接口在用户端路径 `POST /user/setmeal/status/{status}`~~ —— **已修复（越权）**：移到 `POST /admin/setmeal/status/{status}`（见 3.4.8）。
8. ~~`/user/category`、`/user/employee` 为调试副本接口~~ —— **已删除（越权修复，见 2.10）**；`/admin/shoppingCard` 仍在（受管理端 JWT 保护，仅调试用）。
9. 员工密码格式：**库里可能是明文（老数据）也可能是 MD5（新建员工/改密码后写入）**，`login` 两种都接受。因此 `admin/123456` 无论存成哪种都能登；改密码接口（3.1.8）统一写入 MD5。
10. 员工分页查询的姓名搜索曾经一用就 500 —— `EmployeeMapper.xml` 的 `<if test="name !=' '">` 中 `' '` 在 OGNL 里是 **char 字面量**，与 String 比较走数值转换 → `NumberFormatException: For input string: "admin"`；**已修复**为 `name != ''`。
11. `/admin/report/top10` 曾经 500：`OrderMapper.xml` 里 `limit 0,10` 被写成 `` `limit` 0,10 ``，MySQL 8 的 LIMIT 子句位置不接受反引号；**已去掉反引号**。
12. chart 页的 12 个原版报表接口里，**`categoryCollect`（当日）与 `dateCategoryCollect`（时间段）已实现**（见 3.9.5 / 3.9.6），其余 10 个仍是 404（前端容错成空图）。

---

## 接口总数统计

> 统计口径：从 `sky-server/src/main/java/com/sky/controller/**` 的注解自动提取（2026-09 现状）。

| 模块 | 数量 |
| --- | --- |
| 用户端 `/user/**`（店铺/分类/菜品/套餐/购物车/订单/地址簿/上传/注册登录改密） | ~35 |
| 管理端 `/admin/**`（员工/分类/菜品含库存/套餐/订单/店铺/工作台/报表/上传/购物车调试） | ~60 |
| 支付回调 `/notify/paySuccess` | 1 |
| **合计** | **约 100** |

> 变更记录（本轮）：
> - 删除 `/user/employee/**`（7 个）与 `/user/category` 下的增删改/启停/分页（5 个）—— 越权修复
> - `/user/setmeal/status/{status}` → `/admin/setmeal/status/{status}` —— 越权修复
> - 新增 `/admin/dish/stock/add`、`/admin/dish/stock`（库存）、`/admin/employee/editPassword`（改密码）
