import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import { userLogin } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { tr } from '@/i18n'

export default function UserLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUserLogin } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from || '/'

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await userLogin(values)
      setUserLogin(res.token, { id: res.id, username: res.username, name: res.name })
      message.success(tr('登录成功'))
      navigate(from, { replace: true })
    } catch {
      /* 错误已统一提示 */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--sky-login-from) 0%, var(--sky-login-to) 100%)',
      }}
    >
      <Card style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ShopOutlined style={{ fontSize: 40, color: 'var(--sky-accent)' }} />
          <Typography.Title level={3} style={{ marginTop: 8 }}>
            {tr('苍穹外卖 · 用户登录')}
          </Typography.Title>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: tr('请输入用户名') }]}>
            <Input prefix={<UserOutlined />} placeholder={tr('用户名')} autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: tr('请输入密码') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={tr('密码')} autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {tr('登录')}
            </Button>
          </Form.Item>
        </Form>
        {/* 用户端不暴露任何管理端入口 */}
        <div style={{ textAlign: 'center' }}>
          <Link to="/register">{tr('还没有账号？去注册')}</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/portal">{tr('← 返回门店首页')}</Link>
        </div>
      </Card>
    </div>
  )
}
