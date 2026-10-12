import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  ShopOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CoffeeOutlined,
  CarryOutOutlined,
  ProfileOutlined,
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
  BarChartOutlined,
  LineChartOutlined,
  BellOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'
import { useAdminSocket } from '@/hooks/useAdminSocket'
import PasswordModal from '@/pages/admin/components/PasswordModal'
import { tr } from '@/i18n'

const { Header, Sider, Content } = Layout

/** 菜单顺序对齐原版 Vue 管理端：工作台 / 数据统计 / 订单管理 / 套餐 / 菜品 / 分类 / 员工 */
const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: tr('工作台') },
  { key: 'statistics', icon: <BarChartOutlined />, label: tr('数据统计') },
  { key: 'orders', icon: <CarryOutOutlined />, label: tr('订单管理') },
  { key: 'reservations', icon: <CalendarOutlined />, label: tr('预定订单') },
  { key: 'setmeals', icon: <ProfileOutlined />, label: tr('套餐管理') },
  { key: 'dishes', icon: <CoffeeOutlined />, label: tr('菜品管理') },
  { key: 'categories', icon: <AppstoreOutlined />, label: tr('分类管理') },
  { key: 'employees', icon: <TeamOutlined />, label: tr('员工管理') },
  { key: 'chart', icon: <LineChartOutlined />, label: tr('图表统计') },
  { key: 'shop', icon: <ShopOutlined />, label: tr('营业状态') },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { adminInfo, logout } = useAuthStore()
  const [passwordOpen, setPasswordOpen] = useState(false)

  // 全局 WebSocket 提醒（来单/催单/预约）
  useAdminSocket()

  const path = location.pathname
  const current = menuItems.find((m) => path.startsWith(`/admin/${m.key}`))?.key || 'dashboard'

  const adminMenu = {
    items: [
      { key: 'password', icon: <LockOutlined />, label: tr('修改密码') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: tr('退出登录') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout()
        navigate('/admin/login')
      } else if (key === 'password') {
        setPasswordOpen(true)
      }
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" breakpoint="lg" width={200}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 17,
            fontWeight: 600,
            gap: 8,
          }}
        >
          <ShopOutlined /> {tr('苍穹外卖·管理端')}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[current]}
          items={menuItems}
          onClick={({ key }) => navigate(`/admin/${key}`)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Space size="middle">
            <Badge dot>
              <BellOutlined style={{ fontSize: 16 }} />
            </Badge>
            <Typography.Text>
              {tr('欢迎，')}
              {adminInfo?.name || adminInfo?.userName || tr('管理员')}
            </Typography.Text>
            <Dropdown menu={adminMenu}>
              <Avatar style={{ backgroundColor: '#1677ff', cursor: 'pointer' }} icon={<UserOutlined />} />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>

      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Layout>
  )
}
