import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, List, Popconfirm, Skeleton, Space, Tag, Typography, message } from 'antd'
import { cancelOrder, getOrderDetail, reminderOrder } from '@/api/user'
import { ORDER_STATUS } from './Orders'
import { tr } from '@/i18n'
import type { OrderVO } from '@/types'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderVO | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getOrderDetail(Number(id))
        .then(setOrder)
        .catch(() => setOrder(null))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return <Card><Skeleton active /></Card>
  }

  if (!order) {
    return <Card>{tr('订单不存在')}</Card>
  }

  const st = ORDER_STATUS[order.status] || { text: tr('未知'), color: 'default' }

  const onCancel = async () => {
    await cancelOrder(order.id)
    message.success(tr('订单已取消'))
    getOrderDetail(order.id).then(setOrder)
  }

  const onReminder = async () => {
    await reminderOrder(order.id)
    message.success(tr('已提醒商家尽快出餐'))
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            {tr('订单详情')}
            <Tag color={st.color}>{st.text}</Tag>
          </Space>
        }
        extra={
          <Space>
            {(order.status === 1 || order.status === 2) && (
              <Popconfirm title={tr('确定取消该订单吗？')} onConfirm={onCancel}>
                <Button danger>{tr('取消订单')}</Button>
              </Popconfirm>
            )}
            {(order.status === 2 || order.status === 3) && (
              <Button onClick={onReminder}>{tr('催单')}</Button>
            )}
            <Button onClick={() => navigate('/orders')}>{tr('返回列表')}</Button>
          </Space>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label={tr('订单号')}>{order.number}</Descriptions.Item>
          <Descriptions.Item label={tr('下单时间')}>{order.orderTime?.replace('T', ' ')}</Descriptions.Item>
          <Descriptions.Item label={tr('收货人')}>{order.consignee}</Descriptions.Item>
          <Descriptions.Item label={tr('联系电话')}>{order.phone}</Descriptions.Item>
          <Descriptions.Item label={tr('收货地址')} span={2}>
            {order.address || [order.userName].filter(Boolean).join('')}
          </Descriptions.Item>
          <Descriptions.Item label={tr('支付方式')}>
            {order.payMethod === 1 ? tr('微信支付') : order.payMethod === 2 ? tr('支付宝') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={tr('支付状态')}>
            {order.payStatus === 1 ? tr('已支付') : order.payStatus === 0 ? tr('未支付') : tr('退款')}
          </Descriptions.Item>
          <Descriptions.Item label={tr('订单备注')} span={2}>
            {order.remark || tr('无')}
          </Descriptions.Item>
          {order.cancelReason && (
            <Descriptions.Item label={tr('取消原因')} span={2}>
              {order.cancelReason}
            </Descriptions.Item>
          )}
          {order.rejectionReason && (
            <Descriptions.Item label={tr('拒单原因')} span={2}>
              {order.rejectionReason}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title={tr('菜品明细')}>
        <List
          dataSource={order.orderDetailList || []}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <img
                    className="order-detail-image"
                    alt={item.name}
                    src={item.image}
                    onError={(e) => ((e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=No+Image')}
                  />
                }
                title={item.name}
                description={item.dishFlavor ? tr('口味：{flavor}', { flavor: item.dishFlavor }) : undefined}
              />
              <Space size="middle">
                <Typography.Text type="secondary">¥{item.amount} × {item.number}</Typography.Text>
                <Typography.Text strong>¥{(item.amount * item.number).toFixed(2)}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Card>
        <div style={{ textAlign: 'right' }}>
          <Typography.Text>
            {tr('订单金额：')}
            <Typography.Text strong style={{ color: '#ff6f00', fontSize: 24 }}>
              ¥{order.amount}
            </Typography.Text>
          </Typography.Text>
        </div>
      </Card>
    </Space>
  )
}
