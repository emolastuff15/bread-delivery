import client, { request } from './client'
import type {
  BusinessDataVO,
  Category,
  Dish,
  DishOverViewVO,
  DishVO,
  Employee,
  OrderOverViewVO,
  OrderReportVO,
  OrderStatisticsVO,
  OrderVO,
  PageResult,
  Result,
  SalesTop10ReportVO,
  Setmeal,
  SetmealOverViewVO,
  SetmealVO,
  TurnoverReportVO,
} from '@/types'

// ==================== 员工管理 ====================
export function getEmployeePage(params: { page: number; pageSize: number; name?: string }) {
  return request<PageResult<Employee>>({ url: '/admin/employee/page', method: 'get', params })
}

export function addEmployee(data: Partial<Employee>) {
  return request<Result>({ url: '/admin/employee', method: 'post', data })
}

export function updateEmployee(data: Partial<Employee>) {
  return request<Result>({ url: '/admin/employee', method: 'put', data })
}

/** 修改当前登录员工的密码（empId 由后端从 token 解析，不需要前端传） */
export function editEmployeePassword(data: { oldPassword: string; newPassword: string }) {
  return request<Result>({ url: '/admin/employee/editPassword', method: 'put', data })
}

export function getEmployeeById(id: number) {
  return request<Employee>({ url: `/admin/employee/${id}`, method: 'get' })
}

/** status: 1启用 0禁用 */
export function setEmployeeStatus(id: number, status: number) {
  return request<Result>({ url: `/admin/employee/status/${status}`, method: 'post', params: { id } })
}

// ==================== 分类管理 ====================
export function getCategoryPage(params: { page: number; pageSize: number; name?: string; type?: number }) {
  return request<PageResult<Category>>({ url: '/admin/category/page', method: 'get', params })
}

/** 分类列表（不含分页），type: 1菜品 2套餐 */
export function getCategoryList(type?: number) {
  return request<Category[]>({ url: '/admin/category/list', method: 'get', params: { type } })
}

export function addCategory(data: Partial<Category>) {
  return request<Result>({ url: '/admin/category', method: 'post', data })
}

export function updateCategory(data: Partial<Category>) {
  return request<Result>({ url: '/admin/category', method: 'put', data })
}

export function deleteCategory(id: number) {
  return request<Result>({ url: '/admin/category', method: 'delete', params: { id } })
}

export function setCategoryStatus(id: number, status: number) {
  return request<Result>({ url: `/admin/category/status/${status}`, method: 'post', params: { id } })
}

// ==================== 菜品管理 ====================
export function getDishPage(params: { page: number; pageSize: number; name?: string; categoryId?: number }) {
  return request<PageResult<DishVO>>({ url: '/admin/dish/page', method: 'get', params })
}

export function addDish(data: Partial<DishVO>) {
  return request<Result>({ url: '/admin/dish', method: 'post', data })
}

export function updateDish(data: Partial<DishVO>) {
  return request<Result>({ url: '/admin/dish', method: 'put', data })
}

export function deleteDish(ids: number[]) {
  return request<Result>({ url: '/admin/dish', method: 'delete', params: { ids: ids.join(',') } })
}

export function getDishById(id: number) {
  return request<DishVO>({ url: `/admin/dish/${id}`, method: 'get' })
}

export function getDishListByCategory(categoryId: number) {
  return request<Dish[]>({ url: '/admin/dish/list', method: 'get', params: { categoryId } })
}

/** 添加库存：在现有库存上累加（营业中也可用） */
export function addDishStock(data: { id: number; number: number }) {
  return request<Result>({ url: '/admin/dish/stock/add', method: 'put', data })
}

/** 编辑库存：直接设置为目标值（仅打烊或菜品停售时后端才允许） */
export function editDishStock(data: { id: number; number: number }) {
  return request<Result>({ url: '/admin/dish/stock', method: 'put', data })
}

// ==================== 套餐管理 ====================
export function getSetmealPage(params: { page: number; pageSize: number; name?: string; categoryId?: number; status?: number }) {
  return request<PageResult<SetmealVO>>({ url: '/admin/setmeal/page', method: 'get', params })
}

export function addSetmeal(data: Partial<SetmealVO>) {
  return request<Result>({ url: '/admin/setmeal', method: 'post', data })
}

export function updateSetmeal(data: Partial<SetmealVO>) {
  return request<Result>({ url: '/admin/setmeal', method: 'put', data })
}

