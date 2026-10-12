import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  cancelOrderByAdmin,
  completeOrder,
  confirmOrder,
  deliveryOrder,
  getAdminOrderDetail,
  getOrderStatistics,
  rejectOrder,
  searchOrders,
} from '@/api/admin'
import { ORDER_STATUS } from '@/pages/user/Orders'
import { tr } from '@/i18n'
import type { OrderStatisticsVO, OrderVO } from '@/types'

const { RangePicker } = DatePicker

/**
 * 状态 Tab（对齐原版 tabChange.vue：全部订单 / 待接单 / 已接单 / 派送中 / 已完成 / 已取消）
 * value 为 undefined 表示"全部"，其余直接作为后端 status 查询参数
 */
const ORDER_TABS: { key: string; label: string; value: number | undefined }[] = [
  { key: 'all', label: tr('全部订单'), value: undefined },
  { key: '2', label: tr('待接单'), value: 2 },
  { key: '3', label: tr('已接单'), value: 3 },
  { key: '4', label: tr('派送中'), value: 4 },
  { key: '5', label: tr('已完成'), value: 5 },
  { key: '6', label: tr('已取消'), value: 6 },
]

/** 拒单预设原因（原版 cancelOrderReasonList） */
const REJECT_REASONS = [tr('订单量较多，暂时无法接单'), tr('菜品已销售完，暂时无法接单'), tr('餐厅已打烊，暂时无法接单')]
/** 取消预设原因（原版 cancelrReasonList） */
const CANCEL_REASONS = [
  tr('订单量较多，暂时无法接单'),
  tr('菜品已销售完，暂时无法接单'),
  tr('骑手不足无法配送'),
  tr('客户电话取消'),
]
/** 自定义原因选项，选中后展示文本域 */
const CUSTOM_REASON = tr('自定义原因')

/** 支付状态文案（0未支付 1已支付 2退款） */
const PAY_STATUS_TEXT: Record<number, string> = { 0: tr('未支付'), 1: tr('已支付'), 2: tr('退款') }
/** 支付渠道文案（1微信 2支付宝） */
const PAY_METHOD_TEXT: Record<number, string> = { 1: tr('微信支付'), 2: tr('支付宝支付') }
/** 派送费（原版详情页固定 ¥6） */
const DELIVERY_FEE = 6
/** 订单统计初值 */
const EMPTY_STATS: OrderStatisticsVO = { toBeConfirmed: 0, confirmed: 0, deliveryInProgress: 0 }

/** 时间统一格式化：后端返回 ISO 字符串，展示为 YYYY-MM-DD HH:mm:ss */
function formatTime(value?: string) {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value).replace('T', ' ')
}

/** 金额展示：保留两位小数 */
function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `¥${Number(value).toFixed(2)}`
}

