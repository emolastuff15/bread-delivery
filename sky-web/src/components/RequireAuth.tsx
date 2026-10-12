import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken, getTokenType } from '@/api/client'

/** 用户端登录守卫：未登录先去门户页（/portal），而不是直接丢到登录页 */
export function UserGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const authed = getTokenType() === 'user' && !!getToken()
  if (!authed) {
    return <Navigate to="/portal" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

/** 管理端登录守卫 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const authed = getTokenType() === 'admin' && !!getToken()
  if (!authed) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
