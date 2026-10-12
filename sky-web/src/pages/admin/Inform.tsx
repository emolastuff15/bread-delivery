/**
 * 来单提醒 / 消息中心
 *
 * 移植自原版 Vue 管理端：src/views/inform/index.vue
 *   - 消息分类 tab：未读（status=1）/ 已读（status=2），未读 tab 上带未读数 Badge
 *   - 消息列表项按 item.type 区分文案：1 待接单 / 2 加急待接单 / 3 待派送 / 4 催单 / 5 今日数据
 *   - 未读数展示、全部已读、单条已读（原版 setStatus）、删除消息
 *   - 催单/今日数据项：鼠标悬停展开订单/经营详情（原版 toggleShow / mouseLeaves）
 *
 * ⚠️ 容错说明：`/admin/messages/*` 这四个接口是照搬原版前端保留的，
 *    当前 sky-take-out 后端并未实现，调用会 404。因此：
 *      - 所有请求都包 try/catch，失败不抛到渲染层（不白屏）
 *      - 页面顶部展示 Alert 说明「该接口后端未实现（原版接口照搬）」
 *      - 首次失败时用 message.warning 提示一次（避免刷屏）
 *      - 列表降级为 Empty 空态，分页/按钮自动禁用，页面仍可正常浏览与切换 tab
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  List,
  Pagination,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { CheckCircleOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { deleteMessage, getCountUnread, getMessagesPage, readMessagesBatch } from '@/api/legacy'
import type { InformMessage } from '@/types'
import { tr } from '@/i18n'

const { Text } = Typography

/** 接口未实现的统一提示文案 */
const UNIMPLEMENTED_TIP = tr('该接口后端未实现（原版接口照搬：/admin/messages/*），返回 404')

/** 列表行：在原版里后端返回的 content 按空格切分成 arrNew，details 是字符串形式的对象 */
interface InformRow extends InformMessage {
  /** 原版：val.arrNew = val.content.split(' ') */
  arrNew?: string[]
  /** 原版：objNew.details = eval('(' + objNew.details + ')') */
  details?: Record<string, any> | null
}

/** 消息类型 → 原版文案 / 标签色（原版用 item.type === 1 这类判断逐个渲染） */
const TYPE_META: Record<number, { label: string; color: string; urgent?: boolean }> = {
  1: { label: tr('待接单'), color: 'orange' },
  // 原版：type === 2 是加急的待接单，标题前多一个红色「急」字
  2: { label: tr('待接单'), color: 'red', urgent: true },
  3: { label: tr('待派送'), color: 'blue' },
  4: { label: tr('催单'), color: 'volcano' },
  5: { label: tr('今日数据'), color: 'green' },
}

/**
 * 原版用 eval('(' + details + ')') 解析后端返回的字符串，这里改成安全解析：
 * 先按 JSON 解析，失败再宽松兼容单引号 / 无引号 key 的伪 JSON，最终返回 null 兜底。
 */
function parseDetails(raw: unknown): Record<string, any> | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, any>
  const text = String(raw).trim()
  try {
    return JSON.parse(text) as Record<string, any>
  } catch {
    /* 继续尝试宽松解析 */
  }
  try {
    const fixed = text
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
    return JSON.parse(fixed) as Record<string, any>
  } catch {
    // 解析不了就当没有详情，不影响列表渲染
    return null
  }
}

/** 宽松取分页结果：兼容 request 已解包 / 未解包以及直接返回数组的情况 */
function normalizePage(res: any): { records: InformRow[]; total: number } {
  const page = res?.data && !Array.isArray(res.data) ? res.data : res
  const rawRecords = Array.isArray(page?.records)
    ? page.records
    : Array.isArray(page)
      ? page
      : []
  const records: InformRow[] = rawRecords.map((val: any) => {
    const arrContent = String(val?.content ?? '').split(' ')
    return {
      ...val,
      arrNew: arrContent,
      details: parseDetails(val?.details),
    }
  })
  const total = Number(page?.total ?? records.length) || 0
  return { records, total }
}

