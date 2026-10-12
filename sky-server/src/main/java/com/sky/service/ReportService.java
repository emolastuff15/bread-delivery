package com.sky.service;

import com.sky.vo.ChartTopVO;
import com.sky.vo.ChartValueVO;
import com.sky.vo.ChartXYVO;
import com.sky.vo.OrderReportVO;
import com.sky.vo.SalesTop10ReportVO;
import com.sky.vo.TurnoverReportVO;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

public interface ReportService {
    //统计指定时间内的营业额
    TurnoverReportVO getTurnOverStatistics(LocalDate begin,LocalDate end);

    OrderReportVO getOrdersStatistics(LocalDate begin, LocalDate end);

    SalesTop10ReportVO getSalesTop10(LocalDate begin, LocalDate end);

    void exportBusinessData(HttpServletResponse response) throws IOException;

    /**
     * 菜品分类占比（chart 页饼图 categoryCollect / dateCategoryCollect）
     * @param begin 开始日期
     * @param end 结束日期
     * @param type 1=按金额(返回分，前端 /100 显示) 2=按销量
     * @return [{name, value, percent}]，按 value 降序
     */
    List<ChartValueVO> getPieChart(LocalDate begin, LocalDate end, Integer type);

    /**
     * 菜单销售排行（chart 页柱状图 currentDishRank / dishRankForDate）
     * @param type 1=按金额(返回分，前端 /100) 2=按销量
     * @return {xaxis:[菜名], series:[数值]}，按数值降序，最多 10 条
     */
    ChartXYVO getDishRank(LocalDate begin, LocalDate end, Integer type);

    /**
     * 时段销售趋势（chart 页柱状图 hourCollect / dayAmountCollect）
     * @param type 1=按金额(返回分，前端 /100) 2=按单数
     * @param byHour true=当日 0~23 点；false=区间内每一天（缺的时段补 0）
     * @return {xaxis:[刻度], series:[数值]}
     */
    ChartXYVO getSalesTrend(LocalDate begin, LocalDate end, Integer type, boolean byHour);

    /**
     * 顶部三个数据框（chart 页 amountCollect 当日 / dayCollect 区间）
     * @return {payTotal 实收(分), noPayTotal 未收(分), totalPerson 就餐人数=去重下单用户数}
     */
    ChartTopVO getTopData(LocalDate begin, LocalDate end);


}
