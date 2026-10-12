import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Empty, List, Popconfirm, Space, Tabs, Tag, Typography, message } from 'antd'
import { cancelOrder, getHistoryOrders, reminderOrder } from '@/api/user'
import { tr } from '@/i18n'
import type { OrderVO } from '@/types'

export const ORDER_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: tr('预约中'), color: 'purple' },
  1: { text: tr('待付款'), color: 'orange' },
  2: { text: tr('待接单'), color: 'blue' },
  3: { text: tr('已接单'), color: 'cyan' },
  4: { text: tr('派送中'), color: 'geekblue' },
  5: { text: tr('已完成'), color: 'green' },
  6: { text: tr('已取消'), color: 'default' },
  7: { text: tr('退款'), color: 'red' },
}

const TABS = [
  { key: 'all', label: tr('全部'), value: undefined },
  { key: '0', label: tr('预约中'), value: 0 },
  { key: '1', label: tr('待付款'), value: 1 },
  { key: '2', label: tr('待接单'), value: 2 },
  { key: '3', label: tr('已接单'), value: 3 },
  { key: '4', label: tr('派送中'), value: 4 },
  { key: '5', label: tr('已完成'), value: 5 },
  { key: '6', label: tr('已取消'), value: 6 },
]

export default function Orders() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [list, setList] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(5)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getHistoryOrders({ page, pageSize, status })
      setList(res.records || [])
      setTotal(res.total || 0)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status])

  useEffect(() => {
    load()
  }, [load])

  const onCancel = async (id: number) => {
    await cancelOrder(id)
    message.success(tr('订单已取消'))
    load()
  }

  const onReminder = async (id: number) => {
    await reminderOrder(id)
    message.success(tr('已提醒商家尽快出餐'))
  }

  return (
    <Card title={tr('我的订单')}>
      <Tabs
        activeKey={status === undefined ? 'all' : String(status)}
        onChange={(key) => {
          setStatus(key === 'all' ? undefined : Number(key))
          setPage(1)
        }}
        items={TABS.map((t) => ({ key: t.key, label: t.label }))}
      />
      <List
        loading={loading}
        dataSource={list}
        locale={{ emptyText: <Empty description={tr('暂无订单')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showTotal: (t) => tr('共 {n} 条', { n: t }),
        }}
        renderItem={(order) => {
          const st = ORDER_STATUS[order.status] || { text: tr('未知'), color: 'default' }
          const dishes = order.orderDetailList?.map((d) => `${d.name}×${d.number}`).join('、')
          return (
            <List.Item
              actions={[
                <Space key="ops">
                  <Button size="small" onClick={() => navigate(`/orders/${order.id}`)}>
                    {tr('详情')}
                  </Button>
                  {(order.status === 1 || order.status === 2) && (
                    <Popconfirm title={tr('确定取消该订单吗？')} onConfirm={() => onCancel(order.id)}>
                      <Button size="small" danger>
                        {tr('取消订单')}
                      </Button>
                    </Popconfirm>
                  )}
                  {(order.status === 2 || order.status === 3) && (
                    <Button size="small" onClick={() => onReminder(order.id)}>
                      {tr('催单')}
                    </Button>
                  )}
                </Space>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Typography.Text strong>{tr('订单号：')}{order.number}</Typography.Text>
                    <Tag color={st.color}>{st.text}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <span>{dishes || order.orderDishes || '—'}</span>
                    <Typography.Text type="secondary">
                      {tr('下单时间：')}{order.orderTime?.replace('T', ' ')}
                    </Typography.Text>
                  </Space>
                }
              />
              <Typography.Text strong style={{ color: '#ff6f00', fontSize: 16 }}>
                ¥{order.amount}
              </Typography.Text>
            </List.Item>
          )
        }}
      />
    </Card>
  )
}
