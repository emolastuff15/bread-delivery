import axios, { type AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import type { Result } from '@/types'
import { tr } from '@/i18n'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * 置为 true 时：请求失败不弹全局错误提示。
     * 用于"原版照搬、但当前后端未实现"的接口（见 api/legacy.ts），避免并发 404 刷屏。
     */
    silent?: boolean
  }
}

/** 用户端 token 头名（与后端 user-token-name 一致） */
export const USER_TOKEN_KEY = 'authentication'
/** 管理端 token 头名（与后端 admin-token-name 一致） */
export const ADMIN_TOKEN_KEY = 'token'

export const TOKEN_STORAGE_KEY = 'sky_web_token'
export const TOKEN_TYPE_KEY = 'sky_web_token_type' // 'user' | 'admin'

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

export function getTokenType(): 'user' | 'admin' | null {
  return (localStorage.getItem(TOKEN_TYPE_KEY) as 'user' | 'admin' | null) || null
}

export function setToken(token: string, type: 'user' | 'admin') {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(TOKEN_TYPE_KEY, type)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_TYPE_KEY)
}

const client = axios.create({
  baseURL: '', // 走 vite 代理：/admin、/user -> http://localhost:8080
  timeout: 15000,
})

// 请求拦截器：自动携带对应类型的 token
client.interceptors.request.use((config) => {
  const token = getToken()
  const type = getTokenType()
  if (token && type) {
    const headerKey = type === 'admin' ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY
    // axios v1 在拦截器阶段 headers 一定是 AxiosHeaders 实例，直接按索引写入即可
    ;(config.headers as unknown as Record<string, string>)[headerKey] = token
  }
  return config
})

// 响应拦截器：统一处理 Result 包装与错误
// 说明：这里把后端的 Result 包装直接"拆壳"返回给上层，因此返回类型与 axios 默认的
// AxiosResponse 不一致，用 any 标注避免类型噪音（实际由 request<T>() 收口为业务数据）
client.interceptors.response.use(
  (response): any => {
    const res = response.data as Result
    // 后端业务码：1 成功
    if (res && typeof res.code === 'number') {
      if (res.code === 1) {
        return res
      }
      if (!response.config?.silent) {
        message.error(res.msg || tr('请求失败'))
      }
      return Promise.reject(new Error(res.msg || tr('请求失败')))
    }
    // 非 Result 包装（如 blob 下载）原样返回
    return res
  },
  (error): any => {
    const status = error?.response?.status
    if (status === 401) {
      clearToken()
      message.error(tr('登录已过期，请重新登录'))
      const { pathname } = window.location
      // 管理端页面跳管理端登录，用户端跳用户端登录
      if (pathname.startsWith('/admin')) {
        window.location.href = '/admin/login'
      } else if (pathname !== '/login' && pathname !== '/register') {
        window.location.href = '/login'
      }
    } else if (!error?.config?.silent) {
      message.error(error?.response?.data?.msg || error.message || tr('网络错误'))
    }
    return Promise.reject(error)
  },
)

/** 泛型请求助手：返回 data */
export async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  const res = (await client.request(config)) as unknown as Result<T>
  return res.data
}

export default client
