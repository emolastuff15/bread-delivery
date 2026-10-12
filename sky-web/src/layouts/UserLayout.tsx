import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, Dropdown, Layout, Menu, Space, Tag } from 'antd'
import {
  HomeOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  EnvironmentOutlined,
  UserOutlined,
  KeyOutlined,
  LogoutOutlined,
  ShopOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { getCartList, getHistoryOrders, getShopStatus } from '@/api/user'
import { getTokenType } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useReservationStore } from '@/stores/reservation'
import ReserveTimeModal from '@/components/ReserveTimeModal'
import { message } from 'antd'
import { tr } from '@/i18n'
import type { ShoppingCart } from '@/types'

const { Header, Content } = Layout

export default function UserLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout } = useAuthStore()
  const [cartCount, setCartCount] = useState(0)
  const [shopOpen, setShopOpen] = useState<boolean | null>(null)
  const warm = useThemeStore((s) => s.warm)
  const setWarm = useThemeStore((s) => s.setWarm)
  const reservationTime = useReservationStore((s) => s.reservationTime)
  const setReservationTime = useReservationStore((s) => s.setReservationTime)
  const [reserveOpen, setReserveOpen] = useState(false)

  /** 是否处于预约模式：已选预约时间，或已有进行中的预约单（暖色调） */
  const inReservation = !!reservationTime || warm

  // 顶栏导航高亮
  const path = location.pathname
  const selectedKey =
    path.startsWith('/orders')
      ? 'orders'
      : path.startsWith('/address')
        ? 'address'
        : path.startsWith('/cart')
          ? 'cart'
          : 'home'

  const loadCart = async () => {
    try {
      const list = await getCartList()
      setCartCount(list.reduce((sum: number, item: ShoppingCart) => sum + (item.number || 0), 0))
    } catch {
      /* 未登录时忽略 */
    }
  }

  const loadShop = async () => {
    try {
      const status = await getShopStatus()
      setShopOpen(status === 1)
    } catch {
      setShopOpen(null)
    }
  }

  useEffect(() => {
    loadShop()
    // 主题校正（仅首次挂载时做一次）：存在"预约中(status=0)"的订单 → 暖色调。
    // 只在挂载时校正，避免用户手动"取消预约"后又被自动刷回暖色。
    if (getTokenType() === 'user') {
      getHistoryOrders({ page: 1, pageSize: 1, status: 0 })
        .then((res) => {
          if ((res.records || []).length > 0) setWarm(true)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (getTokenType() === 'user') {
      loadCart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const userMenu = {
    items: [
      { key: 'password', icon: <KeyOutlined />, label: tr('修改密码') },
      { key: 'logout', icon: <LogoutOutlined />, label: tr('退出登录') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'password') {
        navigate('/change-password')
      } else if (key === 'logout') {
        logout()
        navigate('/login')
      }
    },
  }

  return (
    <Layout className="user-app-bg" style={{ minHeight: '100vh', background: 'var(--sky-bg)' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, background: 'var(--sky-header)' }}>
        <div
          style={{
            color: 'var(--sky-header-text)',
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onClick={() => navigate('/')}
        >
          <ShopOutlined /> {tr('苍穹外卖')}
        </div>
        {inReservation && (
          <Tag color="orange" style={{ marginRight: 0 }}>
            {tr('预约模式')}
          </Tag>
        )}
        {shopOpen !== null && (
          <Tag color={shopOpen ? 'green' : 'red'} style={{ marginRight: 0 }}>
            {shopOpen ? tr('营业中') : tr('已打烊')}
          </Tag>
        )}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          style={{ flex: 1, minWidth: 0, background: 'transparent' }}
          items={[
            { key: 'home', icon: <HomeOutlined />, label: tr('首页') },
            { key: 'cart', icon: <Badge count={cartCount} size="small"><ShoppingCartOutlined /></Badge>, label: tr('购物车') },
            { key: 'orders', icon: <UnorderedListOutlined />, label: tr('我的订单') },
            { key: 'address', icon: <EnvironmentOutlined />, label: tr('地址簿') },
          ]}
          onClick={({ key }) => navigate(key === 'home' ? '/' : `/${key}`)}
        />
        <Space>
          {/* 预约按钮：位于用户名左侧。未进入预约 → 创建预约；已进入 → 再点即取消预约 */}
          {inReservation ? (
            <Button
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setReservationTime(null)
                setWarm(false)
                message.success(tr('已取消预约'))
              }}
            >
              {tr('取消预约')}
            </Button>
          ) : (
            <Button
              icon={<CalendarOutlined />}
              onClick={() => {
                if (getTokenType() !== 'user') {
                  message.info(tr('请先登录'))
                  navigate('/login')
                  return
                }
                setReserveOpen(true)
              }}
            >
              {tr('创建预约')}
            </Button>
          )}
          {userInfo ? (
            <Dropdown menu={userMenu}>
              <Button type="text" style={{ color: 'var(--sky-header-text)' }} icon={<UserOutlined />}>
                {userInfo.name || userInfo.username || tr('我的')}
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" onClick={() => navigate('/login')}>
              {tr('登录')}
            </Button>
          )}
        </Space>
      </Header>
      <Content>
        <div className="page-container">
          {inReservation && (
            <div className="theme-banner">
              {reservationTime
                ? tr('已选择预约时间：{time}，将按预约单下单。', { time: reservationTime })
                : tr('您有进行中的预约单，当前为预约模式。')}
              {tr('可在')} <a onClick={() => navigate('/orders')}>{tr('我的订单')}</a> {tr('中查看。')}
            </div>
          )}
          <Outlet />
        </div>
      </Content>

      {/* 顶栏"创建预约"弹窗：选定时间 → 暖色调 + 进购物车 */}
      <ReserveTimeModal
        open={reserveOpen}
        initialValue={reservationTime}
        okText={tr('确定，去购物车')}
        onCancel={() => setReserveOpen(false)}
        onConfirm={(time) => {
          setReservationTime(time.format('YYYY-MM-DD HH:mm:ss'))
          setWarm(true)
          setReserveOpen(false)
          message.success(tr('已选择预约时间：{time}', { time: time.format('YYYY-MM-DD HH:mm') }))
          navigate('/cart')
        }}
      />
    </Layout>
  )
}
