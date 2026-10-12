import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  addEmployee,
  getEmployeePage,
  setEmployeeStatus,
  updateEmployee,
} from '@/api/admin'
import type { Employee } from '@/types'
import { tr } from '@/i18n'

export default function Employees() {
  const [list, setList] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form] = Form.useForm<Employee>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getEmployeePage({ page, pageSize, name: name || undefined })
      setList(res.records || [])
      setTotal(res.total || 0)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, name])

  useEffect(() => {
    load()
  }, [load])

  const openModal = (item: Employee | null) => {
    setEditing(item)
    form.setFieldsValue(
      item
        ? { username: item.username, name: item.name, phone: item.phone, sex: item.sex, idNumber: item.idNumber }
        : { username: '', name: '', phone: '', sex: '1', idNumber: '' },
    )
    setOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (editing?.id) {
      await updateEmployee({ ...values, id: editing.id })
      message.success(tr('员工信息已更新'))
    } else {
      await addEmployee(values)
      message.success(tr('员工已新增（初始密码 123456）'))
    }
    setOpen(false)
    load()
  }

  const onToggleStatus = async (id: number, status: number) => {
    await setEmployeeStatus(id, status)
    message.success(status === 1 ? tr('已启用') : tr('已禁用'))
    load()
  }

  const columns = [
    { title: tr('姓名'), dataIndex: 'name', key: 'name' },
    { title: tr('用户名'), dataIndex: 'username', key: 'username' },
    { title: tr('手机号'), dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    { title: tr('性别'), dataIndex: 'sex', key: 'sex', render: (v: string) => (v === '1' ? tr('男') : v === '0' ? tr('女') : '-') },
    {
      title: tr('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? tr('启用') : tr('禁用')}</Tag>,
    },
    { title: tr('创建时间'), dataIndex: 'createTime', key: 'createTime', render: (v: string) => v?.replace('T', ' ') || '-' },
    {
      title: tr('操作'),
      key: 'ops',
      render: (_: unknown, record: Employee) => (
        <Space>
          <Button size="small" onClick={() => openModal(record)}>
            {tr('编辑')}
          </Button>
          <Popconfirm
            title={record.status === 1 ? tr('确定禁用该账号吗？') : tr('确定启用该账号吗？')}
            onConfirm={() => onToggleStatus(record.id!, record.status === 1 ? 0 : 1)}
          >
            <Button size="small" danger={record.status === 1}>
              {record.status === 1 ? tr('禁用') : tr('启用')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={tr('员工管理')}
      extra={
        <Space>
          <Input.Search
            placeholder={tr('按姓名搜索')}
            allowClear
            onSearch={(v) => {
              setName(v)
              setPage(1)
            }}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
            {tr('新增员工')}
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{ current: page, pageSize, total, onChange: setPage, showTotal: (t) => tr('共 {n} 条', { n: t }) }}
      />

      <Modal
        title={editing?.id ? tr('编辑员工') : tr('新增员工')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={tr('保存')}
        destroyOnClose
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <Form.Item name="username" label={tr('用户名')} rules={[{ required: true, message: tr('请输入用户名') }]}>
            <Input placeholder={tr('登录用户名')} disabled={!!editing?.id} />
          </Form.Item>
          <Form.Item name="name" label={tr('姓名')} rules={[{ required: true, message: tr('请输入姓名') }]}>
            <Input placeholder={tr('员工姓名')} />
          </Form.Item>
          <Form.Item name="phone" label={tr('手机号')} rules={[{ required: true, message: tr('请输入手机号') }, { pattern: /^1[3-9]\d{9}$/, message: tr('手机号格式不正确') }]}>
            <Input placeholder={tr('手机号')} maxLength={11} />
          </Form.Item>
          <Form.Item name="sex" label={tr('性别')}>
            <Radio.Group>
              <Radio value="1">{tr('男')}</Radio>
              <Radio value="0">{tr('女')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="idNumber" label={tr('身份证号')} rules={[{ pattern: /^\d{17}[\dXx]$/, message: tr('身份证号格式不正确') }]}>
            <Input placeholder={tr('身份证号')} maxLength={18} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
