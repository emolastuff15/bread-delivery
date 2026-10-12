import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { CalendarOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import {
  cancelOrderByAdmin,
  confirmOrder,
  getAdminOrderDetail,
  rejectOrder,
  searchOrders,
} from '@/api/admin'
import { ORDER_STATUS } from '@/pages/user/Orders'
import { tr } from '@/i18n'
import type { OrderVO } from '@/types'

const { RangePicker } = DatePicker

/** 计算距离预约时间的人类可读文案 */
function formatRemain(reservationTime?: string): { text: string; color: string } {
  if (!reservationTime) return { text: '—', color: 'default' }
  const minutes = dayjs(reservationTime).diff(dayjs(), 'minute')
  if (minutes < 0) return { text: tr('已超时 {n} 分钟', { n: Math.abs(minutes) }), color: 'red' }
  if (minutes < 60) return { text: tr('{n} 分钟后', { n: minutes }), color: minutes <= 30 ? 'orange' : 'blue' }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return { text: tr('{h} 小时 {m} 分钟后', { h, m }), color: 'default' }
}

/**
 * 预定订单查看
 *
 * 与后端"预约单提前 1 小时提醒"配套：
 *   - 后端 status=0 表示「已付款、等待预约时间到达」的预约单
 *   - WebSocket 每分钟会汇总推送 type=3 预约提醒，点击通知即跳转到本页
 *   - 店员在本页"接单"后，订单 status 变为 3，提醒自动停止
 */
export default function Reservations() {
  const [list, setList] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [status, setStatus] = useState<number | undefined>(0) // 默认只看"预约中"
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([dayjs(), dayjs().add(7, 'day')])
  const [number, setNumber] = useState('')
  const [loading, setLoading] = useState(false)

  const [detail, setDetail] = useState<OrderVO | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonType, setReasonType] = useState<'reject' | 'cancel'>('reject')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await searchOrders({
        page,
        pageSize,
        status,
        number: number || undefined,
        reservationBegin: range?.[0]?.format('YYYY-MM-DD 00:00:00'),
        reservationEnd: range?.[1]?.format('YYYY-MM-DD 23:59:59'),
      })
      setList(res.records || [])
      setTotal(res.total || 0)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, number, range])

  useEffect(() => {
    load()
  }, [load])

  /** 汇总：1 小时内待处理 / 已超时未处理 */
  const summary = useMemo(() => {
    const now = dayjs()
    let within1h = 0
    let overdue = 0
    list.forEach((o) => {
      if (!o.reservationTime) return
      const t = dayjs(o.reservationTime)
      if (t.isBefore(now)) overdue += 1
      else if (t.diff(now, 'minute') <= 60) within1h += 1
    })
    return { within1h, overdue }
  }, [list])

  const openDetail = async (id: number) => {
    try {
      setDetail(await getAdminOrderDetail(id))
      setDetailOpen(true)
    } catch {
      /* ignore */
    }
  }

  const onConfirm = async (id: number) => {
    await confirmOrder(id)
    message.success(tr('已接单，该预约单将不再提醒'))
    load()
  }

  const showReason = (type: 'reject' | 'cancel', id: number) => {
    setReasonType(type)
    setTargetId(id)
    setReason('')
    setReasonOpen(true)
  }

  const submitReason = async () => {
    if (!reason.trim()) {
      message.warning(tr('请填写原因'))
      return
    }
    if (reasonType === 'reject') {
      await rejectOrder(targetId!, reason)
      message.success(tr('已拒单'))
    } else {
      await cancelOrderByAdmin(targetId!, reason)
      message.success(tr('已取消'))
    }
    setReasonOpen(false)
    load()
  }

  const columns = [
    { title: tr('订单号'), dataIndex: 'number', key: 'number' },
    {
      title: tr('预约时间'),
      dataIndex: 'reservationTime',
      key: 'reservationTime',
      render: (v: string) => (v ? v.replace('T', ' ') : '—'),
    },
    {
      title: tr('距离预约'),
      key: 'remain',
      render: (_: unknown, r: OrderVO) => {
        const { text, color } = formatRemain(r.reservationTime)
        return <Tag color={color}>{text}</Tag>
      },
    },
    { title: tr('收货人'), dataIndex: 'consignee', key: 'consignee', render: (v: string) => v || '—' },
    { title: tr('手机号'), dataIndex: 'phone', key: 'phone', render: (v: string) => v || '—' },
    { title: tr('金额(元)'), dataIndex: 'amount', key: 'amount' },
    {
      title: tr('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (v: number) => {
        const st = ORDER_STATUS[v] || { text: tr('未知'), color: 'default' }
        return <Tag color={st.color}>{st.text}</Tag>
      },
    },
    {
      title: tr('操作'),
      key: 'ops',
      render: (_: unknown, record: OrderVO) => (
        <Space>
          <Button size="small" onClick={() => openDetail(record.id)}>
            {tr('详情')}
          </Button>
          {record.status === 0 && (
            <Popconfirm title={tr('确认接单？接单后不再提醒')} onConfirm={() => onConfirm(record.id)}>
              <Button size="small" type="primary">
                {tr('接单')}
              </Button>
            </Popconfirm>
          )}
          {(record.status === 0 || record.status === 2) && (
            <>
              <Button size="small" danger onClick={() => showReason('reject', record.id)}>
                {tr('拒单')}
              </Button>
              <Button size="small" danger onClick={() => showReason('cancel', record.id)}>
                {tr('取消')}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>


      <Card style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Statistic title={tr('本页待处理')} value={total} suffix={tr('单')} />
          <Statistic title={tr('1 小时内')} value={summary.within1h} suffix={tr('单')} valueStyle={{ color: '#fa8c16' }} />
          <Statistic
            title={tr('已超时未处理')}
            value={summary.overdue}
            suffix={tr('单')}
            valueStyle={{ color: summary.overdue > 0 ? '#cf1322' : undefined }}
          />
        </Space>
      </Card>

      <Card
        title={tr('预定订单查看')}
        extra={
          <Space wrap>
            <RangePicker
              value={range}
              onChange={(v) => {
                setRange(v as [Dayjs, Dayjs] | null)
                setPage(1)
              }}
            />
            <Select
              style={{ width: 140 }}
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { label: tr('预约中(待处理)'), value: 0 },
                { label: tr('待接单'), value: 2 },
                { label: tr('已接单'), value: 3 },
                { label: tr('已完成'), value: 5 },
                { label: tr('已取消'), value: 6 },
                { label: tr('全部'), value: undefined },
              ]}
            />
            <Input.Search
              placeholder={tr('订单号')}
              allowClear
              style={{ width: 180 }}
              onSearch={(v) => {
                setNumber(v)
                setPage(1)
              }}
            />
            <Button icon={<ReloadOutlined />} onClick={load}>
              {tr('刷新')}
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: setPage,
            showTotal: (t) => tr('共 {n} 条', { n: t }),
          }}
          locale={{ emptyText: <Empty description={tr('暂无预约订单')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <Drawer title={tr('预约订单详情')} width={520} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={tr('订单号')}>{detail.number}</Descriptions.Item>
              <Descriptions.Item label={tr('预约时间')}>
                {detail.reservationTime?.replace('T', ' ') || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={tr('状态')}>
                <Tag color={ORDER_STATUS[detail.status]?.color}>{ORDER_STATUS[detail.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={tr('下单时间')}>{detail.orderTime?.replace('T', ' ')}</Descriptions.Item>
              <Descriptions.Item label={tr('收货人')}>{detail.consignee}</Descriptions.Item>
              <Descriptions.Item label={tr('手机号')}>{detail.phone}</Descriptions.Item>
              <Descriptions.Item label={tr('地址')}>{detail.address}</Descriptions.Item>
              <Descriptions.Item label={tr('支付状态')}>
                {detail.payStatus === 1 ? tr('已支付') : detail.payStatus === 0 ? tr('未支付') : tr('退款')}
              </Descriptions.Item>
              <Descriptions.Item label={tr('订单金额')}>¥{detail.amount}</Descriptions.Item>
              <Descriptions.Item label={tr('备注')}>{detail.remark || tr('无')}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              {tr('菜品明细')}
            </Typography.Title>
            <List
              dataSource={detail.orderDetailList || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <img
                        className="order-detail-image"
                        alt={item.name}
                        src={item.image}
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=No+Image')
                        }
                      />
                    }
                    title={item.name}
                    description={item.dishFlavor ? tr('口味：{flavor}', { flavor: item.dishFlavor }) : undefined}
                  />
                  <Typography.Text>
                    ¥{item.amount} × {item.number}
                  </Typography.Text>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>

      <Modal
        title={reasonType === 'reject' ? tr('拒单') : tr('取消订单')}
        open={reasonOpen}
        onOk={submitReason}
        onCancel={() => setReasonOpen(false)}
        okText={tr('确认')}
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder={tr('请填写原因')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}
