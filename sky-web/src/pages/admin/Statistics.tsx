/**
 * 数据统计（移植自原版 Vue 管理端 src/views/statistics/index.vue 及其 components/*）
 *
 * 原版结构对应关系：
 *   titleIndex.vue   -> 顶部"昨日/近7日/近30日/本周/本月"时间tab + 数据导出按钮
 *   overview.vue     -> 数据概览（营业额/有效订单/订单完成率/平均客单价/新增用户）
 *   turnoverStatistics.vue -> 营业额统计折线图
 *   orderStatistics.vue    -> 订单统计（完成率 + 总数/有效订单折线图）
 *   top10.vue              -> 销量排名 TOP10 横向柱状图
 *   userStatistics.vue     -> 用户统计（后端未提供报表接口，故未移植）
 *
 * 注意：后端报表接口返回的列表字段是"逗号分隔字符串"（如 "2022-10-01,2022-10-02"），
 *      画图前必须 split(',')，本文件统一由 splitList / toNumberList 处理。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, DatePicker, Modal, Radio, Row, Space, Statistic, Typography, message } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  exportReport,
  getBusinessData,
  getOrdersReport,
  getOverviewDishes,
  getOverviewOrders,
  getOverviewSetmeals,
  getTop10Report,
  getTurnoverReport,
} from '@/api/admin'
import type {
  BusinessDataVO,
  DishOverViewVO,
  OrderOverViewVO,
  OrderReportVO,
  SalesTop10ReportVO,
  SetmealOverViewVO,
  TurnoverReportVO,
} from '@/types'
import { tr } from '@/i18n'

/** 时间 tab（对应原版 titleIndex.vue 的 tabsParam） */
type PresetKey = 'yesterday' | 'last7' | 'last30' | 'week' | 'month'

const PRESET_OPTIONS: { label: string; value: PresetKey }[] = [
  { label: tr('昨日'), value: 'yesterday' },
  { label: tr('近7日'), value: 'last7' },
  { label: tr('近30日'), value: 'last30' },
  { label: tr('本周'), value: 'week' },
  { label: tr('本月'), value: 'month' },
]

/**
 * 本周（周一 ~ 周日）。dayjs 默认以周日为一周的开始，这里按原版 pastWeek 的
 * "周一到周日"语义手动计算，避免依赖 isoWeek 插件。
 */
function weekRange(base: Dayjs): [Dayjs, Dayjs] {
  const dow = (base.day() + 6) % 7 // 0=周一 ... 6=周日
  return [base.subtract(dow, 'day').startOf('day'), base.add(6 - dow, 'day').endOf('day')]
}

/**
 * 各时间 tab 对应的起止日期（对应原版 utils/formValidate.ts 的
 * get1stAndToday / past7Day / past30Day / pastWeek / pastMonth）。
 * 用 dayjs 实现，格式统一 YYYY-MM-DD。
 */
function presetRange(key: PresetKey): [Dayjs, Dayjs] {
  const today = dayjs()
  switch (key) {
    case 'yesterday':
      // 昨日
      return [today.subtract(1, 'day'), today.subtract(1, 'day')]
    case 'last7':
      // 近7日：今天往前 7 天 ~ 昨天（原版 past7Day 语义）
      return [today.subtract(7, 'day'), today.subtract(1, 'day')]
    case 'last30':
      // 近30日
      return [today.subtract(30, 'day'), today.subtract(1, 'day')]
    case 'week':
      // 本周：周一 ~ 周日
      return weekRange(today)
    case 'month':
    default:
      // 本月
      return [today.startOf('month'), today.endOf('month')]
  }
}

/** 报表的逗号分隔字符串 -> 字符串数组（空值安全，避免 echarts 收到 undefined） */
function splitList(s?: string | null): string[] {
  if (!s) return []
  return String(s)
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '')
}

/** 报表的逗号分隔字符串 -> 数字数组 */
function toNumberList(s?: string | null): number[] {
  return splitList(s).map((v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  })
}

/** 空数据默认值：保证 echarts 永远拿到合法结构，不会因为 undefined 报错 */
const EMPTY_TURNOVER: TurnoverReportVO = { dateList: '', turnoverList: '' }
const EMPTY_ORDER: OrderReportVO = {
  dateList: '',
  orderCountList: '',
  validOrderCountList: '',
  totalOrderCount: 0,
  validOrderCount: 0,
  orderCompletionRate: 0,
}
const EMPTY_TOP10: SalesTop10ReportVO = { nameList: '', numberList: '' }

