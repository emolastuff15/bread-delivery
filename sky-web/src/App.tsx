import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminGuard, UserGuard } from '@/components/RequireAuth'
import UserLayout from '@/layouts/UserLayout'
import AdminLayout from '@/layouts/AdminLayout'
import { useThemeStore } from '@/stores/theme'

// 用户端
import Portal from '@/pages/Portal'
import UserLogin from '@/pages/user/Login'
import UserRegister from '@/pages/user/Register'
import ChangePassword from '@/pages/user/ChangePassword'
import Home from '@/pages/user/Home'
import Cart from '@/pages/user/Cart'
import Checkout from '@/pages/user/Checkout'
import Payment from '@/pages/user/Payment'
import Orders from '@/pages/user/Orders'
import OrderDetail from '@/pages/user/OrderDetail'
import AddressBook from '@/pages/user/AddressBook'

// 管理端
import AdminLogin from '@/pages/admin/Login'
import Dashboard from '@/pages/admin/Dashboard'
import ShopStatus from '@/pages/admin/ShopStatus'
import Employees from '@/pages/admin/Employees'
import Categories from '@/pages/admin/Categories'
import Dishes from '@/pages/admin/Dishes'
import Setmeals from '@/pages/admin/Setmeals'
import AdminOrders from '@/pages/admin/Orders'
import Statistics from '@/pages/admin/Statistics'
import ChartStats from '@/pages/admin/ChartStats'
import Inform from '@/pages/admin/Inform'
import Reservations from '@/pages/admin/Reservations'
import NotFound from '@/pages/NotFound'

export default function App() {
  // 主题同步到 body：body.theme-warm 时用户端切换为暖色调（管理端样式不受影响）
  const warm = useThemeStore((s) => s.warm)
  useEffect(() => {
    document.body.classList.toggle('theme-warm', warm)
  }, [warm])

  return (
    <Routes>
      {/* 门户页（登录/注册前，公开访问） */}
      <Route path="/portal" element={<Portal />} />

      {/* 用户端 */}
      <Route path="/login" element={<UserLogin />} />
      <Route path="/register" element={<UserRegister />} />
      <Route
        element={
          <UserGuard>
            <UserLayout />
          </UserGuard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment/:id" element={<Payment />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/address" element={<AddressBook />} />
        <Route path="/change-password" element={<ChangePassword />} />
      </Route>

      {/* 管理端 */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="setmeals" element={<Setmeals />} />
        <Route path="dishes" element={<Dishes />} />
        <Route path="categories" element={<Categories />} />
        <Route path="employees" element={<Employees />} />
        <Route path="chart" element={<ChartStats />} />
        <Route path="inform" element={<Inform />} />
        <Route path="shop" element={<ShopStatus />} />
      </Route>

      {/* 404（对应原版 views/404.vue，原版为 /404 + 通配重定向） */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
