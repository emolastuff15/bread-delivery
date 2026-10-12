import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Descriptions, Result, Skeleton, Space, Tag, Typography, message } from 'antd'
import { CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getOrderDetail, mockPay } from '@/api/user'
import { useThemeStore } from '@/stores/theme'
import { tr } from '@/i18n'
import type { OrderVO } from '@/types'

/**
 * 付款页面
 *
 * 本项目未接入真实支付业务（微信支付未配置商户号），因此"点击付款"直接调用后端
 * `PUT /user/order/mockPay` 视为支付成功，由后端 paySuccess 完成状态流转：
 *   预约单 → 0 预约中（等待预约时间到达，到点前 1 小时提醒商家）
 *   普通单 → 2 待接单
 */
export default function Payment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const setWarm = useThemeStore((s) => s.setWarm)

  const [order, setOrder] = useState<OrderVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (!id) return
    getOrderDetail(Number(id))
      .then((o) => {
        setOrder(o)
        if (o?.reservationTime) setWarm(true)
        if (o?.payStatus === 1) setPaid(true)
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id, setWarm])

  const onPay = async () => {
    if (!order?.number) return
    setPaying(true)
    try {
      await mockPay(order.number)
      setPaid(true)
      if (order.reservationTime) setWarm(true)
      message.success(tr('支付成功'))
    } catch {
      /* 错误已统一提示 */
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    )
  }

  if (!order) {
    return (
      <Card>
        <Result status="warning" title={tr('订单不存在')} extra={<Button onClick={() => navigate('/orders')}>{tr('返回订单列表')}</Button>} />
      </Card>
    )
  }

  const isReservation = !!order.reservationTime

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <Alert
        type="info"
        showIcon
        message={tr('演示环境说明')}
        description={tr('本项目未接入真实支付业务，点击「确认付款」即视为支付成功。')}
      />

      {paid ? (
        <Card>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title={tr('支付成功')}
            subTitle={
              isReservation
                ? tr('预约单已确认，商家会在 {time} 前 1 小时收到提醒', { time: order.reservationTime?.replace('T', ' ') })
                : tr('订单已提交，等待商家接单')
            }
            extra={[
              <Button type="primary" key="detail" onClick={() => navigate(`/orders/${order.id}`)}>
                {tr('查看订单详情')}
              </Button>,
              <Button key="home" onClick={() => navigate('/')}>
                {tr('继续点餐')}
              </Button>,
            ]}
          />
        </Card>
      ) : (
        <>
          <Card title={tr('订单信息')}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={tr('订单号')}>{order.number}</Descriptions.Item>
              <Descriptions.Item label={tr('订单类型')}>
                {isReservation ? <Tag icon={<CalendarOutlined />} color="purple">{tr('预约单')}</Tag> : <Tag>{tr('普通订单')}</Tag>}
              </Descriptions.Item>
              {isReservation && (
                <Descriptions.Item label={tr('预定时间')}>
                  {order.reservationTime?.replace('T', ' ')}
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    （{dayjs(order.reservationTime).diff(dayjs(), 'minute')} {tr('分钟后）')}
                  </Typography.Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={tr('收货人')}>
                {order.consignee} {order.phone}
              </Descriptions.Item>
              <Descriptions.Item label={tr('收货地址')}>{order.address}</Descriptions.Item>
              <Descriptions.Item label={tr('订单备注')}>{order.remark || tr('无')}</Descriptions.Item>
              <Descriptions.Item label={tr('支付方式')}>{order.payMethod === 2 ? tr('支付宝') : tr('微信支付')}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Text>
                {tr('应付金额：')}
                <Typography.Text strong style={{ color: '#ff6f00', fontSize: 28 }}>
                  ¥{order.amount}
                </Typography.Text>
              </Typography.Text>
              <Space>
                <Button onClick={() => navigate('/orders')}>{tr('稍后付款')}</Button>
                <Button type="primary" size="large" loading={paying} onClick={onPay}>
                  {tr('确认付款')}
                </Button>
              </Space>
            </div>
          </Card>
        </>
      )}
    </Space>
  )
}
