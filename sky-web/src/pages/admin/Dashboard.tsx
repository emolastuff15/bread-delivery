import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import {
  CarryOutOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CoffeeOutlined,
  DollarOutlined,
  ProfileOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  getAdminShopStatus,
  getBusinessData,
  getOrderStatistics,
  getOverviewDishes,
  getOverviewOrders,
  getOverviewSetmeals,
  searchOrders,
} from '@/api/admin'
import { ORDER_STATUS } from '@/pages/user/Orders'
import { tr } from '@/i18n'
import type {
  BusinessDataVO,
  DishOverViewVO,
  OrderOverViewVO,
  OrderStatisticsVO,
  OrderVO,
  SetmealOverViewVO,
} from '@/types'

const { Text } = Typography

/** 今日订单列表 Tab：对齐原版，只展示「待接单」「待派送」两类待处理订单 */
const ORDER_TABS = [2, 3]

/** 今天的日期文案，如 2024/6/1 */
function todayText() {
  const d = new Date()
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

/** 时间统一格式化：后端返回 2024-06-01T12:00:00，展示时去掉 T */
function formatTime(v?: string) {
  return v ? v.replace('T', ' ') : '-'
}

export default function Dashboard() {
  const navigate = useNavigate()

  // ---------------- 概览数据 ----------------
  const [biz, setBiz] = useState<BusinessDataVO | null>(null) // 今日数据
  const [overview, setOverview] = useState<OrderOverViewVO | null>(null) // 订单概览（待接单/待派送/已完成/已取消/全部）
  const [dishes, setDishes] = useState<DishOverViewVO | null>(null) // 菜品总览
  const [setmeals, setSetmeals] = useState<SetmealOverViewVO | null>(null) // 套餐总览
  const [stat, setStat] = useState<OrderStatisticsVO | null>(null) // 待处理订单统计（待接单/已接单/派送中）
  const [shopOpen, setShopOpen] = useState<boolean | null>(null) // 营业状态：1 营业 / 0 打烊

  // ---------------- 今日订单列表 ----------------
  const [tab, setTab] = useState<number>(2) // 2 待接单 / 3 待派送
  const [orders, setOrders] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [listLoading, setListLoading] = useState(false)

  /** 待处理订单统计（待接单/已接单/派送中），订单列表刷新后同步刷新，与原版 emit 行为一致 */
  const loadOrderStatistics = useCallback(() => {
    getOrderStatistics()
      .then((s) => setStat(s || null))
      .catch(() => {})
  }, [])

  /** 今日订单列表（status: 2 待接单 / 3 待派送） */
  const loadOrders = useCallback(() => {
    setListLoading(true)
    searchOrders({ page, pageSize, status: tab })
      .then((res) => {
        setOrders(res?.records || [])
        setTotal(res?.total || 0)
      })
      .catch(() => {
        // 单个接口失败不影响整页展示
        setOrders([])
        setTotal(0)
      })
      .finally(() => {
        setListLoading(false)
        loadOrderStatistics()
      })
  }, [page, pageSize, tab, loadOrderStatistics])

  // 首屏概览数据：任一接口失败都只影响自己所属的区块，不会导致白屏
  useEffect(() => {
    getBusinessData()
      .then((d) => setBiz(d || null))
      .catch(() => {})
    getOverviewOrders()
      .then((d) => setOverview(d || null))
      .catch(() => {})
    getOverviewDishes()
      .then((d) => setDishes(d || null))
      .catch(() => {})
    getOverviewSetmeals()
      .then((d) => setSetmeals(d || null))
      .catch(() => {})
    getAdminShopStatus()
      .then((s) => setShopOpen(s === 1))
      .catch(() => {})
    loadOrderStatistics()
  }, [loadOrderStatistics])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  /** 跳转订单管理：orderId 定位某条订单，status 按状态过滤 */
  const goOrders = (params?: { orderId?: number; status?: number }) => {
    const search = new URLSearchParams()
    if (params?.orderId !== undefined) search.set('orderId', String(params.orderId))
    if (params?.status !== undefined) search.set('status', String(params.status))
    const qs = search.toString()
    navigate(`/admin/orders${qs ? `?${qs}` : ''}`)
  }

  /** 订单概览卡片配置（对齐原版 orderview：待接单/待派送/已完成/已取消/全部订单） */
  const overviewItems: {
    title: string
    value?: number
    status?: number
    color: string
    icon: ReactNode
  }[] = [
    { title: tr('待接单'), value: overview?.waitingOrders, status: 2, color: '#1677ff', icon: <ClockCircleOutlined /> },
    { title: tr('待派送'), value: overview?.deliveredOrders, status: 3, color: '#13c2c2', icon: <CarryOutOutlined /> },
    { title: tr('已完成'), value: overview?.completedOrders, status: 5, color: '#52c41a', icon: <CheckCircleOutlined /> },
    { title: tr('已取消'), value: overview?.cancelledOrders, status: 6, color: '#8c8c8c', icon: <CloseCircleOutlined /> },
    { title: tr('全部订单'), value: overview?.allOrders, status: undefined, color: '#722ed1', icon: <ShopOutlined /> },
  ]

  /** 今日订单列表列（对齐原版 orderList，并补充状态列） */
  const columns: TableProps<OrderVO>['columns'] = [
    {
      title: tr('订单号'),
      dataIndex: 'number',
      key: 'number',
      width: 190,
      render: (v: string, record: OrderVO) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={(e) => {
            e.stopPropagation()
            goOrders({ orderId: record.id })
          }}
        >
          {v}
        </Button>
      ),
    },
    {
      title: tr('订单菜品'),
      dataIndex: 'orderDishes',
      key: 'orderDishes',
      ellipsis: true,
      render: (v: string) => (v ? <Tooltip title={v}>{v}</Tooltip> : '-'),
    },
    {
      title: tr('地址'),
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (v: string) => (v ? <Tooltip title={v}>{v}</Tooltip> : '-'),
    },
    {
      title: tr('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: number) => {
        const st = ORDER_STATUS[v] || { text: tr('未知'), color: 'default' }
        return <Tag color={st.color}>{st.text}</Tag>
      },
    },
    {
      title: tr('实收金额(元)'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v: number) => (v === undefined || v === null ? '-' : `¥${v}`),
    },
    {
      title: tr('下单时间'),
      dataIndex: 'orderTime',
      key: 'orderTime',
      width: 170,
      render: formatTime,
    },
    {
      title: tr('预计送达时间'),
      dataIndex: 'estimatedDeliveryTime',
      key: 'estimatedDeliveryTime',
      width: 170,
      render: formatTime,
    },
    {
      title: tr('备注'),
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (v: string) => (v ? <Tooltip title={v}>{v}</Tooltip> : '-'),
    },
    // 原版：待派送列表额外展示餐具数量
    ...(tab === 3
      ? [
          {
            title: tr('餐具数量'),
            dataIndex: 'tablewareNumber',
            key: 'tablewareNumber',
            width: 100,
            align: 'center' as const,
          },
        ]
      : []),
    {
      title: tr('操作'),
      key: 'ops',
      width: 80,
      render: (_: unknown, record: OrderVO) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={(e) => {
            e.stopPropagation()
            goOrders({ orderId: record.id })
          }}
        >
          {tr('查看')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* ==================== 今日数据（原「今日概况」）============
          营业额 / 有效订单 / 订单完成率 / 今日客单价 / 新增用户 ==================== */}
      <Card
        title={
          <Space size={8}>
            <span>{tr('今日数据')}</span>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
              {todayText()}
            </Text>
          </Space>
        }
        extra={
          <Space>
            <Tag color={shopOpen === null ? 'default' : shopOpen ? 'green' : 'red'}>
              {shopOpen === null ? tr('未知') : shopOpen ? tr('营业中') : tr('已打烊')}
            </Tag>
            <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/admin/shop')}>
              {tr('营业状态管理')}
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col flex="1 1 180px">
            <Card size="small">
              <Statistic title={tr('营业额(元)')} value={biz?.turnover ?? '-'} prefix={<DollarOutlined />} />
            </Card>
          </Col>
          <Col flex="1 1 180px">
            <Card size="small">
              <Statistic title={tr('有效订单')} value={biz?.validOrderCount ?? '-'} prefix={<CarryOutOutlined />} />
            </Card>
          </Col>
          <Col flex="1 1 180px">
            <Card size="small">
              <Statistic
                title={tr('订单完成率')}
                value={biz ? `${(biz.orderCompletionRate * 100).toFixed(1)}%` : '-'}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Col>
          <Col flex="1 1 180px">
            <Card size="small">
              <Statistic title={tr('今日客单价(元)')} value={biz?.unitPrice ?? '-'} prefix={<ShopOutlined />} />
            </Card>
          </Col>
          <Col flex="1 1 180px">
            <Card size="small">
              <Statistic title={tr('新增用户')} value={biz?.newUsers ?? '-'} prefix={<UserOutlined />} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ==================== 订单概览（点击可跳订单管理） ==================== */}
      <Card
        title={tr('订单管理')}
        extra={
          <Button type="link" style={{ padding: 0 }} onClick={() => goOrders()}>
            {tr('订单明细')}
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          {overviewItems.map((item) => (
            <Col flex="1 1 160px" key={item.title}>
              <Card
                size="small"
                hoverable
                onClick={() => goOrders({ status: item.status })}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title={item.title}
                  value={item.value ?? '-'}
                  valueStyle={{ color: item.color }}
                  prefix={item.icon}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* ==================== 待处理订单（原有功能，保留） ==================== */}
      <Card title={tr('待处理订单')} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title={tr('待接单')} value={stat?.toBeConfirmed ?? '-'} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title={tr('已接单')} value={stat?.confirmed ?? '-'} prefix={<CarryOutOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title={tr('派送中')} value={stat?.deliveryInProgress ?? '-'} prefix={<ShopOutlined />} />
            </Card>
          </Col>
        </Row>
        <Button
          type="primary"
          style={{ marginTop: 16 }}
          icon={<TeamOutlined />}
          onClick={() => navigate('/admin/orders')}
        >
          {tr('去处理订单')}
        </Button>
      </Card>

      {/* ==================== 菜品总览 / 套餐总览 ==================== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={tr('菜品总览')}
            extra={
              <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/admin/dishes')}>
                {tr('菜品管理')}
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title={tr('已启售')} value={dishes?.sold ?? '-'} prefix={<CoffeeOutlined />} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('已停售')} value={dishes?.discontinued ?? '-'} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={tr('套餐总览')}
            extra={
              <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/admin/setmeals')}>
                {tr('套餐管理')}
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title={tr('已启售')} value={setmeals?.sold ?? '-'} prefix={<ProfileOutlined />} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('已停售')} value={setmeals?.discontinued ?? '-'} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ==================== 今日订单信息 ==================== */}
      <Card title={tr('订单信息')}>
        <Tabs
          activeKey={String(tab)}
          onChange={(key) => {
            setTab(Number(key))
            setPage(1)
          }}
          items={ORDER_TABS.map((s) => ({
            key: String(s),
            label: (
              <span style={{ paddingRight: 12 }}>
                <Badge
                  size="small"
                  offset={[8, -2]}
                  count={s === 2 ? stat?.toBeConfirmed ?? 0 : stat?.confirmed ?? 0}
                >
                  {s === 2 ? tr('待接单') : tr('待派送')}
                </Badge>
              </span>
            ),
          }))}
        />
        <Table<OrderVO>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={orders}
          loading={listLoading}
          scroll={{ x: 1200 }}
          onRow={(record) => ({
            onClick: () => goOrders({ orderId: record.id }),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr('暂无订单')} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 30, 40],
            showTotal: (t) => tr('共 {n} 条', { n: t }),
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>
    </div>
  )
}
