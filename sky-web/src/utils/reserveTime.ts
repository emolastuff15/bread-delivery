import dayjs, { type Dayjs } from 'dayjs'

/**
 * 预约时间规则（前端统一在这里定义，ReserveTimeModal 与结算页共用）
 *
 *   1. 只能是**整点**：16:00、18:00 ✅ ；15:30、16:20 ❌
 *   2. 至少比**当前时间**晚 1 小时（给现烤留出备餐时间）
 *
 * 举例（"现在" → 最早可预约）：
 *   15:00 → 16:00      15:30 → 17:00（16:00 只剩半小时，不够）
 *   15:59 → 17:00      16:00 → 17:00
 *   23:30 → 次日 01:00
 *
 * 注：如果希望改成"把当前时间截断到整点再加 1 小时"（15:30 → 16:00），
 * 只需把 earliestReserveTime 里的 now 换成 now.startOf('hour')。
 */

/** 预约至少要提前多少分钟 */
export const RESERVE_MIN_LEAD_MINUTES = 60

/** 最早可以预约的时间点：now + 1 小时，向上取整到整点 */
export function earliestReserveTime(now: Dayjs = dayjs()): Dayjs {
  const min = now.add(RESERVE_MIN_LEAD_MINUTES, 'minute')
  const onTheHour = min.minute() === 0 && min.second() === 0 && min.millisecond() === 0
  return onTheHour ? min : min.startOf('hour').add(1, 'hour')
}

/** 是否是合法的预约时间（整点 + 不早于最早可预约时间） */
export function isValidReserveTime(value: Dayjs | null | undefined, now: Dayjs = dayjs()): boolean {
  if (!value || !value.isValid()) return false
  if (value.minute() !== 0 || value.second() !== 0) return false
  return !value.isBefore(earliestReserveTime(now))
}

/** 把选中的时间规整到整点（防止面板里带出分钟/秒） */
export function normalizeReserveTime(value: Dayjs): Dayjs {
  return value.startOf('hour')
}

/** DatePicker：整天都不可选的日期（当天可选时间已过完时就整日禁用） */
export function reserveDisabledDate(current: Dayjs | null): boolean {
  if (!current) return false
  return current.endOf('day').isBefore(earliestReserveTime())
}

/** DatePicker：禁用"最早可预约那天"里更早的小时；并且**永远禁用非 0 分钟**（保证只能选整点） */
export function reserveDisabledTime(date: Dayjs | null): {
  disabledHours?: () => number[]
  disabledMinutes?: () => number[]
} {
  // 分钟只留 00（antd 的 minuteStep 最大只到 59，所以用禁用来实现"整点"）
  const allMinutes = Array.from({ length: 60 }, (_, m) => m).filter((m) => m !== 0)
  const base = { disabledMinutes: () => allMinutes }

  const earliest = earliestReserveTime()
  if (!date || !date.isSame(earliest, 'day')) return base

  const earliestHour = earliest.hour()
  return {
    ...base,
    disabledHours: () => Array.from({ length: 24 }, (_, h) => h).filter((h) => h < earliestHour),
  }
}

/** DatePicker 的时间面板显示格式（分钟位固定显示 00） */
export const RESERVE_SHOW_TIME = { format: 'HH:00' } as const
