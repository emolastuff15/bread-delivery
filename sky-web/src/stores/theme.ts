import { create } from 'zustand'

/**
 * 用户端主题
 *   - 默认：深蓝色
 *   - 创建预定后（或存在"预约中"订单时）：暖色调
 *
 * 说明：warm 状态不落 localStorage，而是由后端事实推导（是否存在 status=0 的预约单），
 *      这样刷新页面后主题与订单状态始终一致。
 */
interface ThemeState {
  warm: boolean
  setWarm: (warm: boolean) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  warm: false,
  setWarm: (warm) => set({ warm }),
}))
