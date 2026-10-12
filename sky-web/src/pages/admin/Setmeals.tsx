import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
  message,
} from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import {
  addSetmeal,
  deleteSetmeal,
  getCategoryList,
  getDishPage,
  getSetmealPage,
  updateSetmeal,
  uploadFile,
} from '@/api/admin'
import type { Category, Dish, SetmealDish, SetmealVO } from '@/types'
import { tr } from '@/i18n'

export default function Setmeals() {
  const [list, setList] = useState<SetmealVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [name, setName] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SetmealVO | null>(null)
  const [image, setImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [setmealDishes, setSetmealDishes] = useState<SetmealDish[]>([])
  const [form] = Form.useForm<SetmealVO>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSetmealPage({ page, pageSize, name: name || undefined })
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

  useEffect(() => {
    getCategoryList(2).then((c) => setCategories(c || [])).catch(() => {})
    getDishPage({ page: 1, pageSize: 200 })
      .then((res) => setDishes(res.records || []))
      .catch(() => {})
  }, [])

  const openModal = (item: SetmealVO | null) => {
    setEditing(item)
    setImage(item?.image || '')
    setSetmealDishes(
      item?.setmealDishes?.length
        ? item.setmealDishes.map((d) => ({ dishId: d.dishId, copies: d.copies }))
        : [],
    )
    form.setFieldsValue(
      item
        ? { name: item.name, categoryId: item.categoryId, price: item.price, description: item.description, status: item.status }
        : { name: '', categoryId: undefined, price: 0, description: '', status: 1 },
    )
    setOpen(true)
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setImage(url)
      message.success(tr('图片上传成功'))
    } catch {
      /* ignore */
    } finally {
      setUploading(false)
    }
    return false
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    const payload: SetmealVO = {
      ...values,
      image: image || undefined,
      setmealDishes: setmealDishes.filter((d) => d.dishId),
      ...(editing?.id ? { id: editing.id } : {}),
    }
    if (payload.setmealDishes.length === 0) {
      message.warning(tr('请至少添加一个套餐菜品'))
      return
    }
    if (editing?.id) {
      await updateSetmeal(payload)
      message.success(tr('套餐已更新'))
    } else {
      await addSetmeal(payload)
      message.success(tr('套餐已新增'))
    }
    setOpen(false)
    load()
  }

  const onDelete = async (ids: number[]) => {
    await deleteSetmeal(ids)
    message.success(tr('套餐已删除'))
    load()
  }

  const addDishRow = () => {
    setSetmealDishes([...setmealDishes, { dishId: undefined as unknown as number, copies: 1 }])
  }

  const columns = [
    {
      title: tr('图片'),
      dataIndex: 'image',
      key: 'image',
      width: 90,
      render: (v: string) => (v ? <Image src={v} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} /> : '-'),
    },
    { title: tr('套餐名称'), dataIndex: 'name', key: 'name' },
    { title: tr('分类'), dataIndex: 'categoryName', key: 'categoryName', render: (v: string) => v || '-' },
    { title: tr('价格(元)'), dataIndex: 'price', key: 'price' },
    { title: tr('描述'), dataIndex: 'description', key: 'description', ellipsis: true },
    { title: tr('状态'), dataIndex: 'status', key: 'status', render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? tr('起售') : tr('停售')}</Tag> },
    {
      title: tr('操作'),
      key: 'ops',
      render: (_: unknown, record: SetmealVO) => (
        <Space>
          <Button size="small" onClick={() => openModal(record)}>
            {tr('编辑')}
          </Button>
          <Popconfirm title={tr('确定删除该套餐吗？')} onConfirm={() => onDelete([record.id])}>
            <Button size="small" danger>
              {tr('删除')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={tr('套餐管理')}
      extra={
        <Space>
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
            {tr('新增套餐')}
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
        title={editing?.id ? tr('编辑套餐') : tr('新增套餐')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={tr('保存')}
        destroyOnClose
        width={680}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <Form.Item name="name" label={tr('套餐名称')} rules={[{ required: true, message: tr('请输入套餐名称') }]}>
            <Input placeholder={tr('套餐名称')} />
          </Form.Item>
          <Form.Item name="categoryId" label={tr('套餐分类')} rules={[{ required: true, message: tr('请选择分类') }]}>
            <Select placeholder={tr('选择分类')} options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="price" label={tr('价格(元)')} rules={[{ required: true, message: tr('请输入价格') }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={tr('套餐图片')}>
            <Space>
              {image && <Image src={image} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />}
              <Upload beforeUpload={onUpload} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {tr('上传图片')}
                </Button>
              </Upload>
            </Space>
          </Form.Item>
          <Form.Item name="description" label={tr('描述')}>
            <Input.TextArea rows={2} placeholder={tr('套餐描述（选填）')} />
          </Form.Item>
          <Form.Item name="status" label={tr('起售状态')} valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })} normalize={(v) => (v ? 1 : 0)}>
            <Switch checkedChildren={tr('起售')} unCheckedChildren={tr('停售')} />
          </Form.Item>
          <Form.Item label={tr('套餐菜品')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {setmealDishes.map((sd, idx) => (
                <Space key={idx} style={{ width: '100%' }}>
                  <Select
                    showSearch
                    placeholder={tr('选择菜品')}
                    style={{ width: 260 }}
                    value={sd.dishId}
                    optionFilterProp="label"
                    onChange={(v) => {
                      const next = [...setmealDishes]
                      next[idx] = { ...next[idx], dishId: v }
                      setSetmealDishes(next)
                    }}
                    options={dishes
                      .filter((d) => d.status === 1)
                      .map((d) => ({ label: d.name, value: d.id }))}
                  />
                  <InputNumber
                    min={1}
                    placeholder={tr('份数')}
                    value={sd.copies}
                    onChange={(v) => {
                      const next = [...setmealDishes]
                      next[idx] = { ...next[idx], copies: v ?? 1 }
                      setSetmealDishes(next)
                    }}
                  />
                  <Button danger onClick={() => setSetmealDishes(setmealDishes.filter((_, i) => i !== idx))}>
                    {tr('删除')}
                  </Button>
                </Space>
              ))}
              <Button onClick={addDishRow}>{tr('添加菜品')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
