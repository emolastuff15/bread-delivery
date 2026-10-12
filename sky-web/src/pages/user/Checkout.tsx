import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  List,
  Radio,
  Space,
  Typography,
  message,
} from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { getAddressList, getCartList, submitOrder } from '@/api/user'
import { tr } from '@/i18n'
import {
  RESERVE_SHOW_TIME,
  isValidReserveTime,
  normalizeReserveTime,
  reserveDisabledDate,
  reserveDisabledTime,
} from '@/utils/reserveTime'
import { useThemeStore } from '@/stores/theme'
import { useReservationStore } from '@/stores/reservation'
import type { AddressBook, ShoppingCart } from '@/types'

export default function Checkout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setWarm = useThemeStore((s) => s.setWarm)
  // 预约时间：优先取 URL 参数，其次取顶栏"创建预约"写入的 store
  const storedReservationTime = useReservationStore((s) => s.reservationTime)
  const storeSetReservationTime = useReservationStore((s) => s.setReservationTime)

  const [addresses, setAddresses] = useState<AddressBook[]>([])
  const [addressId, setAddressId] = useState<number | null>(null)
  const [items, setItems] = useState<ShoppingCart[]>([])
  const [remark, setRemark] = useState('')
  const [payMethod, setPayMethod] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [reservationTime, setReservationTimeState] = useState<Dayjs | null>(() => {
    const raw = searchParams.get('reservationTime') || storedReservationTime
    return raw && dayjs(raw).isValid() ? dayjs(raw) : null
  })

  /** 修改预约时间时同步回 store，保证顶栏/购物车/结算页三处一致 */
  const setReservationTime = (v: Dayjs | null) => {
    setReservationTimeState(v)
    storeSetReservationTime(v ? v.format('YYYY-MM-DD HH:mm:ss') : null)
  }

  useEffect(() => {
    getAddressList()
      .then((list) => {
        setAddresses(list || [])
        const def = (list || []).find((a) => a.isDefault === 1) || (list || [])[0]
        if (def?.id) setAddressId(def.id)
      })
      .catch(() => {})
    getCartList()
      .then((list) => setItems(list || []))
      .catch(() => setItems([]))
  }, [])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.amount || 0) * (item.number || 0), 0),
    [items],
  )

  const selectedAddress = addresses.find((a) => a.id === addressId)

  const onSubmit = async () => {
    if (!addressId) {
      message.warning(tr('请先选择收货地址'))
      return
    }
    if (items.length === 0) {
      message.warning(tr('购物车为空'))
      return
    }
    if (reservationTime && !isValidReserveTime(reservationTime)) {
      message.warning(tr('只能选整点（如 16:00、18:00），且至少比当前时间晚 1 小时'))
      return
    }
    setSubmitting(true)
    try {
      const res = await submitOrder({
        addressBookId: addressId,
        payMethod,
        remark: remark || undefined,
        deliveryStatus: 1,
        tablewareStatus: 1,
        tablewareNumber: 0,
        packAmount: 0,
        amount: Number(total.toFixed(2)),
        reservationTime: reservationTime ? reservationTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
      })
      if (reservationTime) {
        // 预约单创建成功 → 用户端切换为暖色调主题
        setWarm(true)
      }
      // 预约时间已用掉，清空 store，避免影响后续订单
      storeSetReservationTime(null)
      message.success(tr('下单成功，订单号：') + res.orderNumber)
      // 下单后进入付款页面（本项目无真实支付，点击付款即视为支付成功）
      navigate(`/payment/${res.id}`)
    } catch {
      /* 错误已统一提示 */
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0 && addresses.length === 0) {
    return (
      <Card>
        <Empty description={tr('暂无可结算内容')}>
          <Button type="primary" onClick={() => navigate('/')}>
            {tr('去点餐')}
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title={tr('1. 收货地址')}>
        {addresses.length === 0 ? (
          <Empty
            description={tr('还没有收货地址')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/address')}>
              {tr('去添加地址')}
            </Button>
          </Empty>
        ) : (
          <Radio.Group
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {addresses.map((a) => (
                <Radio key={a.id} value={a.id!}>
                  <span>
                    {[a.provinceName, a.cityName, a.districtName].filter(Boolean).join('')}
                    {a.detail}
                    （{a.consignee} {a.phone}）
                    {a.label ? ` [${a.label}]` : ''}
                    {a.isDefault === 1 ? tr('（默认）') : ''}
                  </span>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
      </Card>

      <Card title={tr('2. 商品清单')}>
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<img className="cart-item-image" alt={item.name} src={item.image} />}
                title={item.name}
                description={`¥${item.amount} × ${item.number}${item.dishFlavor ? `（${item.dishFlavor}）` : ''}`}
              />
              <Typography.Text strong>
                ¥{((item.amount || 0) * (item.number || 0)).toFixed(2)}
              </Typography.Text>
            </List.Item>
          )}
        />
      </Card>

      <Card title={tr('3. 支付与备注')}>
        {reservationTime && (
          <Alert
            type="warning"
            showIcon
            icon={<CalendarOutlined />}
            style={{ marginBottom: 16 }}
            message={tr('这是一笔预约订单')}
            description={
              <>
                <div>{tr('预约单需要先完成付款；付款后进入「预约中」，系统会在预定时间前 1 小时提醒商家准备。')}</div>
                <div>{tr('只能选整点（如 16:00、18:00），且至少比当前时间晚 1 小时')}</div>
              </>
            }
          />
        )}
        <Descriptions column={1} size="small">
          <Descriptions.Item label={tr('预定时间')}>
            <Space>
              <DatePicker
                showTime={RESERVE_SHOW_TIME}
                format="YYYY-MM-DD HH:mm"
                placeholder={tr('不选则为立即送达的普通订单')}
                value={reservationTime}
                onChange={(v) => setReservationTime(v ? normalizeReserveTime(v) : null)}
                disabledDate={reserveDisabledDate}
                disabledTime={reserveDisabledTime}
                style={{ width: 240 }}
              />
              {reservationTime && (
                <Button size="small" onClick={() => setReservationTime(null)}>
                  {tr('清除（改为普通订单）')}
                </Button>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label={tr('支付方式')}>
            <Radio.Group value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <Radio value={1}>{tr('微信支付')}</Radio>
              <Radio value={2}>{tr('支付宝')}</Radio>
            </Radio.Group>
          </Descriptions.Item>
          <Descriptions.Item label={tr('订单备注')}>
            <Input.TextArea
              placeholder={tr('口味、配送等备注（选填）')}
              rows={2}
              value={remark}
              maxLength={200}
              onChange={(e) => setRemark(e.target.value)}
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary">
            {tr('配送至：')}{selectedAddress ? `${[selectedAddress.provinceName, selectedAddress.cityName, selectedAddress.districtName].filter(Boolean).join('')}${selectedAddress.detail}` : tr('未选择')}
          </Typography.Text>
          <Space size="large" align="center">
            <Typography.Text>
              {tr('应付：')}
              <Typography.Text strong style={{ color: '#ff6f00', fontSize: 26 }}>
                ¥{total.toFixed(2)}
              </Typography.Text>
            </Typography.Text>
            <Button type="primary" size="large" loading={submitting} onClick={onSubmit}>
              {reservationTime ? tr('提交预约单') : tr('提交订单')}
            </Button>
          </Space>
        </div>
      </Card>
    </Space>
  )
}
