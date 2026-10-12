import { create } from 'zustand'
import { clearToken, setToken } from '@/api/client'

export interface UserInfo {
  id: number
  username?: string
  name?: string
}

export interface AdminInfo {
  id: number
  userName: string
  name: string
}

const USER_INFO_KEY = 'sky_web_user_info'
const ADMIN_INFO_KEY = 'sky_web_admin_info'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

interface AuthState {
  userInfo: UserInfo | null
  adminInfo: AdminInfo | null
  setUserLogin: (token: string, info: UserInfo) => void
  setAdminLogin: (token: string, info: AdminInfo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userInfo: read<UserInfo>(USER_INFO_KEY),
  adminInfo: read<AdminInfo>(ADMIN_INFO_KEY),

  setUserLogin: (token, info) => {
    setToken(token, 'user')
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
    set({ userInfo: info })
  },

  setAdminLogin: (token, info) => {
    setToken(token, 'admin')
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info))
    set({ adminInfo: info })
  },

  logout: () => {
    clearToken()
    localStorage.removeItem(USER_INFO_KEY)
    localStorage.removeItem(ADMIN_INFO_KEY)
    set({ userInfo: null, adminInfo: null })
  },
}))
