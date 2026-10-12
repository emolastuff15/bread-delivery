import { request } from './client'
import type {
  AddressBook,
  Category,
  DishItem,
  DishVO,
  OrderSubmitResult,
  OrderVO,
  PageResult,
  Result,
  Setmeal,
  ShoppingCart,
} from '@/types'

// ---------- 店铺 ----------
/** 获取营业状态（免登录） */
export function getShopStatus() {
  return request<number>({ url: '/user/shop/status', method: 'get' })
}

// ---------- 分类 ----------
/** 根据类型查询分类：type=1 菜品分类 2 套餐分类 */
export function getUserCategoryList(type?: number) {
  return request<Category[]>({ url: '/user/category/list', method: 'get', params: { type } })
}

// ---------- 菜品 ----------
/** 根据分类id查询菜品 */
export function getUserDishList(categoryId: number) {
  return request<DishVO[]>({ url: '/user/dish/list', method: 'get', params: { categoryId } })
}

// ---------- 套餐 ----------
/** 根据分类id查询套餐 */
export function getUserSetmealList(categoryId: number) {
  return request<Setmeal[]>({ url: '/user/setmeal/list', method: 'get', params: { categoryId } })
}

/** 根据套餐id查询包含的菜品 */
export function getUserSetmealDishList(id: number) {
  return request<DishItem[]>({ url: `/user/setmeal/dish/${id}`, method: 'get' })
}

// ---------- 购物车 ----------
export interface CartPayload {
  dishId?: number
  setmealId?: number
  dishFlavor?: string
}

/** 加购 */
export function addToCart(data: CartPayload) {
  return request<Result>({ url: '/user/shoppingCard/add', method: 'post', data })
}

/** 减一 */
export function subFromCart(data: CartPayload) {
  return request<Result>({ url: '/user/shoppingCard/sub', method: 'post', data })
}

/** 购物车列表（注意：后端为 POST） */
export function getCartList() {
  return request<ShoppingCart[]>({ url: '/user/shoppingCard/list', method: 'post' })
}

/** 清空购物车 */
export function cleanCart() {
  return request<Result>({ url: '/user/shoppingCard/clean', method: 'delete' })
}

// ---------- 订单 ----------
export interface OrderSubmitPayload {
  addressBookId: number
  payMethod: number
  remark?: string
  estimatedDeliveryTime?: string
  deliveryStatus?: number
  tablewareNumber?: number
  tablewareStatus?: number
  packAmount?: number
  amount?: number
  /** 预定时间（传了就是预约单，格式 yyyy-MM-dd HH:mm:ss） */
  reservationTime?: string
}

/** 提交订单 */
export function submitOrder(data: OrderSubmitPayload) {
  return request<OrderSubmitResult>({ url: '/user/order/submit', method: 'post', data })
}

/**
 * 模拟支付（本项目未接入真实支付业务）
 * 点击"付款"即视为支付成功，后端会做状态流转：
 *   预约单 → 0 预约中；普通单 → 2 待接单
 */
export function mockPay(orderNumber: string) {
  return request<Result>({
    url: '/user/order/mockPay',
    method: 'put',
    data: { orderNumber, payMethod: 1 },
  })
}

/** 历史订单（status 不传为全部） */
export function getHistoryOrders(params: { page: number; pageSize: number; status?: number }) {
  return request<PageResult<OrderVO>>({ url: '/user/order/historyOrders', method: 'get', params })
}

/** 订单详情 */
export function getOrderDetail(id: number) {
  return request<OrderVO>({ url: `/user/order/orderDetail/${id}`, method: 'get' })
}

/** 取消订单 */
export function cancelOrder(id: number) {
  return request<Result>({ url: `/user/order/cancel/${id}`, method: 'put' })
}

/** 催单 */
export function reminderOrder(id: number) {
  return request<Result>({ url: `/user/order/reminder/${id}`, method: 'get' })
}

// ---------- 地址簿 ----------
export function getAddressList() {
  return request<AddressBook[]>({ url: '/user/addressBook/list', method: 'get' })
}

export function addAddress(data: AddressBook) {
  return request<Result>({ url: '/user/addressBook', method: 'post', data })
}

export function updateAddress(data: AddressBook) {
  return request<Result>({ url: '/user/addressBook', method: 'put', data })
}

export function deleteAddress(id: number) {
  return request<Result>({ url: '/user/addressBook', method: 'delete', params: { id } })
}

export function setDefaultAddress(data: { id: number }) {
  return request<Result>({ url: '/user/addressBook/default', method: 'put', data })
}

export function getDefaultAddress() {
  return request<AddressBook>({ url: '/user/addressBook/default', method: 'get' })
}
