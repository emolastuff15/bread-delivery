import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Switch,
  Tag,
  message,
} from 'antd'
import {
  addAddress,
  deleteAddress,
  getAddressList,
  setDefaultAddress,
  updateAddress,
} from '@/api/user'
import { LockOutlined } from '@ant-design/icons'
import PlacePicker, { type PlaceSelection } from '@/components/PlacePicker'
import type { AddressBook } from '@/types'
import { tr } from '@/i18n'

const emptyForm: AddressBook = {
  consignee: '',
  phone: '',
  sex: '1',
  provinceName: '',
  cityName: '',
  districtName: '',
  detail: '',
  label: '',
  isDefault: 0,
}

export default function AddressBook() {
  const [list, setList] = useState<AddressBook[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AddressBook | null>(null)
  const [form] = Form.useForm<AddressBook>()
  /** 选中的地点 Place ID：拿到它才允许保存（新增必填） */
  const [placeId, setPlaceId] = useState<string | null>(null)
  /** 详细地址是否已锁定（由地图选择生成后不可修改） */
  const [detailLocked, setDetailLocked] = useState(false)

  const load = useCallback(async () => {
    try {
      setList((await getAddressList()) || [])
    } catch {
      setList([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openModal = (item: AddressBook | null) => {
    setEditing(item)
    setPlaceId(item?.placeId ?? null)
    // 已有 Place ID（说明详细地址由地图生成）→ 保持只读
    setDetailLocked(!!item?.placeId)
    form.setFieldsValue(item || emptyForm)
    setOpen(true)
  }

  /** 选中地点（起点）后拿到 Place ID：有了它才允许保存；详细地址同时被锁定 */
  const onPlaceChange = (selection: PlaceSelection) => {
    setPlaceId(selection.placeId)
    if (selection.placeId) {
      setDetailLocked(true)
    }
    if (selection.placeId || selection.text) {
      form.setFieldsValue({
        detail: selection.text || form.getFieldValue('detail'),
        placeId: selection.placeId,
      })
    }
  }

  const onSubmit = async () => {
    if (!placeId) {
      return
    }
    const values = await form.validateFields()
    const payload: AddressBook = { ...(editing || {}), ...values, placeId }
    if (editing?.id) {
      await updateAddress({ ...payload, id: editing.id })
      message.success(tr('地址已更新'))
    } else {
      await addAddress(payload)
      message.success(tr('地址已添加'))
    }
    setOpen(false)
    load()
  }

  const onDelete = async (id: number) => {
    await deleteAddress(id)
    message.success(tr('地址已删除'))
    load()
  }

  const onSetDefault = async (id: number) => {
    await setDefaultAddress({ id })
    message.success(tr('已设为默认地址'))
    load()
  }

  return (
    <Card
      title={tr('地址簿')}
      extra={
        <Button type="primary" onClick={() => openModal(null)}>
          {tr('新增地址')}
        </Button>
      }
    >
      <List
        dataSource={list}
        locale={{ emptyText: tr('暂无地址') }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Space key="ops">
                {item.isDefault !== 1 && (
                  <Button size="small" onClick={() => onSetDefault(item.id!)}>
                    {tr('设为默认')}
                  </Button>
                )}
                <Button size="small" onClick={() => openModal(item)}>
                  {tr('编辑')}
                </Button>
                <Popconfirm title={tr('确定删除该地址吗？')} onConfirm={() => onDelete(item.id!)}>
                  <Button size="small" danger>
                    {tr('删除')}
                  </Button>
                </Popconfirm>
              </Space>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span>
                    {item.consignee} {item.phone}
                  </span>
                  {item.label && <Tag color="blue">{item.label}</Tag>}
                  {item.isDefault === 1 && <Tag color="green">{tr('默认')}</Tag>}
                </Space>
              }
              description={[
                item.provinceName,
                item.cityName,
                item.districtName,
                item.detail,
                item.roomDetail,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </List.Item>
        )}
      />

      <Modal
        title={editing?.id ? tr('编辑地址') : tr('新增地址')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={tr('保存')}
        /** 拿到 Place ID 才允许保存 */
        okButtonProps={{ disabled: !placeId }}
        width={960}
        destroyOnClose
      >
        {/* 地点选择：输入起点并选中 → 得到 Place ID */}
        <PlacePicker onPlaceChange={onPlaceChange} />

        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} style={{ marginTop: 16 }}>
          <Form.Item name="consignee" label={tr('收货人')} rules={[{ required: true, message: tr('请输入收货人') }]}>
            <Input placeholder={tr('收货人姓名')} />
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
          <Form.Item name="provinceName" label={tr('省份')}>
            <Input placeholder={tr('如：广东省')} />
          </Form.Item>
          <Form.Item name="cityName" label={tr('城市')}>
            <Input placeholder={tr('如：广州市')} />
          </Form.Item>
          <Form.Item name="districtName" label={tr('区县')}>
            <Input placeholder={tr('如：天河区')} />
          </Form.Item>
          <Form.Item name="detail" label={tr('详细地址')} rules={[{ required: true, message: tr('请先在地图上选择地点') }]}>
            <Input
              disabled={true}
              placeholder=" "
              suffix={detailLocked ? <LockOutlined style={{ color: '#bfbfbf' }} /> : undefined}
            />
          </Form.Item>
          <Form.Item name="roomDetail" label={tr('房间地址')}>
            <Input placeholder={tr('门牌号 / 房间号')} maxLength={64} />
          </Form.Item>
          <Form.Item name="placeId" label="Place ID">
            <Input placeholder={tr('在地图上选择地点后自动获取')} disabled />
          </Form.Item>
          <Form.Item name="label" label={tr('标签')}>
            <Input placeholder={tr('家 / 公司 / 学校')} />
          </Form.Item>
          <Form.Item name="isDefault" label={tr('设为默认')} valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })} normalize={(v) => (v ? 1 : 0)}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
