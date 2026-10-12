import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
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
  addDish,
  addDishStock,
  deleteDish,
  editDishStock,
  getAdminShopStatus,
  getCategoryList,
  getDishPage,
  updateDish,
  uploadFile,
} from '@/api/admin'
import type { Category, DishFlavor, DishVO } from '@/types'
import { tr } from '@/i18n'

export default function Dishes() {
  const [list, setList] = useState<DishVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DishVO | null>(null)
  const [image, setImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [flavors, setFlavors] = useState<DishFlavor[]>([])
  const [form] = Form.useForm<DishVO>()
  // 店铺营业状态（null = 还没取到，按“打烊”处理，与后端一致）
  const [shopOpen, setShopOpen] = useState<boolean | null>(null)
  // 库存弹窗
  const [stockTarget, setStockTarget] = useState<DishVO | null>(null)
  const [stockMode, setStockMode] = useState<'add' | 'edit'>('add')
  const [stockLoading, setStockLoading] = useState(false)
  const [stockForm] = Form.useForm<{ number: number }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDishPage({ page, pageSize, name: name || undefined, categoryId })
      setList(res.records || [])
      setTotal(res.total || 0)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, name, categoryId])

  useEffect(() => {
    load()
  }, [load])

  const loadShopStatus = useCallback(() => {
    getAdminShopStatus()
      .then((s) => setShopOpen(s === 1))
      .catch(() => setShopOpen(null))
  }, [])

  useEffect(() => {
    loadShopStatus()
  }, [loadShopStatus])

  useEffect(() => {
    getCategoryList(1)
      .then((c) => setCategories(c || []))
      .catch(() => {})
  }, [])

  // 营业中 + 在售 => 只能添加库存；打烊或停售 => 可以编辑库存
  const canAddStock = (record: DishVO) => shopOpen === true && record.status === 1

  const openStockModal = (record: DishVO, mode: 'add' | 'edit') => {
    setStockTarget(record)
    setStockMode(mode)
    stockForm.setFieldsValue({ number: mode === 'add' ? 1 : record.number ?? 0 })
  }

  const onStockSubmit = async () => {
    if (!stockTarget?.id) return
    const values = await stockForm.validateFields()
    setStockLoading(true)
    try {
      if (stockMode === 'add') {
        await addDishStock({ id: stockTarget.id, number: values.number })
        message.success(tr('已为「{name}」增加库存 {n} 份', { name: stockTarget.name, n: values.number }))
      } else {
        await editDishStock({ id: stockTarget.id, number: values.number })
        message.success(tr('「{name}」库存已修改为 {n} 份', { name: stockTarget.name, n: values.number }))
      }
      setStockTarget(null)
      load()
    } catch {
      /* 错误提示由请求拦截器统一处理 */
    } finally {
      setStockLoading(false)
    }
  }

  const openModal = (item: DishVO | null) => {
    setEditing(item)
    setImage(item?.image || '')
    setFlavors(item?.flavors?.length ? item.flavors : [])
    form.setFieldsValue(
      item
        ? { name: item.name, categoryId: item.categoryId, price: item.price, description: item.description, status: item.status }
        : { name: '', categoryId: undefined, price: 0, description: '', status: 1, number: 100 },
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
    const { number, ...rest } = values as DishVO
    const payload: DishVO = {
      ...rest,
      image: image || undefined,
      flavors: flavors.filter((f) => f.name && f.value),
      // 库存只在新增时提交；修改库存请走列表里的库存按钮
      ...(editing?.id ? { id: editing.id } : { number }),
    }
    if (editing?.id) {
      await updateDish(payload)
      message.success(tr('菜品已更新'))
    } else {
      await addDish(payload)
      message.success(tr('菜品已新增'))
    }
    setOpen(false)
    load()
  }

  const onDelete = async (ids: number[]) => {
    await deleteDish(ids)
    message.success(tr('菜品已删除'))
    load()
  }

  const columns = [
    {
      title: tr('图片'),
      dataIndex: 'image',
      key: 'image',
      width: 90,
      render: (v: string) => (v ? <Image src={v} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} /> : '-'),
    },
    { title: tr('菜品名称'), dataIndex: 'name', key: 'name' },
    { title: tr('分类'), dataIndex: 'categoryName', key: 'categoryName', render: (v: string) => v || '-' },
    { title: tr('价格(元)'), dataIndex: 'price', key: 'price' },
    { title: tr('描述'), dataIndex: 'description', key: 'description', ellipsis: true },
    { title: tr('状态'), dataIndex: 'status', key: 'status', render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? tr('起售') : tr('停售')}</Tag> },
    {
      title: tr('剩余库存'),
      dataIndex: 'number',
      key: 'number',
      width: 110,
      render: (v: number | undefined) =>
        v === undefined || v === null ? (
          '-'
        ) : (
          <Tag color={v > 0 ? 'blue' : 'red'}>{v > 0 ? tr('剩余 {n} 份', { n: v }) : tr('已售罄')}</Tag>
        ),
    },
    {
      title: tr('操作'),
      key: 'ops',
      render: (_: unknown, record: DishVO) => (
        <Space>
          {canAddStock(record) ? (
            <Button size="small" type="primary" ghost onClick={() => openStockModal(record, 'add')}>
              {tr('添加库存')}
            </Button>
          ) : (
            <Button size="small" onClick={() => openStockModal(record, 'edit')}>
              {tr('编辑库存')}
            </Button>
          )}
          <Button size="small" onClick={() => openModal(record)}>
            {tr('编辑')}
          </Button>
          <Popconfirm title={tr('确定删除该菜品吗？')} onConfirm={() => onDelete([record.id])}>
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
      title={tr('菜品管理')}
      extra={
        <Space>
          <Select
            placeholder={tr('按分类筛选')}
            allowClear
            style={{ width: 140 }}
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v)
              setPage(1)
            }}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
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
            {tr('新增菜品')}
          </Button>
        </Space>
      }
    >
      <Alert
        type={shopOpen === true ? 'info' : 'warning'}
        showIcon
        style={{ marginBottom: 12 }}
        message={
          shopOpen === true
            ? tr('店铺营业中：起售中的菜品只能「添加库存」，不能修改库存数量。')
            : tr('店铺已打烊：可以「编辑库存」，直接把库存改成任意数量。')
        }
        description={
          shopOpen === null
            ? tr('未能读取店铺营业状态（Redis 未启动？），当前按“已打烊”处理。')
            : tr('菜品停售后，无论店铺是否营业，都可以「编辑库存」。')
        }
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{ current: page, pageSize, total, onChange: setPage, showTotal: (t) => tr('共 {n} 条', { n: t }) }}
      />

      <Modal
        title={stockMode === 'add' ? tr('添加库存') : tr('编辑库存')}
        open={!!stockTarget}
        onCancel={() => setStockTarget(null)}
        onOk={onStockSubmit}
        confirmLoading={stockLoading}
        okText={tr('确定')}
        destroyOnClose
      >
        <p>
          {tr('菜品：')}
          <strong>{stockTarget?.name}</strong>
          {tr('，当前库存：')}
          <strong>{stockTarget?.number ?? 0}</strong> {tr('份')}
        </p>
        {stockMode === 'edit' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={tr('编辑库存会直接覆盖当前数量')}
          />
        )}
        <Form form={stockForm} layout="vertical">
          <Form.Item
            name="number"
            label={stockMode === 'add' ? tr('本次增加的份数') : tr('库存数量')}
            rules={[
              { required: true, message: tr('请输入数量') },
              {
                type: 'number',
                min: stockMode === 'add' ? 1 : 0,
                message: stockMode === 'add' ? tr('增加的份数必须大于 0') : tr('库存数量不能小于 0'),
              },
            ]}
          >
            <InputNumber
              min={stockMode === 'add' ? 1 : 0}
              precision={0}
              style={{ width: '100%' }}
              placeholder={stockMode === 'add' ? tr('例如 50') : tr('例如 100')}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editing?.id ? tr('编辑菜品') : tr('新增菜品')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={tr('保存')}
        destroyOnClose
        width={640}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <Form.Item name="name" label={tr('菜品名称')} rules={[{ required: true, message: tr('请输入菜品名称') }]}>
            <Input placeholder={tr('菜品名称')} />
          </Form.Item>
          <Form.Item name="categoryId" label={tr('菜品分类')} rules={[{ required: true, message: tr('请选择分类') }]}>
            <Select
              placeholder={tr('选择分类')}
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="price" label={tr('价格(元)')} rules={[{ required: true, message: tr('请输入价格') }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={tr('菜品图片')}>
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
            <Input.TextArea rows={2} placeholder={tr('菜品描述（选填）')} />
          </Form.Item>
          <Form.Item name="status" label={tr('起售状态')} valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })} normalize={(v) => (v ? 1 : 0)}>
            <Switch checkedChildren={tr('起售')} unCheckedChildren={tr('停售')} />
          </Form.Item>
          {editing?.id ? (
            <Form.Item label={tr('剩余库存')}>
              <span>
                {editing.number ?? 0} {tr('份')}
                <span style={{ color: '#999', marginLeft: 8 }}>
                  {tr('（请用列表中的「添加库存 / 编辑库存」按钮调整）')}
                </span>
              </span>
            </Form.Item>
          ) : (
            <Form.Item
              name="number"
              label={tr('初始库存')}
              rules={[
                { required: true, message: tr('请输入初始库存') },
                { type: 'number', min: 0, message: tr('库存不能小于 0') },
              ]}
              extra={tr('留空不传时后端默认给 100 份')}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={tr('例如 100')} />
            </Form.Item>
          )}
          <Form.Item label={tr('口味')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {flavors.map((f, idx) => (
                <Space key={idx} style={{ width: '100%' }}>
                  <Input
                    placeholder={tr('口味名（如：辣度）')}
                    style={{ width: 140 }}
                    value={f.name}
                    onChange={(e) => {
                      const next = [...flavors]
                      next[idx] = { ...next[idx], name: e.target.value }
                      setFlavors(next)
                    }}
                  />
                  <Input
                    placeholder={tr('选项，逗号分隔（如：不辣,微辣,中辣）')}
                    value={f.value}
                    onChange={(e) => {
                      const next = [...flavors]
                      next[idx] = { ...next[idx], value: e.target.value }
                      setFlavors(next)
                    }}
                  />
                  <Button
                    danger
                    onClick={() => setFlavors(flavors.filter((_, i) => i !== idx))}
                  >
                    {tr('删除')}
                  </Button>
                </Space>
              ))}
              <Button onClick={() => setFlavors([...flavors, { name: '', value: '' }])}>
                {tr('添加口味')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
