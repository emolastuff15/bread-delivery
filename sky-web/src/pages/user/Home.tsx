import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  List,
  Modal,
  Radio,
  Row,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  MinusOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import {
  addToCart,
  getShopStatus,
  getUserCategoryList,
  getUserDishList,
  getUserSetmealList,
} from '@/api/user'
import { getCartList } from '@/api/user'
import { getTokenType } from '@/api/client'
import { tr } from '@/i18n'
import type { Category, DishVO, Setmeal, ShoppingCart } from '@/types'

/** 菜品口味选择弹窗 */
function FlavorModal({
  dish,
  open,
  onCancel,
  onConfirm,
}: {
  dish: DishVO | null
  open: boolean
  onCancel: () => void
  onConfirm: (flavorText: string) => void
}) {
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && dish) {
      const init: Record<string, string> = {}
      dish.flavors?.forEach((f) => {
        const options = f.value.split(',').filter(Boolean)
        if (options.length) init[f.name] = options[0]
      })
      setSelected(init)
    }
  }, [open, dish])

  const flavorGroups = dish?.flavors?.filter((f) => f.value?.trim()) || []

  return (
    <Modal
      title={tr('选择口味 - {name}', { name: dish?.name })}
      open={open}
      onCancel={onCancel}
      onOk={() => {
        const text = flavorGroups.map((f) => selected[f.name]).filter(Boolean).join(',')
        onConfirm(text)
      }}
      okText={tr('加入购物车')}
      cancelText={tr('取消')}
    >
      {flavorGroups.length === 0 ? (
        <Typography.Text type="secondary">{tr('该菜品无口味可选')}</Typography.Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {flavorGroups.map((f) => (
            <div key={f.name}>
              <Typography.Text strong>{f.name}{tr('：')}</Typography.Text>
              <Radio.Group
                value={selected[f.name]}
                onChange={(e) => setSelected({ ...selected, [f.name]: e.target.value })}
                options={f.value.split(',').filter(Boolean).map((v) => ({ label: v, value: v }))}
              />
            </div>
          ))}
        </Space>
      )}
    </Modal>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeType, setActiveType] = useState<1 | 2>(1)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [dishes, setDishes] = useState<DishVO[]>([])
  const [setmeals, setSetmeals] = useState<Setmeal[]>([])
  const [loading, setLoading] = useState(false)
  const [shopOpen, setShopOpen] = useState(true)
  const [cartCount, setCartCount] = useState(0)
  const [flavorDish, setFlavorDish] = useState<DishVO | null>(null)
  const [flavorModalOpen, setFlavorModalOpen] = useState(false)

  // 分类按 type 分组
  const dishCategories = useMemo(() => categories.filter((c) => c.type === 1), [categories])
  const setmealCategories = useMemo(() => categories.filter((c) => c.type === 2), [categories])

  const loadCart = async () => {
    if (getTokenType() !== 'user') return
    try {
      const list = await getCartList()
      setCartCount(list.reduce((s: number, i: ShoppingCart) => s + (i.number || 0), 0))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    getShopStatus()
      .then((s) => setShopOpen(s === 1))
      .catch(() => setShopOpen(true))
    getUserCategoryList()
      .then((list) => {
        const enabled = list.filter((c) => c.status === 1)
        setCategories(enabled)
        const first = enabled.find((c) => c.type === 1) || enabled[0]
        if (first) {
          setActiveType(first.type === 2 ? 2 : 1)
          setActiveId(first.id)
        }
      })
      .catch(() => {})
    loadCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeId == null) return
    setLoading(true)
    if (activeType === 1) {
      getUserDishList(activeId)
        .then(setDishes)
        .catch(() => setDishes([]))
        .finally(() => setLoading(false))
    } else {
      getUserSetmealList(activeId)
        .then(setSetmeals)
        .catch(() => setSetmeals([]))
        .finally(() => setLoading(false))
    }
  }, [activeId, activeType])

  const switchCategory = (type: 1 | 2, id: number) => {
    setActiveType(type)
    setActiveId(id)
  }

  const doAddToCart = async (payload: { dishId?: number; setmealId?: number; dishFlavor?: string }) => {
    if (!shopOpen) {
      message.warning(tr('店铺已打烊，无法点餐'))
      return
    }
    if (getTokenType() !== 'user') {
      message.info(tr('请先登录'))
      navigate('/login')
      return
    }
    await addToCart(payload)
    message.success(tr('已加入购物车'))
    loadCart()
  }

  const addDish = (dish: DishVO) => {
    const hasFlavor = dish.flavors?.some((f) => f.value?.trim())
    if (hasFlavor) {
      setFlavorDish(dish)
      setFlavorModalOpen(true)
    } else {
      doAddToCart({ dishId: dish.id })
    }
  }

  return (
    <div>
      {/* 顶部：分类类型切换 + 购物车 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button type={activeType === 1 ? 'primary' : 'default'} onClick={() => setActiveType(1)}>
              {tr('菜品')}
            </Button>
            <Button type={activeType === 2 ? 'primary' : 'default'} onClick={() => setActiveType(2)}>
              {tr('套餐')}
            </Button>
            {!shopOpen && <Tag color="red">{tr('店铺已打烊')}</Tag>}
          </Space>
          <Badge count={cartCount} size="small">
            <Button icon={<ShoppingCartOutlined />} onClick={() => navigate('/cart')}>
              {tr('购物车')}
            </Button>
          </Badge>
        </div>
      </Card>

      <Row gutter={16}>
        {/* 左侧分类列表 */}
        <Col span={4}>
          <Card size="small" style={{ position: 'sticky', top: 16 }}>
            <List
              size="small"
              dataSource={activeType === 1 ? dishCategories : setmealCategories}
              locale={{ emptyText: <Empty description={tr('暂无分类')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              renderItem={(item) => (
                <List.Item
                  onClick={() => switchCategory(item.type === 2 ? 2 : 1, item.id)}
                  style={{
                    cursor: 'pointer',
                    background: activeId === item.id ? '#e6f4ff' : undefined,
                    borderRadius: 6,
                    padding: '6px 12px',
                  }}
                >
                  {item.name}
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧菜品/套餐 */}
        <Col span={20}>
          {loading ? (
            <Skeleton active />
          ) : activeType === 1 ? (
            <Row gutter={[16, 16]}>
              {dishes.length === 0 && (
                <Col span={24}>
                  <Empty description={tr('该分类暂无菜品')} />
                </Col>
              )}
              {dishes.map((dish) => (
                <Col key={dish.id} xs={12} sm={8} md={6}>
                  <Card
                    hoverable
                    cover={
                      <img className="dish-card-image" alt={dish.name} src={dish.image} onError={(e) => ((e.target as HTMLImageElement).src = 'https://placehold.co/300x160?text=No+Image')} />
                    }
                  >
                    <Typography.Title level={5} style={{ marginTop: 0 }}>
                      {dish.name}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                      {dish.description || tr('暂无描述')}
                    </Typography.Paragraph>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography.Text strong style={{ color: '#ff6f00', fontSize: 18 }}>
                        ¥{dish.price}
                      </Typography.Text>
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<PlusOutlined />}
                        disabled={!shopOpen}
                        onClick={() => addDish(dish)}
                      />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Row gutter={[16, 16]}>
              {setmeals.length === 0 && (
                <Col span={24}>
                  <Empty description={tr('该分类暂无套餐')} />
                </Col>
              )}
              {setmeals.map((setmeal) => (
                <Col key={setmeal.id} xs={12} sm={8} md={6}>
                  <Card
                    hoverable
                    cover={
                      <img className="setmeal-card-image" alt={setmeal.name} src={setmeal.image} onError={(e) => ((e.target as HTMLImageElement).src = 'https://placehold.co/300x180?text=No+Image')} />
                    }
                  >
                    <Typography.Title level={5} style={{ marginTop: 0 }}>
                      {setmeal.name}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                      {setmeal.description || tr('暂无描述')}
                    </Typography.Paragraph>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography.Text strong style={{ color: '#ff6f00', fontSize: 18 }}>
                        ¥{setmeal.price}
                      </Typography.Text>
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<PlusOutlined />}
                        disabled={!shopOpen}
                        onClick={() => doAddToCart({ setmealId: setmeal.id })}
                      />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      <FlavorModal
        dish={flavorDish}
        open={flavorModalOpen}
        onCancel={() => setFlavorModalOpen(false)}
        onConfirm={(flavorText) => {
          setFlavorModalOpen(false)
          if (flavorDish) {
            doAddToCart({ dishId: flavorDish.id, dishFlavor: flavorText || undefined })
          }
        }}
      />
    </div>
  )
}