/** 金额渐变（替代 echarts.graphic.LinearGradient，避免额外引入 echarts 命名空间） */
const GRADIENT_ORANGE = {
  type: 'linear' as const,
  x: 1,
  y: 0,
  x2: 0,
  y2: 0,
  colorStops: [
    { offset: 0, color: '#FFBD00' },
    { offset: 1, color: '#FFD000' },
  ],
}

export default function Statistics() {
  // 默认"近7日"（原版 created 时调用 getTitleNum(2) 即近7日）
  const [preset, setPreset] = useState<PresetKey>('last7')
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => presetRange('last7'))

  const [turnover, setTurnover] = useState<TurnoverReportVO>(EMPTY_TURNOVER)
  const [order, setOrder] = useState<OrderReportVO>(EMPTY_ORDER)
  const [top10, setTop10] = useState<SalesTop10ReportVO>(EMPTY_TOP10)

  // 数据概览 / 工作台总览（工作台接口，后端真实存在）
  const [biz, setBiz] = useState<BusinessDataVO | null>(null)
  const [orderOverview, setOrderOverview] = useState<OrderOverViewVO | null>(null)
  const [dishOverview, setDishOverview] = useState<DishOverViewVO | null>(null)
  const [setmealOverview, setSetmealOverview] = useState<SetmealOverViewVO | null>(null)

  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  /** 切换时间 tab */
  const handlePresetChange = (key: PresetKey) => {
    setPreset(key)
    setRange(presetRange(key))
  }

  /** 手选日期区间（antd v5 的 RangePicker value 是 dayjs 对象） */
  const handleRangeChange = (dates: unknown) => {
    const d = dates as [Dayjs | null, Dayjs | null] | null
    if (d && d[0] && d[1]) {
      setRange([d[0], d[1]])
      setPreset(null as unknown as PresetKey) // 手动选择后取消 tab 高亮
    }
  }

  /** 拉取区间内的三张报表：各自兜底，任一失败不影响其它图表 */
  const loadReports = useCallback(async (begin: string, end: string) => {
    setLoading(true)
    await Promise.all([
      getTurnoverReport(begin, end)
        .then((res) => setTurnover(res || EMPTY_TURNOVER))
        .catch(() => setTurnover(EMPTY_TURNOVER)),
      getOrdersReport(begin, end)
        .then((res) => setOrder(res || EMPTY_ORDER))
        .catch(() => setOrder(EMPTY_ORDER)),
      getTop10Report(begin, end)
        .then((res) => setTop10(res || EMPTY_TOP10))
        .catch(() => setTop10(EMPTY_TOP10)),
    ])
    setLoading(false)
  }, [])

  // 日期区间变化即重新拉取报表
  useEffect(() => {
    const [begin, end] = range
    void loadReports(begin.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'))
  }, [range, loadReports])

  // 数据概览只拉一次（工作台接口，无日期参数）
  useEffect(() => {
    getBusinessData().then(setBiz).catch(() => setBiz(null))
    getOverviewOrders().then(setOrderOverview).catch(() => setOrderOverview(null))
    getOverviewDishes().then(setDishOverview).catch(() => setDishOverview(null))
    getOverviewSetmeals().then(setSetmealOverview).catch(() => setSetmealOverview(null))
  }, [])

  /** 导出运营数据报表（Excel）。exportReport 返回 Blob，前端触发下载 */
  const doExport = async () => {
    try {
      setExporting(true)
      const blob = await exportReport()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = tr('运营数据报表.xlsx')
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      message.success(tr('报表导出成功'))
    } catch (e) {
      message.error(tr('报表导出失败：') + (e as Error)?.message)
    } finally {
      setExporting(false)
    }
  }

  // 原版 titleIndex.vue 导出前有二次确认弹窗
  const handleExport = () => {
    Modal.confirm({
      title: tr('提示'),
      content: tr('是否确认导出最近30天运营数据?'),
      okText: tr('确定'),
      cancelText: tr('取消'),
      onOk: () => doExport(),
    })
  }

  // ---------------- 营业额统计（turnoverStatistics.vue） ----------------
  const turnoverOption = useMemo(() => {
    const dateList = splitList(turnover?.dateList)
    const turnoverList = toNumberList(turnover?.turnoverList)
    return {
      tooltip: { trigger: 'axis' },
      grid: { top: '8%', left: 10, right: 50, bottom: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: { color: '#666', fontSize: 12 },
        axisLine: { lineStyle: { color: '#E5E4E4', width: 1 } },
        data: dateList,
      },
      yAxis: [{ type: 'value', min: 0, axisLabel: { color: '#666', fontSize: 12 } }],
      series: [
        {
          name: tr('营业额'),
          type: 'line',
          smooth: false, // 不平滑曲线
          showSymbol: false, // 不显示鼠标上移的圆点
          symbolSize: 10,
          itemStyle: { color: '#F29C1B', borderColor: '#FFC100', borderWidth: 0 },
          lineStyle: { color: '#FFD000' },
          emphasis: { itemStyle: { color: '#fff', borderWidth: 5, borderColor: '#FFC100' } },
          data: turnoverList,
        },
      ],
    }
  }, [turnover])

  // ---------------- 订单统计（orderStatistics.vue） ----------------
  const orderOption = useMemo(() => {
    const dateList = splitList(order?.dateList)
    const orderCountList = toNumberList(order?.orderCountList)
    const validOrderCountList = toNumberList(order?.validOrderCountList)
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderRadius: 2,
        textStyle: { color: '#333', fontSize: 12, fontWeight: 300 },
      },
      legend: { top: 'bottom', data: [tr('订单总数'), tr('有效订单')] },
      grid: { top: '8%', left: 20, right: 50, bottom: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: { color: '#666', fontSize: 12 },
        axisLine: { lineStyle: { color: '#E5E4E4', width: 1 } },
        data: dateList,
      },
      // 原版固定 interval: 50，数据量小时会把折线挤到贴底，这里交给 echarts 自动分档
      yAxis: [{ type: 'value', min: 0, axisLabel: { color: '#666', fontSize: 12 } }],
      series: [
        {
          name: tr('订单总数'),
          type: 'line',
          smooth: false,
          showSymbol: false,
          symbolSize: 10,
          lineStyle: { color: '#FFD000' },
          itemStyle: { color: '#FFD000' },
          emphasis: { itemStyle: { color: '#fff', borderWidth: 5, borderColor: '#FFC100' } },
          data: orderCountList,
        },
        {
          name: tr('有效订单'),
          type: 'line',
          smooth: false,
          showSymbol: false,
          symbolSize: 10,
          lineStyle: { color: '#FD7F7F' },
          itemStyle: { color: '#FD7F7F' },
          emphasis: { itemStyle: { color: '#fff', borderWidth: 5, borderColor: '#FD7F7F' } },
          data: validOrderCountList,
        },
      ],
    }
  }, [order])

  // ---------------- 销量排名 TOP10（top10.vue） ----------------
  const top10Option = useMemo(() => {
    // 原版对两个数组都做了 reverse()，让销量最高的排在 y 轴最上方
    const nameList = splitList(top10?.nameList).reverse()
    const numberList = toNumberList(top10?.numberList).reverse()
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#fff',
        borderRadius: 2,
        textStyle: { color: '#333', fontSize: 12, fontWeight: 300 },
      },
      grid: { top: 10, left: 0, right: 30, bottom: 0, containLabel: true },
      xAxis: { show: false }, // 原版隐藏 x 轴
      yAxis: {
        type: 'category',
        axisLine: { show: false },
        axisTick: { show: false, alignWithLabel: true },
        axisLabel: { color: '#666', fontSize: 12 },
        data: nameList,
      },
      series: [
        {
          name: tr('销量'),
          data: numberList,
          type: 'bar',
          showBackground: true,
          backgroundStyle: { color: '#F3F4F7' },
          barWidth: 20,
          barGap: '80%',
          barCategoryGap: '80%',
          itemStyle: {
            borderRadius: [0, 10, 10, 0], // 圆角
            color: GRADIENT_ORANGE,
          },
          emphasis: { itemStyle: { borderRadius: [0, 10, 10, 0] } },
          label: { show: true, position: 'right', color: '#333', formatter: '{c}' },
        },
      ],
    }
  }, [top10])

  const completionRate = order?.orderCompletionRate ?? 0

  return (
    <div>
      {/* 标题区：时间 tab + 已选时间 + 数据导出（原版 titleIndex.vue） */}
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" justify="space-between" gutter={16}>
          <Col>
            <Radio.Group
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
              optionType="button"
              buttonStyle="solid"
              options={PRESET_OPTIONS}
            />
          </Col>
          <Col>
            <Space wrap>
              <Typography.Text type="secondary">{tr('已选时间：')}</Typography.Text>
              <DatePicker.RangePicker
                value={range}
                allowClear={false}
                onChange={handleRangeChange}
                format="YYYY-MM-DD"
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  const [b, e] = range
                  void loadReports(b.format('YYYY-MM-DD'), e.format('YYYY-MM-DD'))
                }}
              >
                {tr('查询')}
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
                {tr('数据导出')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 数据概览（原版 overview.vue），数据来自工作台接口 */}
      <Card title={tr('数据概览')} style={{ marginBottom: 16 }} loading={loading && !biz}>
        <Row gutter={16}>
          <Col span={5}>
            <Statistic title={tr('营业额(元)')} value={biz?.turnover ?? '-'} precision={2} />
          </Col>
          <Col span={5}>
            <Statistic title={tr('有效订单')} value={biz?.validOrderCount ?? '-'} />
          </Col>
          <Col span={5}>
            <Statistic
              title={tr('订单完成率')}
              value={biz ? (biz.orderCompletionRate * 100).toFixed(2) : '-'}
              suffix="%"
            />
          </Col>
          <Col span={5}>
            <Statistic title={tr('平均客单价(元)')} value={biz?.unitPrice ?? '-'} precision={2} />
          </Col>
          <Col span={4}>
            <Statistic title={tr('新增用户')} value={biz?.newUsers ?? '-'} />
          </Col>
        </Row>
      </Card>

      {/* 工作台总览：订单/菜品/套餐（后端真实接口，无日期参数） */}
      <Card title={tr('经营总览')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Typography.Text strong>{tr('订单总览')}</Typography.Text>
            <Row gutter={8} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Statistic title={tr('待接单')} value={orderOverview?.waitingOrders ?? '-'} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('待派送')} value={orderOverview?.deliveredOrders ?? '-'} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('已完成')} value={orderOverview?.completedOrders ?? '-'} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('已取消')} value={orderOverview?.cancelledOrders ?? '-'} />
              </Col>
            </Row>
          </Col>
          <Col span={8}>
            <Typography.Text strong>{tr('菜品总览')}</Typography.Text>
            <Row gutter={8} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Statistic title={tr('已启售')} value={dishOverview?.sold ?? '-'} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('已停售')} value={dishOverview?.discontinued ?? '-'} />
              </Col>
            </Row>
          </Col>
          <Col span={8}>
            <Typography.Text strong>{tr('套餐总览')}</Typography.Text>
            <Row gutter={8} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Statistic title={tr('已启售')} value={setmealOverview?.sold ?? '-'} />
              </Col>
              <Col span={12}>
                <Statistic title={tr('已停售')} value={setmealOverview?.discontinued ?? '-'} />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* 营业额统计 */}
        <Col span={12}>
          <Card title={tr('营业额统计')} loading={loading}>
            <ReactECharts
              option={turnoverOption}
              style={{ height: 320, width: '100%' }}
              notMerge
              lazyUpdate
            />
          </Card>
        </Col>

        {/* 订单统计 */}
        <Col span={12}>
          <Card title={tr('订单统计')} loading={loading}>
            <Space size="large" style={{ marginBottom: 8 }}>
              <Statistic title={tr('订单完成率')} value={(completionRate * 100).toFixed(1)} suffix="%" />
              <Statistic title={tr('有效订单')} value={order?.validOrderCount ?? 0} />
              <Statistic title={tr('订单总数')} value={order?.totalOrderCount ?? 0} />
            </Space>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {tr('订单完成率 = 有效订单')} {order?.validOrderCount ?? 0} {tr('/ 订单总数')}{' '}
              {order?.totalOrderCount ?? 0}
            </Typography.Paragraph>
            <ReactECharts option={orderOption} style={{ height: 300, width: '100%' }} notMerge lazyUpdate />
          </Card>
        </Col>
      </Row>

      {/* 销量排名 TOP10 */}
      <Card title={tr('销量排名 TOP10')} loading={loading}>
        <ReactECharts option={top10Option} style={{ height: 380, width: '100%' }} notMerge lazyUpdate />
      </Card>
    </div>
  )
}
