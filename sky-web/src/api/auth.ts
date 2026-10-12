import { request } from './client'
import type { EmployeeLoginVO, Result, UserLoginVO } from '@/types'

// ---------- 用户端账号 ----------
export interface UserRegisterPayload {
  username: string
  password: string
  name?: string
  phone?: string
}

export interface UserLoginPayload {
  username: string
  password: string
}

export interface UserPasswordEditPayload {
  oldPassword: string
  newPassword: string
}

/** 用户注册（成功直接返回 token，免登录） */
export function userRegister(data: UserRegisterPayload) {
  return request<UserLoginVO>({ url: '/user/user/register', method: 'post', data })
}

/** 用户登录（用户名密码） */
export function userLogin(data: UserLoginPayload) {
  return request<UserLoginVO>({ url: '/user/user/login', method: 'post', data })
}

/** 修改密码 */
export function userEditPassword(data: UserPasswordEditPayload) {
  return request<Result>({ url: '/user/user/editPassword', method: 'put', data })
}

// ---------- 管理端账号 ----------
export function adminLogin(data: { username: string; password: string }) {
  return request<EmployeeLoginVO>({ url: '/admin/employee/login', method: 'post', data })
}

export function adminLogout() {
  return request<Result>({ url: '/admin/employee/logout', method: 'post' })
}