export default function AdminOrders() {
  /** 支持 URL 查询参数：?orderId=xxx（WebSocket 来单提醒点击）、?status=x（直接定位 Tab） */
  const [searchParams, setSearchParams] = useSearchParams()

  // ---------- 列表与查询条件 ----------
  const [list, setList] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [number, setNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<number | undefined>(() => {
    // 原版 created() 中读取 $route.query.status 的逻辑
    const s = Number(searchParams.get('status'))
    return Number.isFinite(s) && s > 0 ? s : undefined
  })
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<OrderStatisticsVO>(EMPTY_STATS)

  // ---------- 详情抽屉 ----------
  const [detail, setDetail] = useState<OrderVO | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // ---------- 拒单 / 取消原因弹窗 ----------
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonType, setReasonType] = useState<'reject' | 'cancel'>('reject')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [reason, setReason] = useState('') // 预设原因
  const [customReason, setCustomReason] = useState('') // 自定义原因（限 20 字）
  const [reasonSubmitting, setReasonSubmitting] = useState(false)

  /** 刷新待接单 / 已接单 / 派送中数量（原版 getOrderListBy3Status） */
  const loadStats = useCallback(() => {
    getOrderStatistics()
      .then((s) => setStats(s || EMPTY_STATS))
      .catch(() => {
        /* 统计失败不影响列表，静默兜底 */
      })
  }, [])

  /** 查询订单列表 */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await searchOrders({
        page,
        pageSize,
        number: number || undefined,
        phone: phone || undefined,
        status,
        beginTime: range?.[0]?.format('YYYY-MM-DD 00:00:00'),
        endTime: range?.[1]?.format('YYYY-MM-DD 23:59:59'),
      })
      const records = res?.records || []
      // 处理完当前页最后一条后回退一页，避免停在空页
      if (records.length === 0 && page > 1) {
        setPage(page - 1)
        return
      }
      setList(records)
      setTotal(res?.total || 0)
      // 每次查询成功后同步刷新 Tab 上的数量徽标（对齐原版）
      loadStats()
    } catch {
      // 拦截器已统一提示错误，这里兜底保证不白屏
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, number, phone, status, range, loadStats])

  useEffect(() => {
    void load()
  }, [load])

  /** 打开订单详情抽屉（原版 goDetail） */
  const openDetail = useCallback(async (id: number) => {
    setDetail(null)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const order = await getAdminOrderDetail(id)
      setDetail(order || null)
    } catch {
      /* 拦截器已提示，失败时关闭抽屉 */
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // 消息通知点击进入（/admin/orders?orderId=xxx）时自动打开该订单详情，并清理 URL 参数
  const orderIdParam = searchParams.get('orderId') || ''
  useEffect(() => {
    if (!orderIdParam || orderIdParam === 'undefined') return
    const id = Number(orderIdParam)
    if (!Number.isFinite(id) || id <= 0) return
    void openDetail(id)
    const next = new URLSearchParams(searchParams)
    next.delete('orderId')
    setSearchParams(next, { replace: true })
  }, [orderIdParam, openDetail, searchParams, setSearchParams])

  /** 打开拒单 / 取消原因弹窗 */
  const showReason = (type: 'reject' | 'cancel', id: number) => {
    setReasonType(type)
    setTargetId(id)
    setReason('')
    setCustomReason('')
    setReasonOpen(true)
  }

  /** 提交拒单 / 取消原因 */
  const submitReason = async () => {
    const text = (reason === CUSTOM_REASON ? customReason : reason).trim()
    if (!text) {
      message.warning(reason === CUSTOM_REASON ? (reasonType === 'reject' ? tr('请输入拒单原因') : tr('请输入取消原因')) : (reasonType === 'reject' ? tr('请选择拒单原因') : tr('请选择取消原因')))
      return
    }
    setReasonSubmitting(true)
    try {
      if (reasonType === 'reject') {
        await rejectOrder(targetId!, text)
        message.success(tr('已拒单'))
      } else {
        await cancelOrderByAdmin(targetId!, text)
        message.success(tr('订单已取消'))
      }
      setReasonOpen(false)
      setDetailOpen(false)
      await load()
    } catch {
      /* 拦截器已提示，保持弹窗打开便于修改 */
    } finally {
      setReasonSubmitting(false)
    }
  }

  /** 接单 / 派送 / 完成等无参操作 */
  const onAction = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      message.success(msg)
      setDetailOpen(false)
      await load()
    } catch {
      /* 拦截器已提示 */
    }
  }

  /** Tab 切换：带 status 重新查询 */
  const onTabChange = (key: string) => {
    setStatus(key === 'all' ? undefined : Number(key))
    setPage(1)
  }
  const activeKey = status === undefined ? 'all' : String(status)

  /** Tab 上的数量徽标（待接单 / 已接单 / 派送中） */
  const tabItems = ORDER_TABS.map((t) => {
    const count =
      t.value === 2 ? stats.toBeConfirmed : t.value === 3 ? stats.confirmed : t.value === 4 ? stats.deliveryInProgress : 0
    return {
      key: t.key,
      label: (
        <Badge count={count} size="small" overflowCount={99} offset={[10, -2]}>
          <span>{t.label}</span>
        </Badge>
      ),
    }
  })

  /** 菜品小计：优先按明细金额累加（明细 amount 已含数量），否则退回 订单金额-派送费-打包费（对齐原版算法） */
  const dishSubtotal = (order: OrderVO) => {
    const sum = (order.orderDetailList || []).reduce((acc, it) => acc + Number(it.amount || 0), 0)
    if (sum > 0) return sum
    return Number(order.amount || 0) - DELIVERY_FEE - Number(order.packAmount || 0)
  }

  /** 详情抽屉底部按状态给出可执行操作 */
  const renderDetailFooter = (order: OrderVO) => {
    const buttons = []
    if (order.status === 2) {
      buttons.push(
        <Button key="confirm" type="primary" onClick={() => onAction(() => confirmOrder(order.id), tr('已接单'))}>
          {tr('接单')}
        </Button>,
        <Button
          key="reject"
          danger
          onClick={() => {
            setDetailOpen(false)
            showReason('reject', order.id)
          }}
        >
          {tr('拒单')}
        </Button>,
      )
    }
    if ([1, 2, 3].includes(order.status)) {
      buttons.push(
        <Button
          key="cancel"
          danger
          onClick={() => {
            setDetailOpen(false)
            showReason('cancel', order.id)
          }}
        >
          {tr('取消订单')}
        </Button>,
      )
    }
    if (order.status === 3) {
      buttons.push(
        <Button key="delivery" type="primary" onClick={() => onAction(() => deliveryOrder(order.id), tr('已派送'))}>
          {tr('派送')}
        </Button>,
      )
    }
    if (order.status === 4) {
      buttons.push(
        <Button key="complete" type="primary" onClick={() => onAction(() => completeOrder(order.id), tr('订单已完成'))}>
          {tr('完成')}
        </Button>,
      )
    }
    return buttons.length ? <Space>{buttons}</Space> : null
  }

  /** 表格列：订单号 / 菜品 / 状态 / 时间 / 收货人 / 手机号 / 地址 / 金额 / 支付状态 / 备注 / 操作 */
  const columns: TableProps<OrderVO>['columns'] = [
    { title: tr('订单号'), dataIndex: 'number', key: 'number', width: 180, render: (v: string) => v || '-' },
    { title: tr('订单菜品'), dataIndex: 'orderDishes', key: 'orderDishes', ellipsis: true, render: (v: string) => v || '-' },
    {
      title: tr('订单状态'),
      dataIndex: 'status',
      key: 'status',
      width: 96,
      render: (v: number) => {
        const st = ORDER_STATUS[v] || { text: tr('未知'), color: 'default' }
        return <Tag color={st.color}>{st.text}</Tag>
      },
    },
    { title: tr('下单时间'), dataIndex: 'orderTime', key: 'orderTime', width: 170, render: (v: string) => formatTime(v) },
    {
      title: tr('收货人'),
      dataIndex: 'consignee',
      key: 'consignee',
      width: 100,
      render: (v: string, r: OrderVO) => v || r.userName || '-',
    },
    { title: tr('手机号'), dataIndex: 'phone', key: 'phone', width: 130, render: (v: string) => v || '-' },
    { title: tr('地址'), dataIndex: 'address', key: 'address', ellipsis: true, render: (v: string) => v || '-' },
    {
      title: tr('金额(元)'),
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'center',
      render: (v: number) => formatMoney(v),
    },
    {
      title: tr('支付状态'),
      dataIndex: 'payStatus',
      key: 'payStatus',
      width: 92,
      render: (v: number) => PAY_STATUS_TEXT[v] || '-',
    },
    { title: tr('备注'), dataIndex: 'remark', key: 'remark', ellipsis: true, render: (v: string) => v || tr('无') },
    // 已取消订单展示取消信息（对齐原版条件列）
    ...(status === 6
      ? ([
          { title: tr('取消时间'), dataIndex: 'cancelTime', key: 'cancelTime', width: 170, render: (v: string) => formatTime(v) },
          {
            title: tr('取消原因'),
            key: 'cancelReason',
            ellipsis: true,
            render: (_: unknown, r: OrderVO) => r.cancelReason || r.rejectionReason || '-',
          },
        ] as TableProps<OrderVO>['columns'])
      : []),
    // 已完成展示送达时间，已接单/派送中展示预计送达时间
    ...(status === 5
      ? ([
          {
            title: tr('送达时间'),
            dataIndex: 'deliveryTime',
            key: 'deliveryTime',
            width: 170,
            render: (v: string) => formatTime(v),
          },
        ] as TableProps<OrderVO>['columns'])
      : []),
    ...(status === 3 || status === 4
      ? ([
          {
            title: tr('预计送达时间'),
            dataIndex: 'estimatedDeliveryTime',
            key: 'estimatedDeliveryTime',
            width: 170,
            render: (v: string) => formatTime(v),
          },
        ] as TableProps<OrderVO>['columns'])
      : []),
    {
      title: tr('操作'),
      key: 'ops',
      width: 240,
      fixed: 'right',
      render: (_: unknown, record: OrderVO) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => openDetail(record.id)}>
            {tr('详情')}
          </Button>
          {/* 待接单：接单 / 拒单 */}
          {record.status === 2 && (
            <>
              <Button size="small" type="primary" onClick={() => onAction(() => confirmOrder(record.id), tr('已接单'))}>
                {tr('接单')}
              </Button>
              <Button size="small" danger onClick={() => showReason('reject', record.id)}>
                {tr('拒单')}
              </Button>
            </>
          )}
          {/* 已接单：派送 */}
          {record.status === 3 && (
            <Button size="small" type="primary" onClick={() => onAction(() => deliveryOrder(record.id), tr('已派送'))}>
              {tr('派送')}
            </Button>
          )}
          {/* 派送中：完成 */}
          {record.status === 4 && (
            <Button size="small" type="primary" onClick={() => onAction(() => completeOrder(record.id), tr('订单已完成'))}>
              {tr('完成')}
            </Button>
          )}
          {/* 待付款 / 待接单 / 已接单：取消 */}
          {[1, 2, 3].includes(record.status) && (
            <Button size="small" danger onClick={() => showReason('cancel', record.id)}>
              {tr('取消')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 状态 Tab：切换时带 status 重新查询，徽标展示待处理数量 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Tabs activeKey={activeKey} onChange={onTabChange} items={tabItems} />
      </Card>

      {/* 查询条件 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder={tr('订单号')}
            allowClear
            onSearch={(v) => {
              setNumber(v)
              setPage(1)
            }}
            style={{ width: 200 }}
          />
          <Input.Search
            placeholder={tr('手机号')}
            allowClear
            onSearch={(v) => {
              setPhone(v)
              setPage(1)
            }}
            style={{ width: 160 }}
          />
          <Select
            placeholder={tr('订单状态')}
            allowClear
            style={{ width: 130 }}
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={Object.entries(ORDER_STATUS).map(([k, v]) => ({ label: v.text, value: Number(k) }))}
          />
          <RangePicker
            value={range}
            onChange={(v) => {
              setRange(v as [Dayjs, Dayjs] | null)
              setPage(1)
            }}
          />
          <Button
            onClick={() => {
              setNumber('')
              setPhone('')
              setStatus(undefined)
              setRange(null)
              setPage(1)
            }}
          >
            {tr('重置')}
          </Button>
        </Space>
      </Card>

      {/* 订单统计 */}
      <Card title={tr('订单统计')} size="small" style={{ marginBottom: 16 }}>
        <Space size="large">
          <Statistic title={tr('待接单')} value={stats.toBeConfirmed} />
          <Statistic title={tr('已接单')} value={stats.confirmed} />
          <Statistic title={tr('派送中')} value={stats.deliveryInProgress} />
        </Space>
      </Card>

      {/* 订单列表 */}
      <Card title={tr('订单列表')}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '40'],
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
            showTotal: (t) => tr('共 {n} 条', { n: t }),
          }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* 订单详情抽屉 */}
      <Drawer
        title={tr('订单详情')}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        footer={detail ? renderDetailFooter(detail) : null}
        destroyOnClose
      >
        {detailLoading && !detail && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        )}
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={tr('订单号')}>{detail.number || '-'}</Descriptions.Item>
              <Descriptions.Item label={tr('订单状态')}>
                <Tag color={ORDER_STATUS[detail.status]?.color}>{ORDER_STATUS[detail.status]?.text || tr('未知')}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={tr('下单时间')}>{formatTime(detail.orderTime)}</Descriptions.Item>
              <Descriptions.Item label={tr('收货人')}>{detail.consignee || detail.userName || '-'}</Descriptions.Item>
              <Descriptions.Item label={tr('手机号')}>{detail.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label={tr('收货地址')}>{detail.address || '-'}</Descriptions.Item>
              {detail.status === 5 ? (
                <Descriptions.Item label={tr('送达时间')}>{formatTime(detail.deliveryTime)}</Descriptions.Item>
              ) : [2, 3, 4].includes(detail.status) ? (
                <Descriptions.Item label={tr('预计送达时间')}>{formatTime(detail.estimatedDeliveryTime)}</Descriptions.Item>
              ) : null}
              <Descriptions.Item label={tr('餐具数量')}>{detail.tablewareNumber ?? '-'}</Descriptions.Item>
              <Descriptions.Item label={tr('支付状态')}>{PAY_STATUS_TEXT[detail.payStatus] || '-'}</Descriptions.Item>
              <Descriptions.Item label={tr('支付渠道')}>{PAY_METHOD_TEXT[detail.payMethod] || '-'}</Descriptions.Item>
              <Descriptions.Item label={tr('支付时间')}>{formatTime(detail.checkoutTime)}</Descriptions.Item>
              <Descriptions.Item label={tr('订单金额')}>{formatMoney(detail.amount)}</Descriptions.Item>
              {/* 已取消展示取消原因，其余展示备注（对齐原版弹窗） */}
              {detail.status === 6 ? (
                <Descriptions.Item label={tr('取消原因')}>
                  {detail.cancelReason || detail.rejectionReason || '-'}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label={tr('备注')}>{detail.remark || tr('无')}</Descriptions.Item>
              )}
              {detail.status !== 6 && detail.rejectionReason ? (
                <Descriptions.Item label={tr('拒单原因')}>{detail.rejectionReason}</Descriptions.Item>
              ) : null}
              {detail.status !== 6 && detail.cancelReason ? (
                <Descriptions.Item label={tr('取消原因')}>{detail.cancelReason}</Descriptions.Item>
              ) : null}
            </Descriptions>

            {/* 菜品明细：图片 + 名称 + 数量 + 金额 */}
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              {tr('菜品明细')}
            </Typography.Title>
            <List
              size="small"
              dataSource={detail.orderDetailList || []}
              locale={{ emptyText: tr('暂无菜品明细') }}
              renderItem={(item) => (
                <List.Item extra={<Typography.Text strong>{formatMoney(item.amount)}</Typography.Text>}>
                  <List.Item.Meta
                    avatar={
                      <img
                        className="order-detail-image"
                        alt={item.name}
                        src={item.image}
                        onError={(e) => ((e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=No+Image')}
                      />
                    }
                    title={`${item.name} × ${item.number ?? 1}`}
                    description={item.dishFlavor ? tr('口味：{flavor}', { flavor: item.dishFlavor }) : undefined}
                  />
                </List.Item>
              )}
            />

            {/* 费用明细（对齐原版：菜品小计 / 派送费 / 打包费 / 合计） */}
            <Descriptions column={1} size="small" bordered title={tr('费用')} style={{ marginTop: 16 }}>
              <Descriptions.Item label={tr('菜品小计')}>{formatMoney(dishSubtotal(detail))}</Descriptions.Item>
              <Descriptions.Item label={tr('派送费')}>{formatMoney(DELIVERY_FEE)}</Descriptions.Item>
              <Descriptions.Item label={tr('打包费')}>{formatMoney(Number(detail.packAmount || 0))}</Descriptions.Item>
              <Descriptions.Item label={tr('合计')}>
                <Typography.Text strong type="danger">
                  {formatMoney(detail.amount)}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>

      {/* 拒单 / 取消原因 */}
      <Modal
        title={reasonType === 'reject' ? tr('拒单原因') : tr('取消原因')}
        open={reasonOpen}
        onOk={submitReason}
        onCancel={() => setReasonOpen(false)}
        confirmLoading={reasonSubmitting}
        okText={tr('确定')}
        cancelText={tr('取消')}
        okButtonProps={{ danger: true }}
      >
        <Select
          style={{ width: '100%', marginBottom: 12 }}
          placeholder={reasonType === 'reject' ? tr('请选择拒单原因') : tr('请选择取消原因')}
          value={reason || undefined}
          onChange={setReason}
          options={(reasonType === 'reject' ? REJECT_REASONS : CANCEL_REASONS)
            .concat(CUSTOM_REASON)
            .map((v) => ({ label: v, value: v }))}
        />
        {reason === CUSTOM_REASON && (
          <Input.TextArea
            rows={3}
            maxLength={20}
            showCount
            placeholder={reasonType === 'reject' ? tr('请填写您拒单的原因（限20字内）') : tr('请填写您取消的原因（限20字内）')}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
      </Modal>
    </div>
  )
}
