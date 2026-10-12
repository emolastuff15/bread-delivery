import { create } from 'zustand'

/**
 * 预定时间（用户端）
 *
 * 顶栏"创建预约"与购物车"创建预定"共用同一个时间：
 *   - 顶栏选好时间后写入这里，再进购物车/结算页
 *   - 结算页下单时把这个时间作为 reservationTime 提交，即为"预约单"
 */
interface ReservationState {
  /** 格式 yyyy-MM-dd HH:mm:ss；null 表示普通订单 */
  reservationTime: string | null
  setReservationTime: (time: string | null) => void
}

export const useReservationStore = create<ReservationState>((set) => ({
  reservationTime: null,
  setReservationTime: (reservationTime) => set({ reservationTime }),
}))
