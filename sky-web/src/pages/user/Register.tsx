import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, PhoneOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import { userRegister } from '@/api/auth'
import { tr } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

interface RegisterForm {
  username: string
  password: string
  confirmPassword: string
  name?: string
  phone?: string
}

export default function UserRegister() {
  const navigate = useNavigate()
  const { setUserLogin } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: RegisterForm) => {
    setLoading(true)
    try {
      const res = await userRegister({
        username: values.username,
        password: values.password,
        name: values.name,
        phone: values.phone,
      })
      // 注册成功直接返回 token，免登录进入
      setUserLogin(res.token, { id: res.id, username: res.username, name: res.name })
      message.success(tr('注册成功，已自动登录'))
      navigate('/', { replace: true })
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
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ShopOutlined style={{ fontSize: 40, color: 'var(--sky-accent)' }} />
          <Typography.Title level={3} style={{ marginTop: 8 }}>
            {tr('苍穹外卖 · 用户注册')}
          </Typography.Title>
        </div>
        <Form<RegisterForm> onFinish={onFinish} size="large" initialValues={{ name: '', phone: '' }}>
          <Form.Item
            name="username"
            rules={[
              { required: true, message: tr('请输入用户名') },
              { min: 3, max: 20, message: tr('用户名长度 3-20 位') },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder={tr('用户名（登录账号）')} autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: tr('请输入密码') },
              { min: 6, max: 20, message: tr('密码长度 6-20 位') },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={tr('密码（6-20位）')} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: tr('请再次输入密码') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(tr('两次输入的密码不一致')))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={tr('确认密码')} autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="name" rules={[{ max: 20, message: tr('姓名过长') }]}>
            <Input placeholder={tr('姓名（选填）')} />
          </Form.Item>
          <Form.Item
            name="phone"
            rules={[{ pattern: /^1[3-9]\d{9}$/, message: tr('手机号格式不正确') }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder={tr('手机号（选填）')} maxLength={11} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {tr('注册')}
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Link to="/login">{tr('已有账号？去登录')}</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Link to="/portal">{tr('← 返回门店首页')}</Link>
        </div>
      </Card>
    </div>
  )
}
