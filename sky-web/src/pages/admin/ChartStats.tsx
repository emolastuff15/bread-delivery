/**
 * 图表统计（移植自原版 Vue 管理端 src/views/chart/index.vue）
 *
 * 数据来源现状（2026-09）：
 *   ✅ 已实现：categoryCollect（分类饼图-当日）、dateCategoryCollect（分类饼图-区间）、
 *             currentDishRank（排行-当日）、dishRankForDate（排行-区间）、
 *             hourCollect（趋势-按小时）、dayAmountCollect（趋势-按天）、
 *             amountCollect / dayCollect（顶部三个数据框）
 *   ❌ 已删除：店内收款构成（payTypeCollect / datePayTypeCollect）、
 *             优惠指标（privilegeCollect / privilegeByDate）
 *             —— 系统里没有优惠/折扣业务，也没有多种收款方式，没有数据来源，直接去掉
 *
 * 所有请求都做了容错：.catch 兜住 + 图表使用空数据默认值，接口不可用时不白屏。
 *
 * 原版结构对应关系：
 *   顶部 HeadLable 的 日报/周报/月报 切换 + 统计时间 + 前/后一天(周/月) + 查看今日数据
 *   顶部三个数据框：实收金额 / 未收金额 / 就餐人数（amountCollect / dayCollect）
 *   时段销售趋势（Basic.vue 柱状图，按金额/按单数 typeA）
 *   菜品分类占比（BarChart.vue 饼图，按金额/按销量 typeB）
 *   菜单销售排行（MixedChart.vue 柱状图）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, DatePicker, Radio, Row, Space, Statistic, Typography, message } from 'antd'
import ReactECharts from 'echarts-for-react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  getChartsDataes,
  getDataes,
  getDayDataes,
  getDayRanking,
  getSalesRanking,
  getTimeQuantumDataes,
  getTimeQuantumDishes,
  getTimeQuantumType,
} from '@/api/legacy'
import { tr } from '@/i18n'

/** 报表类型（原版为 day/week/mouth，这里把 mouth 更正为 month，行为一致） */
type Act = 'day' | 'week' | 'month'

/** 折线/柱状图数据（原版 Basic.vue / MixedChart.vue 的 chartData 结构） */
interface XYData {
  xData: string[]
  yData: Array<number | string>
}

/** 饼图数据（原版 BarChart.vue 的 chartData 结构） */
interface PieItem {
  name: string
  value: number
  percent?: number
}
interface PieData {
  legendData: string[]
  seriesData: PieItem[]
  selected: Record<string, boolean>
}

/** 顶部三个数据框 */
interface TopData {
  payTotal: number
  noPayTotal: number
  totalPerson: number
}

// ---------------- 空数据默认值（后端 404 时展示空图，避免 echarts 报错） ----------------
const EMPTY_XY: XYData = { xData: [], yData: [] }
const EMPTY_PIE: PieData = { legendData: [], seriesData: [], selected: {} }
const EMPTY_TOP: TopData = { payTotal: 0, noPayTotal: 0, totalPerson: 0 }

/** 饼图配色（原版 BarChart.vue 的 colorList） */
const PIE_COLORS = ['#389BFF', '#FFC200', '#52C41A', '#08979C', '#597EF7', '#B37FEB', '#FF7875', '#5CDBD3', '#FFC53D']

/**
 * 兼容取值：client 的 request() 已经把 Result 外壳剥掉（返回 Result.data），
 * 这里再兜一层 {code, data} 结构，避免不同接口包装方式导致取不到数据。
 */
function pick(res: any): any {
  if (res && typeof res === 'object' && 'code' in res && 'data' in res) return res.data
  return res
}

/** 把后端返回的饼图列表转成 pie 结构，并按需把"分"转成"元" */
function toPieData(list: any, divideAmount: boolean): PieData {
  const arr: PieItem[] = Array.isArray(list) ? list : []
  const seriesData = arr.map((n) => ({
    name: n?.name ?? '',
    value: divideAmount ? Number(n?.value || 0) / 100 : Number(n?.value || 0),
    percent: n?.percent,
  }))
  const legendData: string[] = []
  const selected: Record<string, boolean> = {}
  seriesData.forEach((item) => {
    legendData.push(item.name)
    selected[item.name] = true
  })
  return { legendData, seriesData, selected }
}

