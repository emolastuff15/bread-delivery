/**
 * ⚠️ 原版（Vue 管理端）接口照搬层
 *
 * 说明：这些接口路径来自教程原版前端（project-sky-admin-vue-ts），
 * 但**当前 sky-take-out 后端并未实现它们**（原版前端对接的是黑马自己的演示服务器）。
 * 按需求"全部照搬"保留，调用时后端会返回 404 —— 页面功能可能不可用，
 * 仅作为页面结构/交互的完整移植。
 *
 * 若后续要真正可用，需要在后端补：
 *   - /admin/report/{amountCollect,dayCollect,hourCollect,payTypeCollect,privilegeCollect,categoryCollect,
 *                    currentDishRank,dayAmountCollect,datePayTypeCollect,dateCategoryCollect,
 *                    dishRankForDate,privilegeByDate}
 *
 * 现状（2026-09）：
 *   ✅ 已实现：amountCollect、dayCollect、hourCollect、dayAmountCollect、
 *             categoryCollect、dateCategoryCollect、currentDishRank、dishRankForDate
 *   ❌ 已按需求删除：payTypeCollect / datePayTypeCollect（店内收款构成）、
 *             privilegeCollect / privilegeByDate（优惠指标）—— 无数据源
 *   - /admin/messages/{page,countUnread,batch,{id}}   （原版路径为 /messages/*）
 *   - /admin/dish/status/{status}       （菜品启停，后端缺接口；用 PUT /admin/dish 改 status 代替）
 *
 * 已补齐、不再属于本文件的接口：
 *   - PUT /admin/employee/editPassword  ✅ 后端已实现（见 api/admin.ts 的 editEmployeePassword）
 */
import { request } from './client'
import type { InformMessage, PageResult, Result } from '@/types'

/**
 * 原版接口统一走静默请求：失败不弹全局错误提示。
 * 原因：这些接口当前后端未实现，页面（chart / inform）挂载时会并发多个请求，
 * 若走默认拦截器会一次弹出多条"网络错误"提示，干扰使用。
 */
function legacyRequest<T = unknown>(config: Parameters<typeof request>[0]) {
  return request<T>({ ...config, silent: true })
}

// ==================== 报表（chart 页，原版 /report/*） ====================

/** 获取当日销售数据 - 顶部数据 */
export function getDataes(date: string) {
  return legacyRequest({ url: `/admin/report/amountCollect/${date}`, method: 'get' })
}

/** 营收概况 */
export function getChartsDataes(start: string, end: string) {
  return legacyRequest({ url: `/admin/report/dayCollect/${start}/${end}`, method: 'get' })
}

/** 销售趋势（24小时） */
export function getDayDataes(type: number | string, date: string) {
  return legacyRequest({ url: `/admin/report/hourCollect/${type}/${date}`, method: 'get' })
}

/** 菜品分类占比 - 当日 */
export function getSalesRanking(type: number | string, date: string) {
  return legacyRequest({ url: `/admin/report/categoryCollect/${type}/${date}`, method: 'get' })
}

/** 当日菜品销售排行 */
export function getDayRanking(date: string) {
  return legacyRequest({ url: `/admin/report/currentDishRank/${date}`, method: 'get' })
}

/** 销售趋势（时间段） */
export function getTimeQuantumDataes(type: number | string, start: string, end: string) {
  return legacyRequest({ url: `/admin/report/dayAmountCollect/${type}/${start}/${end}`, method: 'get' })
}

/** 菜品分类占比 - 时间段 */
export function getTimeQuantumType(type: number | string, start: string, end: string) {
  return legacyRequest({ url: `/admin/report/dateCategoryCollect/${type}/${start}/${end}`, method: 'get' })
}

/** 菜品销售排行 - 时间段 */
export function getTimeQuantumDishes(start: string, end: string) {
  return legacyRequest({ url: `/admin/report/dishRankForDate/${start}/${end}`, method: 'get' })
}

// ==================== 消息/通知（原版 /messages/*） ====================
export function getMessagesPage(params: { page: number; pageSize: number; type?: number }) {
  return legacyRequest<PageResult<InformMessage>>({ url: '/admin/messages/page', method: 'get', params })
}

export function getCountUnread() {
  return legacyRequest<number>({ url: '/admin/messages/countUnread', method: 'get' })
}

export function readMessagesBatch(ids: number[]) {
  return legacyRequest<Result>({ url: '/admin/messages/batch', method: 'put', data: ids })
}

export function deleteMessage(id: number) {
  return legacyRequest<Result>({ url: `/admin/messages/${id}`, method: 'delete' })
}

// ==================== 菜品启停（原版 /dish/status/{status}） ====================
export function setDishStatus(id: number, status: number) {
  return legacyRequest<Result>({ url: `/admin/dish/status/${status}`, method: 'post', params: { id } })
}
