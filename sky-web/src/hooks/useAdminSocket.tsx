import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { notification } from 'antd'
import { tr } from '@/i18n'

/** 后端推送消息体 */
export interface SocketMessage {
  /** 1 来单提醒 2 客户催单 3 预约提醒 */
  type: number
  orderId?: number
  content?: string
  /** 预约提醒汇总字段 */
  count?: number
  upcomingCount?: number
  overdueCount?: number
  earliestMinutes?: number
  orders?: Array<{ id: number; number?: string; reservationTime?: string; consignee?: string }>
}

/** 提示音（放在 public/audio 下） */
const AUDIO_PREVIEW = '/audio/preview.mp3' // 来单提醒
const AUDIO_REMINDER = '/audio/reminder.mp3' // 客户催单

/**
 * 管理端全局 WebSocket 提醒
 * 移植自原版 layout/components/Navbar/index.vue 的 webSocket() 逻辑，并补充：
 *   - 断线自动重连（原版没有）
 *   - 支持 type=3 预约提醒
 */
export function useAdminSocket() {
  const navigate = useNavigate()
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const closedByUsRef = useRef(false)

  useEffect(() => {
    const previewAudio = new Audio(AUDIO_PREVIEW)
    const reminderAudio = new Audio(AUDIO_REMINDER)
    let reconnectTimer: number | undefined

    const play = (audio: HTMLAudioElement) => {
      try {
        audio.currentTime = 0
        void audio.play().catch(() => {
          /* 浏览器自动播放策略可能拦截，忽略 */
        })
      } catch {
        /* ignore */
      }
    }

    const handleMessage = (msg: SocketMessage) => {
      if (msg.type === 1) {
        play(previewAudio)
      } else if (msg.type === 2 || msg.type === 3) {
        play(reminderAudio)
      }

      if (msg.type === 3) {
        // 预约提醒：汇总消息
        notification.warning({
          message: tr('预约提醒（{n} 单待处理）', { n: msg.count ?? 0 }),
          description: (
            <span>
              {msg.content}
              {msg.earliestMinutes !== undefined && msg.earliestMinutes >= 0
                ? tr('，最近一单还有 {n} 分钟', { n: msg.earliestMinutes })
                : ''}
            </span>
          ),
          duration: 0,
          onClick: () => navigate('/admin/reservations'),
        })
        return
      }

      // type 1 / 2：单订单提醒
      notification.info({
        message: msg.type === 1 ? tr('待接单') : tr('催单'),
        description:
          msg.type === 1
            ? tr('您有 1 个订单待处理，{content}，请及时接单', { content: msg.content ?? '' })
            : tr('{content}（点击去处理）', { content: msg.content ?? '' }),
        duration: 0,
        onClick: () => navigate(`/admin/orders?orderId=${msg.orderId ?? ''}`),
      })
    }

    const connect = () => {
      const clientId = Math.random().toString(36).slice(2)
      // 走 vite 代理（/ws -> ws://localhost:8080），避免跨域与硬编码后端地址
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${protocol}://${window.location.host}/ws/${clientId}`

      if (typeof WebSocket === 'undefined') {
        notification.warning({
          message: tr('提示'),
          description: tr('当前浏览器无法接收实时报警信息，请使用谷歌浏览器！'),
          duration: 0,
        })
        return
      }

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        // eslint-disable-next-line no-console
        console.log(tr('[ws] 已连接'), url)
      }

      ws.onmessage = (evt) => {
        try {
          handleMessage(JSON.parse(evt.data) as SocketMessage)
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(tr('[ws] 非 JSON 消息'), evt.data)
        }
      }

      ws.onerror = () => {
        // eslint-disable-next-line no-console
        console.warn(tr('[ws] 连接错误'))
      }

      ws.onclose = () => {
        // eslint-disable-next-line no-console
        console.log(tr('[ws] 已关闭'))
        if (closedByUsRef.current) return
        // 指数退避重连，最长 30 秒（原版没有重连，掉线后就再也收不到提醒）
        retryRef.current += 1
        const delay = Math.min(1000 * 2 ** (retryRef.current - 1), 30000)
        reconnectTimer = window.setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      closedByUsRef.current = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      wsRef.current?.close()
      previewAudio.pause()
      reminderAudio.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