/** 把后端返回的 {xaxis, series} 转成折线/柱状图结构，并按需把"分"转成"元" */
function toXYData(data: any, divideAmount: boolean): XYData {
  const series: number[] = Array.isArray(data?.series) ? data.series : []
  return {
    xData: Array.isArray(data?.xaxis) ? data.xaxis : [],
    yData: divideAmount ? series.map((n) => Number(n || 0) / 100) : series,
  }
}

/**
 * 本周（周一 ~ 周日）。dayjs 默认以周日为一周的开始，这里按原版
 * moment().startOf('week').add(1,'day') 的"周一到周日"语义手动计算，
 * 避免依赖 isoWeek 插件。
 */
function weekRange(base: Dayjs): [Dayjs, Dayjs] {
  const dow = (base.day() + 6) % 7 // 0=周一 ... 6=周日
  return [base.subtract(dow, 'day').startOf('day'), base.add(6 - dow, 'day').endOf('day')]
}

// ---------------- 内部图表组件（对应原版 components/Charts/*） ----------------

/** 柱状图（原版 Basic.vue / MixedChart.vue） */
function TrendBarChart({ title, data, colorFrom, colorTo }: { title: string; data: XYData; colorFrom: string; colorTo: string }) {
  const option = useMemo(
    () => ({
      backgroundColor: '#fff',
      title: { text: title, top: 0, textStyle: { color: '#000', fontSize: 18 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: '5%', borderWidth: 0, top: 60, bottom: 34 },
      xAxis: [
        {
          type: 'category',
          axisLine: { lineStyle: { color: '#90979c' } },
          splitLine: { show: false },
          axisTick: { show: true },
          splitArea: { show: false },
          // x 轴标签过多时倾斜（原版 Basic.vue 的逻辑）
          axisLabel: { interval: 0, rotate: (data?.xData?.length || 0) > 10 ? -25 : 0 },
          data: data?.xData || [],
        },
      ],
      yAxis: [
        {
          type: 'value',
          splitLine: { show: false },
          axisLine: { lineStyle: { color: '#90979c' } },
          axisTick: { show: false },
          axisLabel: { interval: 0 },
          splitArea: { show: false },
        },
      ],
      series: [
        {
          name: tr('店内'),
          type: 'bar',
          barMaxWidth: 15,
          barGap: '10%',
          itemStyle: {
            borderRadius: [10, 10, 0, 0], // 顶部圆角
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colorFrom },
                { offset: 1, color: colorTo },
              ],
            },
          },
          label: {
            show: true,
            color: '#fff',
            position: 'insideTop',
            // 原版：值大于 0 才显示标签
            formatter: (p: any) => (p.value > 0 ? p.value : ''),
          },
          data: data?.yData || [],
        },
      ],
    }),
    [title, data, colorFrom, colorTo],
  )
  return <ReactECharts option={option} style={{ height: 300, width: '100%' }} notMerge lazyUpdate />
}

/** 饼图（原版 BarChart.vue，用于菜品分类占比 / 店内收款构成） */
function CategoryPieChart({ title, data }: { title: string; data: PieData }) {
  const option = useMemo(
    () => ({
      title: { text: title, left: 'left' },
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        left: 0,
        top: 50,
        bottom: 20,
        data: data?.legendData || [],
        selected: data?.selected || {},
      },
      series: [
        {
          name: tr('占比'),
          type: 'pie',
          radius: '65%',
          left: 80,
          center: ['40%', '50%'],
          data: data?.seriesData || [],
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
          itemStyle: {
            color: (params: any) => PIE_COLORS[params.dataIndex % PIE_COLORS.length],
          },
        },
      ],
    }),
    [title, data],
  )
  return <ReactECharts option={option} style={{ height: 300, width: '100%' }} notMerge lazyUpdate />
}