export function deleteSetmeal(ids: number[]) {
  return request<Result>({ url: '/admin/setmeal', method: 'delete', params: { ids: ids.join(',') } })
}

export function getSetmealById(id: number) {
  return request<SetmealVO>({ url: `/admin/setmeal/${id}`, method: 'get' })
}

export function getSetmealListByCategory(categoryId: number) {
  return request<Setmeal[]>({ url: '/admin/setmeal/list', method: 'get', params: { categoryId } })
}

// ==================== 订单管理 ====================
export function searchOrders(params: {
  page: number
  pageSize: number
  number?: string
  phone?: string
  status?: number
  beginTime?: string
  endTime?: string
  /** 预约时间区间（左闭右开），用于预定订单查询 */
  reservationBegin?: string
  reservationEnd?: string
}) {
  return request<PageResult<OrderVO>>({ url: '/admin/order/conditionSearch', method: 'get', params })
}

/** 今日预约单查询（后端会默认按"今天 + 预约中"过滤，仍可传参数覆盖） */
export function getTodayReservations(params?: {
  page?: number
  pageSize?: number
  status?: number
  reservationBegin?: string
  reservationEnd?: string
}) {
  return request<PageResult<OrderVO>>({
    url: '/admin/order/todayReservation',
    method: 'get',
    params,
  })
}

export function getOrderStatistics() {
  return request<OrderStatisticsVO>({ url: '/admin/order/statistics', method: 'get' })
}

export function getAdminOrderDetail(id: number) {
  return request<OrderVO>({ url: `/admin/order/details/${id}`, method: 'get' })
}

export function confirmOrder(id: number) {
  return request<Result>({ url: '/admin/order/confirm', method: 'put', data: { id } })
}

export function rejectOrder(id: number, rejectionReason: string) {
  return request<Result>({ url: '/admin/order/rejection', method: 'put', data: { id, rejectionReason } })
}

export function cancelOrderByAdmin(id: number, cancelReason: string) {
  return request<Result>({ url: '/admin/order/cancel', method: 'put', data: { id, cancelReason } })
}

export function deliveryOrder(id: number) {
  return request<Result>({ url: `/admin/order/delivery/${id}`, method: 'put' })
}

export function completeOrder(id: number) {
  return request<Result>({ url: `/admin/order/complete/${id}`, method: 'put' })
}

// ==================== 店铺营业状态 ====================
export function getAdminShopStatus() {
  return request<number>({ url: '/admin/shop/status', method: 'get' })
}

export function setAdminShopStatus(status: number) {
  return request<Result>({ url: `/admin/shop/${status}`, method: 'put' })
}

// ==================== 工作台 ====================
export function getBusinessData() {
  return request<BusinessDataVO>({ url: '/admin/workspace/businessData', method: 'get' })
}

/** 订单管理概览（各状态数量） */
export function getOverviewOrders() {
  return request<OrderOverViewVO>({ url: '/admin/workspace/overviewOrders', method: 'get' })
}

/** 菜品总览 */
export function getOverviewDishes() {
  return request<DishOverViewVO>({ url: '/admin/workspace/overviewDishes', method: 'get' })
}

/** 套餐总览 */
export function getOverviewSetmeals() {
  return request<SetmealOverViewVO>({ url: '/admin/workspace/overviewSetmeals', method: 'get' })
}

// ==================== 数据统计（报表） ====================
/** 营业额统计（列表字段为逗号分隔字符串） */
export function getTurnoverReport(begin: string, end: string) {
  return request<TurnoverReportVO>({
    url: '/admin/report/turnoverStatistics',
    method: 'get',
    params: { begin, end },
  })
}

/** 订单统计 */
export function getOrdersReport(begin: string, end: string) {
  return request<OrderReportVO>({
    url: '/admin/report/ordersStatistics',
    method: 'get',
    params: { begin, end },
  })
}

/** 销量排名 Top10 */
export function getTop10Report(begin: string, end: string) {
  return request<SalesTop10ReportVO>({
    url: '/admin/report/top10',
    method: 'get',
    params: { begin, end },
  })
}

/** 导出运营数据报表（Excel 二进制；接口需 token 头，故不能用 window.open） */
export async function exportReport(): Promise<Blob> {
  const blob = await client.get('/admin/report/export', { responseType: 'blob' })
  return blob as unknown as Blob
}

// ==================== 文件上传（MinIO，返回预签名URL） ====================
export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<string>({
    url: '/admin/common/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
