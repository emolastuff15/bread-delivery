import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { userEditPassword } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { tr } from '@/i18n'

interface PasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ChangePassword() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: PasswordForm) => {
    setLoading(true)
    try {
      await userEditPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success(tr('密码修改成功，请重新登录'))
      logout()
      navigate('/login', { replace: true })
    } catch {
      /* 错误已统一提示 */
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ maxWidth: 480, margin: '0 auto' }}>
      <Typography.Title level={4}>
        <LockOutlined /> {tr('修改密码')}
      </Typography.Title>
      <Form<PasswordForm> onFinish={onFinish} size="large">
        <Form.Item name="oldPassword" rules={[{ required: true, message: tr('请输入旧密码') }]}>
          <Input.Password prefix={<LockOutlined />} placeholder={tr('旧密码')} autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          rules={[
            { required: true, message: tr('请输入新密码') },
            { min: 6, max: 20, message: tr('密码长度 6-20 位') },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={tr('新密码（6-20位）')} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: tr('请再次输入新密码') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error(tr('两次输入的密码不一致')))
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={tr('确认新密码')} autoComplete="new-password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {tr('确认修改')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
