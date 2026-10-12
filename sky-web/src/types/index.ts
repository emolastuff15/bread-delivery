// ============================================================
// 与后端 sky-take-out 对应的类型定义
// ============================================================

/** 后端统一返回结果 {code: 1成功, 0失败} */
export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
}

/** 分页返回 */
export interface PageResult<T = unknown> {
  total: number
  records: T[]
}

// ---------- 账号 ----------
export interface UserLoginVO {
  id: number
  openid?: string
  username?: string
  name?: string
  token: string
}

export interface EmployeeLoginVO {
  id: number
  userName: string
  name: string
  token: string
}

// ---------- 分类 ----------
export interface Category {
  id: number
  /** 1菜品分类 2套餐分类 */
  type: number
  name: string
  sort: number
  /** 0禁用 1启用 */
  status: number
  createTime?: string
  updateTime?: string
}

// ---------- 菜品 ----------
export interface DishFlavor {
  id?: number
  dishId?: number
  /** 口味名称 */
  name: string
  /** 口味数据（逗号分隔） */
  value: string
}

export interface Dish {
  id: number
  name: string
  categoryId: number
  price: number
  image: string
  description: string
  /** 0停售 1起售 */
  status: number
  /** 剩余库存（份数）。用户端接口不返回该字段 */
  number?: number
  createTime?: string
  updateTime?: string
  createUser?: number
  updateUser?: number
}

export interface DishVO extends Dish {
  categoryName?: string
  flavors: DishFlavor[]
}

// ---------- 套餐 ----------
export interface Setmeal {
  id: number
  categoryId: number
  name: string
  price: number
  /** 0停用 1启用 */
  status: number
  description: string
  image: string
  createTime?: string
  updateTime?: string
}

export interface SetmealDish {
  id?: number
  setmealId?: number
  dishId: number
  /** 冗余字段：菜品名称 */
  name?: string
  /** 菜品原价 */
  price?: number
  /** 份数 */
  copies: number
}

export interface SetmealVO extends Setmeal {
  categoryName?: string
  setmealDishes: SetmealDish[]
}

// ---------- 购物车 ----------
export interface ShoppingCart {
  id?: number
  name: string
  userId?: number
  dishId?: number
  setmealId?: number
  dishFlavor?: string
  number: number
  amount: number
  image: string
  createTime?: string
}

// ---------- 地址簿 ----------
export interface AddressBook {
  id?: number
  userId?: number
  /** 收货人 */
  consignee: string
  /** 性别 0女 1男 */
  sex?: string
  phone: string
  provinceCode?: string
  provinceName?: string
  cityCode?: string
  cityName?: string
  districtCode?: string
  districtName?: string
  /** 详细地址 */
  detail: string
  /** Google Place ID（选中地图终点后获得，必填才能保存） */
  placeId?: string
  /** 房间地址（门牌号/房间号），手动填写 */
  roomDetail?: string
  /** 标签（家/公司/学校） */
  label?: string
  /** 是否默认 0否 1是 */
  isDefault?: number
}

// ---------- 订单 ----------
export interface OrderDetail {
  id?: number
  name: string
  image?: string
  orderId?: number
  dishId?: number
  setmealId?: number
  dishFlavor?: string
  number: number
  amount: number
}

export interface Orders {
  id: number
  /** 订单号 */
  number: string
  /**
   * 订单状态
   * 0预约中(已付款,等预约时间到达) 1待付款 2待接单 3已接单 4派送中 5已完成 6已取消 7退款
   */
  status: number
  userId?: number
  addressBookId?: number
  /** 预约时间（预约单：非空表示这是预约单） */
  reservationTime?: string
  orderTime?: string
  checkoutTime?: string
  /** 支付方式 1微信 2支付宝 */
  payMethod?: number
  /** 支付状态 0未支付 1已支付 2退款 */
  payStatus?: number
  /** 实收金额 */
  amount?: number
  remark?: string
  userName?: string
  phone?: string
  address?: string
  consignee?: string
  cancelReason?: string
  rejectionReason?: string
  cancelTime?: string
  estimatedDeliveryTime?: string
  /** 配送状态 1立即送出 0选择具体时间 */
  deliveryStatus?: number
  deliveryTime?: string
  /** 打包费 */
  packAmount?: number
  /** 餐具数量 */
  tablewareNumber?: number
  /** 餐具数量状态 1按餐量提供 0选择具体数量 */
  tablewareStatus?: number
}

export interface OrderVO extends Orders {
  /** 订单菜品信息（文字描述） */
  orderDishes?: string
  orderDetailList?: OrderDetail[]
}

// ---------- 员工 ----------
export interface Employee {
  id?: number
  username: string
  name: string
  password?: string
  phone?: string
  /** 性别 0女 1男 */
  sex?: string
  idNumber?: string
  /** 0禁用 1启用 */
  status?: number
  createTime?: string
  updateTime?: string
}

// ---------- 工作台/报表（简要） ----------
export interface BusinessDataVO {
  turnover: number
  validOrderCount: number
  orderCompletionRate: number
  unitPrice: number
  newUsers: number
}

/** 套餐包含的菜品项（DishItemVO） */
export interface DishItem {
  name: string
  copies: number
  image: string
  description: string
}

/** 提交订单返回 */
export interface OrderSubmitResult {
  id: number
  orderNumber: string
  orderAmount: number
  orderTime: string
}

/** 订单统计 */
export interface OrderStatisticsVO {
  toBeConfirmed: number
  confirmed: number
  deliveryInProgress: number
}

// ---------- 报表（注意：列表字段都是逗号分隔字符串） ----------
export interface TurnoverReportVO {
  /** 日期，如 "2022-10-01,2022-10-02" */
  dateList: string
  /** 营业额，如 "406.0,1520.0" */
  turnoverList: string
}

export interface OrderReportVO {
  dateList: string
  orderCountList: string
  validOrderCountList: string
  totalOrderCount: number
  validOrderCount: number
  orderCompletionRate: number
}

export interface SalesTop10ReportVO {
  nameList: string
  numberList: string
}

// ---------- 工作台概览 ----------
export interface OrderOverViewVO {
  /** 待接单数量 */
  waitingOrders: number
  /** 待派送数量 */
  deliveredOrders: number
  /** 已完成数量 */
  completedOrders: number
  /** 已取消数量 */
  cancelledOrders: number
  /** 全部订单 */
  allOrders: number
}

export interface DishOverViewVO {
  /** 已启售数量 */
  sold: number
  /** 已停售数量 */
  discontinued: number
}

export interface SetmealOverViewVO {
  sold: number
  discontinued: number
}

/** 消息/通知（原版接口，后端未实现） */
export interface InformMessage {
  id?: number
  type?: number
  content?: string
  createTime?: string
  status?: number
  [key: string]: unknown
}
