import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  addCategory,
  deleteCategory,
  getCategoryPage,
  setCategoryStatus,
  updateCategory,
} from '@/api/admin'
import { tr } from '@/i18n'
import type { Category } from '@/types'

export default function Categories() {
  const [list, setList] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [name, setName] = useState('')
  const [type, setType] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form] = Form.useForm<Category>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCategoryPage({ page, pageSize, name: name || undefined, type })
      setList(res.records || [])
      setTotal(res.total || 0)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, name, type])

  useEffect(() => {
    load()
  }, [load])

  const openModal = (item: Category | null) => {
    setEditing(item)
    form.setFieldsValue(
      item
        ? { name: item.name, type: item.type, sort: item.sort }
        : { name: '', type: type ?? 1, sort: 0 },
    )
    setOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (editing?.id) {
      await updateCategory({ ...values, id: editing.id })
      message.success(tr('分类已更新'))
    } else {
      await addCategory({ ...values, status: 1 })
      message.success(tr('分类已新增'))
    }
    setOpen(false)
    load()
  }

  const onDelete = async (id: number) => {
    await deleteCategory(id)
    message.success(tr('分类已删除'))
    load()
  }

  const onToggle = async (id: number, status: number) => {
    await setCategoryStatus(id, status)
    load()
  }

  const columns = [
    { title: tr('分类名称'), dataIndex: 'name', key: 'name' },
    {
      title: tr('类型'),
      dataIndex: 'type',
      key: 'type',
      render: (v: number) => (v === 1 ? tr('菜品分类') : tr('套餐分类')),
    },
    { title: tr('排序'), dataIndex: 'sort', key: 'sort' },
    {
      title: tr('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (v: number) => (
        <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? tr('启用') : tr('禁用')}</Tag>
      ),
    },
    {
      title: tr('操作时间'),
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (v: string) => v?.replace('T', ' ') || '-',
    },
    {
      title: tr('操作'),
      key: 'ops',
      render: (_: unknown, record: Category) => (
        <Space>
          <Button size="small" onClick={() => openModal(record)}>
            {tr('编辑')}
          </Button>
          <Popconfirm title={tr('确定删除该分类吗？')} onConfirm={() => onDelete(record.id)}>
            <Button size="small" danger>
              {tr('删除')}
            </Button>
          </Popconfirm>
          <Popconfirm
            title={record.status === 1 ? tr('确定禁用吗？') : tr('确定启用吗？')}
            onConfirm={() => onToggle(record.id, record.status === 1 ? 0 : 1)}
          >
            <Button size="small">{record.status === 1 ? tr('禁用') : tr('启用')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={tr('分类管理')}
      extra={
        <Space>
          <Radio.Group
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
          >
            <Radio.Button value={undefined}>{tr('全部')}</Radio.Button>
            <Radio.Button value={1}>{tr('菜品')}</Radio.Button>
            <Radio.Button value={2}>{tr('套餐')}</Radio.Button>
          </Radio.Group>
          <Input.Search
            placeholder={tr('按名称搜索')}
            allowClear
            onSearch={(v) => {
              setName(v)
              setPage(1)
            }}
            style={{ width: 180 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
            {tr('新增分类')}
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
        title={editing?.id ? tr('编辑分类') : tr('新增分类')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={tr('保存')}
        destroyOnClose
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <Form.Item
            name="name"
            label={tr('分类名称')}
            rules={[{ required: true, message: tr('请输入分类名称') }]}
          >
            <Input placeholder={tr('如：热菜、凉菜、主食')} />
          </Form.Item>
          <Form.Item name="type" label={tr('分类类型')} rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={1}>{tr('菜品分类')}</Radio>
              <Radio value={2}>{tr('套餐分类')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="sort" label={tr('排序')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