export default function ChartStats() {
  const today = dayjs().format('YYYY-MM-DD')

  const [act, setAct] = useState<Act>('day')
  const [dataTime, setDataTime] = useState<string>(today)
  const [stateTime, setStateTime] = useState<string>(today)
  const [endTime, setEndTime] = useState<string>(today)

  const [typeA, setTypeA] = useState<number>(1) // 时段销售趋势：1金额 2数量
  const [typeB, setTypeB] = useState<number>(1) // 菜品分类占比：1金额 2销量

  const [chartA, setChartA] = useState<XYData>(EMPTY_XY) // 销售趋势
  const [chartB, setChartB] = useState<XYData>(EMPTY_XY) // 销售排行
  const [chartC, setChartC] = useState<PieData>(EMPTY_PIE) // 分类占比

  const [topData, setTopData] = useState<TopData>(EMPTY_TOP)

  // ---------------- 区间（时间段）数据：对应原版 getTimeWuantumData() ----------------

  /** 销售趋势 - 时间段（getTimeQuantumDataes） */
  const fetchTrendByRange = useCallback((tA: number, start: string, end: string) => {
    getTimeQuantumDataes(tA, start, end)
      .then((res: any) => setChartA(toXYData(pick(res), tA === 1)))
      .catch(() => setChartA(EMPTY_XY)) // 后端未实现，静默兜底为空图
  }, [])

  /** 菜品分类占比 - 时间段（getTimeQuantumType） */
  const fetchCategoryByRange = useCallback((tB: number, start: string, end: string) => {
    getTimeQuantumType(tB, start, end)
      .then((res: any) => setChartC(toPieData(pick(res), tB === 1)))
      .catch(() => setChartC(EMPTY_PIE))
  }, [])

  /** 菜品销售排行 - 时间段（getTimeQuantumDishes，原版固定除以 100） */
  const fetchDishRankByRange = useCallback((start: string, end: string) => {
    getTimeQuantumDishes(start, end)
      .then((res: any) => setChartB(toXYData(pick(res), true)))
      .catch(() => setChartB(EMPTY_XY))
  }, [])

  /**
   * 顶部数据（营收概况）：优先 getChartsDataes（区间营收概况）；
   * 日报场景失败时回退到 getDataes（当日销售数据），都失败则显示 0。
   */
  const fetchTopData = useCallback((start: string, end: string, isDay: boolean) => {
    const apply = (raw: any) => {
      const d = pick(raw) || {}
      setTopData({
        payTotal: Number(d.payTotal) || 0,
        noPayTotal: Number(d.noPayTotal) || 0,
        totalPerson: Number(d.totalPerson) || 0,
      })
    }
    getChartsDataes(start, end)
      .then(apply)
      .catch(() => {
        if (!isDay) {
          setTopData(EMPTY_TOP)
          return
        }
        void getDataes(start)
          .then(apply)
          .catch(() => setTopData(EMPTY_TOP))
      })
  }, [])

  /** 时间段接口统一调用（对应原版 getTimeWuantumData） */
  const loadRange = useCallback(
    (start: string, end: string, tA: number, tB: number, isDay = false) => {
      fetchTrendByRange(tA, start, end)
      fetchCategoryByRange(tB, start, end)
      fetchDishRankByRange(start, end)
      fetchTopData(start, end, isDay)
    },
    [fetchTrendByRange, fetchCategoryByRange, fetchDishRankByRange, fetchTopData],
  )

  // ---------------- 当日数据：对应原版 getData() ----------------

  /** 时段销售趋势 - 当日（getDayDataes） */
  const fetchTrendByDay = useCallback((tA: number, date: string) => {
    getDayDataes(tA, date)
      .then((res: any) => setChartA(toXYData(pick(res), tA === 1)))
      .catch(() => setChartA(EMPTY_XY))
  }, [])

  /** 菜品分类销售排行 - 当日（getSalesRanking） */
  const fetchCategoryByDay = useCallback((tB: number, date: string) => {
    getSalesRanking(tB, date)
      .then((res: any) => setChartC(toPieData(pick(res), tB === 1)))
      .catch(() => setChartC(EMPTY_PIE))
  }, [])

  /** 当日菜品销售排行（getDayRanking，原版 type 固定传 dataType=1） */
  const fetchDishRankByDay = useCallback((date: string) => {
    getDayRanking(date)
      .then((res: any) => setChartB(toXYData(pick(res), false)))
      .catch(() => setChartB(EMPTY_XY))
  }, [])

  /** 当日接口统一调用（对应原版 getData） */
  const loadDay = useCallback(
    (date: string, tA: number, tB: number) => {
      fetchTrendByDay(tA, date)
      fetchCategoryByDay(tB, date)
      fetchDishRankByDay(date)
      fetchTopData(date, date, true)
    },
    [fetchTrendByDay, fetchCategoryByDay, fetchDishRankByDay, fetchTopData],
  )

  // ---------------- 日期切换逻辑 ----------------

  /**
   * 日期选择变化（对应原版 changeDate）：
   * 选中"今天"走当日接口，其它日期走时间段接口。
   */
  const changeDate = useCallback(
    (val: Act, dateStr: string) => {
      if (!dateStr) {
        message.error(tr('检索日期不能为空！'))
        return
      }
      if (val === 'day') {
        const st = dayjs(dateStr).format('YYYY-MM-DD')
        setStateTime(st)
        setEndTime(st)
        if (st === today) loadDay(st, typeA, typeB)
        else loadRange(st, st, typeA, typeB, true)
      } else if (val === 'week') {
        const [ws, we] = weekRange(dayjs(dateStr))
        const st = ws.format('YYYY-MM-DD') // 周一
        const et = we.format('YYYY-MM-DD') // 周日
        setStateTime(st)
        setEndTime(et)
        loadRange(st, et, typeA, typeB)
      } else {
        const st = dayjs(dateStr).startOf('month').format('YYYY-MM-DD')
        const et = dayjs(dateStr).endOf('month').format('YYYY-MM-DD')
        setStateTime(st)
        setEndTime(et)
        loadRange(st, et, typeA, typeB)
      }
    },
    [today, typeA, typeB, loadDay, loadRange],
  )

  /** 初始化 / 查看"今日"数据（对应原版 init()） */
  const init = useCallback(() => {
    setDataTime(today)
    setStateTime(today)
    setEndTime(today)
    loadRange(today, today, typeA, typeB, true)
  }, [today, typeA, typeB, loadRange])

  useEffect(() => {
    init()
    // 仅在首次挂载时初始化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 前一天 / 后一天（对应原版 checkaffterDate） */
  const checkAfterDate = (val: Act, st: 'before' | 'after') => {
    const base = dayjs(dataTime)
    let next = base
    if (st === 'before') {
      if (val === 'day') next = base.subtract(1, 'day')
      else if (val === 'week') next = base.subtract(1, 'week')
      else next = base.subtract(1, 'month').startOf('month')
    } else {
      // 不允许超过今天
      if (val === 'day') next = base.add(1, 'day')
      else if (val === 'week') next = base.add(1, 'week')
      else next = base.add(1, 'month').startOf('month')

      if (next.isAfter(dayjs(), 'day')) {
        // 原版提示语
        message.error(
          val === 'day' ? tr('已经是最后一天了') : val === 'week' ? tr('已经是最后一周了') : tr('已经是最后一个月了'),
        )
        return
      }
    }
    const nextStr = next.format('YYYY-MM-DD')
    setDataTime(nextStr)
    changeDate(val, nextStr)
  }

  /** 日报 / 周报 / 月报 切换（对应原版 dateAct） */
  const dateAct = (val: Act) => {
    setAct(val)
    if (val === 'day') {
      setDataTime(today)
      setStateTime(today)
      setEndTime(today)
      loadRange(today, today, typeA, typeB, true)
    } else if (val === 'week') {
      const [ws, we] = weekRange(dayjs())
      const st = ws.format('YYYY-MM-DD')
      const et = we.format('YYYY-MM-DD')
      setDataTime(today)
      setStateTime(st)
      setEndTime(et)
      loadRange(st, et, typeA, typeB)
    } else {
      const st = dayjs().startOf('month').format('YYYY-MM-DD')
      const et = dayjs().endOf('month').format('YYYY-MM-DD')
      setDataTime(today)
      setStateTime(st)
      setEndTime(et)
      loadRange(st, et, typeA, typeB)
    }
  }

  /** 按金额 / 按单数（按销量）切换（对应原版 topActiveHandle） */
  const topActiveHandle = (which: 'typeA' | 'typeB') => {
    if (which === 'typeA') {
      const next = typeA === 1 ? 2 : 1
      setTypeA(next)
      // 原版切换后重新请求时段销售趋势（无论日报还是区间都调用区间接口）
      fetchTrendByRange(next, stateTime, endTime)
    } else {
      const next = typeB === 1 ? 2 : 1
      setTypeB(next)
      fetchCategoryByRange(next, stateTime, endTime)
    }
  }

  /** 日期选择框的 picker 类型 */
  const pickerType: 'date' | 'week' | 'month' = act === 'day' ? 'date' : act === 'week' ? 'week' : 'month'

  return (
    <div>
      {/* 日报 / 周报 / 月报（原版 HeadLable 中的切换） */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Radio.Group
            value={act}
            onChange={(e) => dateAct(e.target.value as Act)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: tr('日报'), value: 'day' },
              { label: tr('周报'), value: 'week' },
              { label: tr('月报'), value: 'month' },
            ]}
          />
          <Typography.Text strong style={{ color: '#3a9bff' }}>
            {act === 'day'
              ? tr('统计时间：00：00 - 24：00')
              : tr('统计时间：{start} - {end}', { start: stateTime, end: endTime })}
          </Typography.Text>
        </Space>

        <div style={{ marginTop: 12 }}>
          <Space wrap>
            <Button size="small" onClick={() => checkAfterDate(act, 'before')}>
              {act === 'day' ? tr('前一天') : act === 'week' ? tr('前一周') : tr('前一月')}
            </Button>
            <DatePicker
              value={dayjs(dataTime)}
              picker={pickerType}
              allowClear={false}
              format={act === 'week' ? tr('YYYY 第 ww 周') : 'YYYY-MM-DD'}
              onChange={(d) => {
                if (!d) return
                const str = d.format('YYYY-MM-DD')
                setDataTime(str)
                changeDate(act, str)
              }}
            />
            <Button size="small" onClick={() => checkAfterDate(act, 'after')}>
              {act === 'day' ? tr('后一天') : act === 'week' ? tr('后一周') : tr('后一月')}
            </Button>
            <Button type="primary" size="small" onClick={() => (act === 'day' ? init() : dateAct(act))}>
              {tr('查看')}
              {act === 'day' ? tr('今日') : act === 'week' ? tr('本周') : tr('本月')}
              {tr('数据')}
            </Button>
          </Space>
        </div>
      </Card>

      {/* 顶部三个数据框（仅日报，对应原版 topDataBox） */}
      {act === 'day' && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small" style={{ background: 'linear-gradient(63deg, #55A9FF 24%, #379AFF 100%)' }}>
              <Statistic
                title={<span style={{ color: '#fff' }}>{tr('实收金额')}</span>}
                value={(topData.payTotal / 100).toFixed(2)}
                suffix={tr('元')}
                valueStyle={{ color: '#fff' }}
              />
              <Typography.Text style={{ color: '#fff' }}>{tr('较前一日 0%')}</Typography.Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: 'linear-gradient(63deg, #FFA868 33%, #FF903D 100%)' }}>
              <Statistic
                title={<span style={{ color: '#fff' }}>{tr('未收金额')}</span>}
                value={(topData.noPayTotal / 100).toFixed(2)}
                suffix={tr('元')}
                valueStyle={{ color: '#fff' }}
              />
              <Typography.Text style={{ color: '#fff' }}>{tr('较前一日 0%')}</Typography.Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: 'linear-gradient(121deg, #FF8888 24%, #F56C6C 100%)' }}>
              <Statistic
                title={<span style={{ color: '#fff' }}>{tr('就餐人数')}</span>}
                value={topData.totalPerson}
                suffix={tr('人')}
                valueStyle={{ color: '#fff' }}
              />
              <Typography.Text style={{ color: '#fff' }}>{tr('较前一日 0%')}</Typography.Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* 时段销售趋势（按金额 / 按单数） */}
      <Card
        style={{ marginBottom: 16 }}
        extra={
          <Radio.Group
            size="small"
            value={typeA}
            onChange={() => topActiveHandle('typeA')}
            optionType="button"
            options={[
              { label: tr('按金额'), value: 1 },
              { label: tr('按单数'), value: 2 },
            ]}
          />
        }
      >
        {/* 原版未实现顶部按钮的显式选中态切换，这里用 Radio 表达同一语义 */}
        <TrendBarChart title={tr('时段销售趋势')} data={chartA} colorFrom="#FFA868" colorTo="#FF9240" />
      </Card>

      {/* 菜品分类占比（按金额 / 按销量）+ 菜单销售排行 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card
            extra={
              <Radio.Group
                size="small"
                value={typeB}
                onChange={() => topActiveHandle('typeB')}
                optionType="button"
                options={[
                  { label: tr('按金额'), value: 1 },
                  { label: tr('按销量'), value: 2 },
                ]}
              />
            }
          >
            <CategoryPieChart title={tr('菜品分类占比')} data={chartC} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <TrendBarChart title={tr('菜单销售排行')} data={chartB} colorFrom="#55A9FF" colorTo="#379AFF" />
          </Card>
        </Col>
      </Row>


    </div>
  )
}