/** 详情键值对（原版 orderInfo 里的 label + 值） */
function KV({ label, value }: { label: string; value?: unknown }) {
  return (
    <span style={{ marginRight: 24 }}>
      <Text type="secondary">{label}</Text>
      {value === undefined || value === null || value === '' ? '-' : String(value)}
    </span>
  )
}

export default function Inform() {
  const navigate = useNavigate()

  // 原版 data：activeIndex / status(1未读 2已读) / page / pageSize / counts / baseData
  const [status, setStatus] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<InformRow[]>([])
  const [loading, setLoading] = useState(false)
  // 原版 AppModule.statusNumber：未读数量
  const [countUnread, setCountUnread] = useState(0)
  // 原版 shopShow / showIndex：悬停展开的详情行（原版用下标定位）
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  // 接口不可用（后端未实现 404）标记
  const [unavailable, setUnavailable] = useState(false)

  /** 接口失败只 message.warning 一次，避免每次操作都刷屏 */
  const warnedRef = useRef(false)
  /** 原版 toggleShow 里 3 秒后自动标记已读的定时器 */
  const timerRef = useRef<number | null>(null)

  const notifyUnavailable = useCallback(() => {
    setUnavailable(true)
    if (!warnedRef.current) {
      warnedRef.current = true
      message.warning(tr('消息接口调用失败：{tip}，已按空列表降级展示', { tip: UNIMPLEMENTED_TIP }))
    }
  }, [])

  const clearHoverTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 获取未读数量（原版 getCountUnread + AppModule.StatusNumber）
  const refreshUnread = useCallback(async () => {
    try {
      const res: any = await getCountUnread()
      const count = Number(res?.data ?? res)
      setCountUnread(Number.isFinite(count) ? count : 0)
    } catch {
      setCountUnread(0)
      notifyUnavailable()
    }
  }, [notifyUnavailable])

  // 获取列表数据（原版 getData）
  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 原版参数名为 status（1未读 2已读），此处按 @/api/legacy 的签名传 type，并同时带上 status 兼容两种命名
      const params: any = { page, pageSize, type: status, status }
      const res = await getMessagesPage(params)
      const { records, total: count } = normalizePage(res)
      setList(records)
      setTotal(count)
    } catch {
      // 接口未实现：渲染空列表，不抛出（原版此处会 $message.error(data.msg)）
      setList([])
      setTotal(0)
      notifyUnavailable()
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, notifyUnavailable])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    refreshUnread()
  }, [refreshUnread])

  // 卸载时清理悬停定时器（原版没有清理，切页面会残留 setInterval）
  useEffect(() => () => clearHoverTimer(), [clearHoverTimer])

  /** 标记已读：原版 setStatus(id) 是单个标记，这里用批量已读接口传单元素 id 复用 */
  const markRead = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return
      try {
        await readMessagesBatch(ids)
        refreshUnread()
        load()
      } catch {
        notifyUnavailable()
      }
    },
    [load, notifyUnavailable, refreshUnread],
  )

  // 全部已读（原版 handleBatch）
  const handleBatchRead = async () => {
    const ids = list.map((val) => val.id).filter((id): id is number => typeof id === 'number')
    if (!ids.length) {
      message.warning(tr('当前没有可操作的消息'))
      return
    }
    try {
      await readMessagesBatch(ids)
      // 原版这里注释掉了切换 tab，保持"全部已读后停留在当前列表"的行为
      refreshUnread()
      load()
    } catch {
      notifyUnavailable()
    }
  }

  // 删除消息
  const handleDelete = async (item: InformRow) => {
    if (typeof item.id !== 'number') return
    try {
      await deleteMessage(item.id)
      message.success(tr('删除成功'))
      refreshUnread()
      load()
    } catch {
      notifyUnavailable()
    }
  }

  // 点击「订单号」：先标记该条已读，再跳转订单管理（原版 router-link to '/order?status=2'）
  const handleGoOrder = (item: InformRow) => {
    if (typeof item.id === 'number') markRead([item.id])
    navigate('/admin/orders?status=2')
  }

  // 触发已读/未读 tab（原版 handleClass）
  const handleTabChange = (key: string) => {
    clearHoverTimer()
    setHoverIndex(null)
    setStatus(Number(key))
    setPage(1)
  }

  // 悬停展开详情 + 原版逻辑：未读状态下悬停 3 秒自动标记已读
  const handleMouseEnter = (item: InformRow, index: number) => {
    setHoverIndex(index)
    clearHoverTimer()
    if (status === 1 && typeof item.id === 'number') {
      const id = item.id
      timerRef.current = window.setTimeout(() => {
        markRead([id])
      }, 3000)
    }
  }

  const handleMouseLeave = () => {
    clearHoverTimer()
    setHoverIndex(null)
  }

  // 未读 tab 上的未读数（原版 el-badge：0 隐藏、>99 显示 99+）
  const tabItems = useMemo(
    () => [
      {
        key: '1',
        label: (
          <Badge count={countUnread} overflowCount={99} offset={[10, -2]}>
            <span>{tr('未读')}</span>
          </Badge>
        ),
      },
      { key: '2', label: tr('已读') },
    ],
    [countUnread],
  )

  const renderItem = (item: InformRow, index: number) => {
    const type = Number(item.type)
    const meta = TYPE_META[type]
    const arrNew = item.arrNew ?? []
    const detail = item.details ?? null
    const showDetail = hoverIndex === index && !!detail
    const isRead = Number(item.status) === 2
    const time = item.createTime ? <Text type="secondary" style={{ marginLeft: 12 }}>{item.createTime}</Text> : null

    // 原版逐个 type === n 判断渲染；这里用 typeMeta 归一，并给未知类型兜底（原版未知类型不渲染）
    let body: ReactNode
    if (type === 1 || type === 2 || type === 3) {
      // 待接单 / 加急待接单 / 待派送
      body = (
        <div style={styles.tit}>
          {meta?.urgent ? <i style={styles.urgent}>{tr('急')}</i> : null}
          <Tag color={meta?.color} style={{ marginRight: 4 }}>
            【{meta?.label ?? tr('消息')}】
          </Tag>
          {arrNew[0]}
          <a onClick={() => handleGoOrder(item)} style={{ margin: '0 2px' }}>
            {arrNew[1]}
          </a>
          {arrNew[2]}
          {time}
        </div>
      )
    } else if (type === 4) {
      // 催单：悬停展示订单详情
      body = (
        <>
          <div style={styles.tit}>
            <Tag color={meta?.color} style={{ marginRight: 4 }}>
              {tr('【催单】')}
            </Tag>
            {arrNew[0] || item.content}
            {time}
          </div>
          {showDetail ? (
            <div style={styles.orderInfo}>
              <p>
                <KV label={tr('下单时间：')} value={detail?.orderTime} />
                <KV label={tr('预计送达时间：')} value={detail?.estimatedDeliveryTime} />
              </p>
              <p>
                {detail?.consignee}，{detail?.phone}，{detail?.address}
              </p>
              <p>
                <KV label={tr('菜品：')} value={detail?.orderDishes} />
              </p>
            </div>
          ) : null}
        </>
      )
    } else if (type === 5) {
      // 今日数据（原版文案固定）
      body = (
        <>
          <div style={styles.tit}>
            <Tag color={meta?.color} style={{ marginRight: 4 }}>
              {tr('【今日数据】')}
            </Tag>
            {tr('认真工作的同时也要好好生活。')}
            {time}
          </div>
          {showDetail ? (
            <div style={styles.orderInfo}>
              <p>
                <KV label={tr('营业额：')} value={detail?.turnover} />
                <KV label={tr('有效订单：')} value={detail?.validOrderCount ? tr('{n}笔', { n: detail.validOrderCount }) : ''} />
                <KV label={tr('订单完成率：')} value={detail?.orderCompletionRate} />
              </p>
              <p>
                <KV label={tr('今日新增用户：')} value={detail?.newUsers} />
                <KV label={tr('今日取消：')} value={detail?.cancelledOrders ? tr('{n}笔', { n: detail.cancelledOrders }) : ''} />
                <KV label={tr('今日取消金额：')} value={detail?.cancelledAmount ? `￥${detail.cancelledAmount}` : ''} />
              </p>
            </div>
          ) : null}
        </>
      )
    } else {
      // 兜底：原版没有的类型，直接展示 content，避免消息"消失"
      body = (
        <div style={styles.tit}>
          <Tag color="default" style={{ marginRight: 4 }}>
            {tr('【消息】')}
          </Tag>
          {item.content}
          {time}
        </div>
      )
    }

    return (
      <List.Item
        key={item.id ?? index}
        style={styles.listItem}
        onMouseEnter={() => handleMouseEnter(item, index)}
      >
        <div style={{ width: '100%', ...(isRead ? styles.titAlready : undefined) }}>{body}</div>
        <Space size={4}>
          {status === 1 ? (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => typeof item.id === 'number' && markRead([item.id])}
            >
              {tr('标记已读')}
            </Button>
          ) : null}
          <Popconfirm
            title={tr('确定删除该消息吗？')}
            okText={tr('确定')}
            cancelText={tr('取消')}
            onConfirm={() => handleDelete(item)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {tr('删除')}
            </Button>
          </Popconfirm>
        </Space>
      </List.Item>
    )
  }

  const emptyText = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        unavailable
          ? tr('暂无消息（消息接口后端未实现，原版接口照搬）')
          : status === 1
            ? tr('这里空空如也~')
            : tr('暂无已读消息')
      }
    />
  )

  return (
    <Card
      title={tr('来单提醒')}
      extra={
        <Space>
          <Text type="secondary">{tr('未读：')}</Text>
          <Badge count={countUnread} overflowCount={99} showZero color="#1677ff" />
        </Space>
      }
    >
      {unavailable ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={tr('该接口后端未实现（原版接口照搬）')}
          description={tr('{tip}，页面已降级为空列表展示，不影响其他功能使用。', { tip: UNIMPLEMENTED_TIP })}
        />
      ) : null}

      <Tabs
        activeKey={String(status)}
        onChange={handleTabChange}
        items={tabItems}
        tabBarExtraContent={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              {tr('刷新')}
            </Button>
            {/* 原版：未读 tab 且有数据时可用，否则 disabled */}
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={!(status === 1 && list.length > 0)}
              onClick={handleBatchRead}
            >
              {tr('全部已读')}
            </Button>
          </Space>
        }
      />

      {/* 原版 @mouseleave="mouseLeaves"：移出列表时收起详情 */}
      <div onMouseLeave={handleMouseLeave}>
        <List<InformRow>
          loading={loading}
          dataSource={list}
          locale={{ emptyText }}
          renderItem={renderItem}
        />
      </div>

      {/* 原版：counts > 10 才展示分页 */}
      {total > pageSize ? (
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={[10, 20, 30, 40]}
            showSizeChanger
            showQuickJumper
            showTotal={(t) => tr('共 {n} 条', { n: t })}
            onChange={(p, ps) => {
              setPage(ps !== pageSize ? 1 : p)
              setPageSize(ps)
            }}
          />
        </div>
      ) : null}
    </Card>
  )
}

/** 行内样式：只有这一个文件，样式直接内联（对应原版 inform/index.vue 的 scss） */
const styles: Record<string, CSSProperties> = {
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f7',
  },
  tit: {
    fontSize: 14,
    lineHeight: '22px',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  // 原版 .titAlready：已读消息置灰
  titAlready: {
    color: '#b0b3bb',
  },
  urgent: {
    color: '#f5222d',
    fontStyle: 'normal',
    marginRight: 6,
  },
  // 原版 .orderInfo：悬停展开的详情块
  orderInfo: {
    marginTop: 8,
    padding: '8px 12px',
    background: '#f7f8fa',
    borderRadius: 4,
    color: '#818693',
    fontSize: 13,
  },
}
