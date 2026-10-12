import { useState } from 'react'
import { Form, Input, Modal, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { editEmployeePassword } from '@/api/admin'
import { tr } from '@/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * 修改密码弹窗
 * 移植自原版 layout/components/components/password.vue
 * 后端接口：PUT /admin/employee/editPassword（empId 由后端从 token 取，前端不传）
 */
export default function PasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      await editEmployeePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success(tr('密码修改成功'))
      form.resetFields()
      onClose()
    } catch {
      /* 错误已统一提示 */
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={tr('修改密码')}
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText={tr('确认修改')}
      confirmLoading={loading}
      destroyOnClose
      width={420}
    >
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 17 }} style={{ marginTop: 16 }}>
        <Form.Item name="oldPassword" label={tr('旧密码')} rules={[{ required: true, message: tr('请输入旧密码') }]}>
          <Input.Password prefix={<LockOutlined />} placeholder={tr('请输入旧密码')} />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={tr('新密码')}
          rules={[
            { required: true, message: tr('请输入新密码') },
            { min: 6, max: 20, message: tr('密码长度 6-20 位') },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={tr('请输入新密码')} />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={tr('确认密码')}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: tr('请再次输入新密码') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                return Promise.reject(new Error(tr('两次输入的密码不一致')))
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={tr('请再次输入新密码')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
