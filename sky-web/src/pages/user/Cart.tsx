import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Empty, List, Popconfirm, Space, Typography, message } from 'antd'
import { CalendarOutlined, DeleteOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { addToCart, cleanCart, getCartList, subFromCart } from '@/api/user'
import { useReservationStore } from '@/stores/reservation'
import ReserveTimeModal from '@/components/ReserveTimeModal'
import { tr } from '@/i18n'
import type { ShoppingCart } from '@/types'

export default function Cart() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ShoppingCart[]>([])
  const [loading, setLoading] = useState(false)
  // 创建预约弹窗（时间与顶栏"创建预约"共用同一个 store）
  const [reserveOpen, setReserveOpen] = useState(false)
  const reservationTime = useReservationStore((s) => s.reservationTime)
  const setReservationTime = useReservationStore((s) => s.setReservationTime)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getCartList()
      setItems(list || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const total = items.reduce((sum, item) => sum + (item.amount || 0) * (item.number || 0), 0)

  const onAdd = async (item: ShoppingCart) => {
    await addToCart({
      dishId: item.dishId,
      setmealId: item.setmealId,
      dishFlavor: item.dishFlavor,
    })
    load()
  }

  const onSub = async (item: ShoppingCart) => {
    await subFromCart({
      dishId: item.dishId,
      setmealId: item.setmealId,
      dishFlavor: item.dishFlavor,
    })
    load()
  }

  const onClean = async () => {
    await cleanCart()
    message.success(tr('购物车已清空'))
    load()
  }

  return (
    <Card
      title={tr('购物车')}
      loading={loading}
      extra={
        items.length > 0 ? (
          <Popconfirm title={tr('确定清空购物车吗？')} onConfirm={onClean}>
            <Button danger size="small" icon={<DeleteOutlined />}>
              {tr('清空')}
            </Button>
          </Popconfirm>
        ) : null
      }
    >
      {items.length === 0 ? (
        <Empty description={tr('购物车是空的，去点餐吧')}>
          <Button type="primary" onClick={() => navigate('/')}>
            {tr('去点餐')}
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Space key="ops">
                  <Button size="small" shape="circle" icon={<MinusOutlined />} onClick={() => onSub(item)} />
                  <Typography.Text strong>{item.number}</Typography.Text>
                  <Button size="small" shape="circle" icon={<PlusOutlined />} onClick={() => onAdd(item)} />
                </Space>,
              ]}
            >
              <List.Item.Meta
                avatar={<img className="cart-item-image" alt={item.name} src={item.image} />}
                title={item.name}
                description={
                  <span>
                    {item.dishFlavor && <span>{tr('口味：')}{item.dishFlavor}；</span>}
                    {tr('单价 ¥')}{item.amount}
                  </span>
                }
              />
              <Typography.Text strong style={{ color: '#ff6f00', fontSize: 16 }}>
                ¥{((item.amount || 0) * (item.number || 0)).toFixed(2)}
              </Typography.Text>
            </List.Item>
          )}
        />
      )}
      {/* 已选预约时间提示（来自顶栏"创建预约"或本页"创建预定"） */}
      {reservationTime && (
        <Alert
          type="warning"
          showIcon
          icon={<CalendarOutlined />}
          style={{ marginTop: 16 }}
          message={tr('当前为预约下单：{time}', { time: reservationTime })}
          description={tr('下单并付款后进入「预约中」，系统会在预约时间前 1 小时提醒商家备餐。')}
          action={
            <Button size="small" onClick={() => setReservationTime(null)}>
              {tr('清除')}
            </Button>
          }
        />
      )}

      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            marginTop: 16,
            flexWrap: 'wrap',
          }}
        >
          <Typography.Text>
            {tr('合计：')}
            <Typography.Text strong style={{ color: '#ff6f00', fontSize: 24 }}>
              ¥{total.toFixed(2)}
            </Typography.Text>
          </Typography.Text>
          <Button size="large" icon={<CalendarOutlined />} onClick={() => setReserveOpen(true)}>
            {reservationTime ? tr('修改预约时间') : tr('创建预约')}
          </Button>
          <Button type="primary" size="large" onClick={() => navigate('/checkout')}>
            {tr('去结算')}
          </Button>
        </div>
      )}

      {/* 创建预约：与顶栏共用同一个弹窗与同一个时间（stores/reservation） */}
      <ReserveTimeModal
        open={reserveOpen}
        initialValue={reservationTime}
        okText={tr('确定，去结算')}
        onCancel={() => setReserveOpen(false)}
        onConfirm={(time) => {
          setReservationTime(time.format('YYYY-MM-DD HH:mm:ss'))
          setReserveOpen(false)
          navigate('/checkout')
        }}
      />
    </Card>
  )
}
