package com.sky.controller.admin;

import com.sky.result.Result;
import com.sky.service.ReportService;
import com.sky.vo.ChartTopVO;
import com.sky.vo.ChartValueVO;
import com.sky.vo.ChartXYVO;
import com.sky.vo.OrderReportVO;
import com.sky.vo.SalesTop10ReportVO;
import com.sky.vo.TurnoverReportVO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletResponse;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/admin/report")
@Api("数据统计")
@Slf4j
public class ReportController {
    @Autowired
    private ReportService reportService;

    @GetMapping("/turnoverStatistics")
    @ApiOperation("营业额统计")
    public Result<TurnoverReportVO> turnoverStatistics(
            @DateTimeFormat(pattern = "yyyy-MM-dd")     LocalDate begin,
            @DateTimeFormat(pattern = "yyyy-MM-dd")      LocalDate end)
    {
        log.info("营业额数据统计:{},{}",begin,end);
        return Result.success(reportService.getTurnOverStatistics(begin,end)) ;
    }

    @GetMapping("/ordersStatistics")
    @ApiOperation("订单统计")
    public Result<OrderReportVO> ordersStatistics(
            @DateTimeFormat(pattern = "yyyy-MM-dd")     LocalDate begin,
            @DateTimeFormat(pattern = "yyyy-MM-dd")      LocalDate end)
    {
        log.info("订单数据统计:{},{}",begin,end);
        return Result.success(reportService.getOrdersStatistics(begin,end)) ;
    }

    @GetMapping("/top10")
    @ApiOperation("销量排名")
    public Result<SalesTop10ReportVO> top10(

            @DateTimeFormat(pattern = "yyyy-MM-dd") @RequestParam LocalDate begin,
            @DateTimeFormat(pattern = "yyyy-MM-dd") @RequestParam LocalDate end)
    {
        log.info("销量排名统计:{},{}",begin,end);
        return Result.success(reportService.getSalesTop10(begin,end)) ;
    }

    @GetMapping("/export")
    @ApiOperation("导出运营数据报表")
    public void export(HttpServletResponse response) throws Exception {
        reportService.exportBusinessData(response);
    }

    /**
     * 菜品分类占比 - 当日（chart 页饼图，对应原版 categoryCollect）
     * 例：GET /admin/report/categoryCollect/2/2026-09-22
     */
    @GetMapping("/categoryCollect/{type}/{date}")
    @ApiOperation("菜品分类占比-当日")
    public Result<List<ChartValueVO>> categoryCollect(
            @PathVariable Integer type,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        log.info("菜品分类占比(当日):type={},date={}", type, date);
        return Result.success(reportService.getPieChart(date, date, type));
    }

    /**
     * 菜品分类占比 - 时间段（chart 页饼图，对应原版 dateCategoryCollect）
     * 例：GET /admin/report/dateCategoryCollect/2/2026-09-01/2026-09-30
     */
    @GetMapping("/dateCategoryCollect/{type}/{start}/{end}")
    @ApiOperation("菜品分类占比-时间段")
    public Result<List<ChartValueVO>> dateCategoryCollect(
            @PathVariable Integer type,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end) {
        log.info("菜品分类占比(区间):type={},{}~{}", type, start, end);
        return Result.success(reportService.getPieChart(start, end, type));
    }

    /**
     * 菜单销售排行 - 时间段（chart 页柱状图，对应原版 dishRankForDate）
     * 前端 toXYData(res, true) 会 /100，所以这里返回【金额(分)】
     * 例：GET /admin/report/dishRankForDate/2026-09-01/2026-09-30
     */
    @GetMapping("/dishRankForDate/{start}/{end}")
    @ApiOperation("菜单销售排行-时间段")
    public Result<ChartXYVO> dishRankForDate(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end) {
        log.info("菜单销售排行(区间):{}~{}", start, end);
        return Result.success(reportService.getDishRank(start, end, 1));
    }

    /**
     * 菜单销售排行 - 当日（chart 页柱状图，对应原版 currentDishRank）
     * 前端 toXYData(res, false) 不除 100，所以这里返回【销量(份)】
     * 例：GET /admin/report/currentDishRank/2026-09-22
     */
    @GetMapping("/currentDishRank/{date}")
    @ApiOperation("菜单销售排行-当日")
    public Result<ChartXYVO> currentDishRank(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        log.info("菜单销售排行(当日):{}", date);
        return Result.success(reportService.getDishRank(date, date, 2));
    }

    /**
     * 时段销售趋势 - 区间按天（chart 页柱状图主路径，对应原版 dayAmountCollect）
     * 前端 toXYData(res, tA===1) 会 /100，所以 type=1 时返回【金额(分)】；type=2 返回单数
     * 周报/月报的 start/end 由前端算好传进来，后端只认区间
     * 例：GET /admin/report/dayAmountCollect/1/2026-09-01/2026-09-30
     */
    @GetMapping("/dayAmountCollect/{type}/{start}/{end}")
    @ApiOperation("时段销售趋势-区间按天")
    public Result<ChartXYVO> dayAmountCollect(
            @PathVariable Integer type,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end) {
        log.info("时段销售趋势(区间):type={},{}~{}", type, start, end);
        return Result.success(reportService.getSalesTrend(start, end, type, false));
    }

    /**
     * 时段销售趋势 - 当日按小时（chart 页柱状图，对应原版 hourCollect）
     * 返回 0时~23时 共 24 个刻度，没单的小时补 0
     * 例：GET /admin/report/hourCollect/1/2026-09-22
     */
    @GetMapping("/hourCollect/{type}/{date}")
    @ApiOperation("时段销售趋势-当日按小时")
    public Result<ChartXYVO> hourCollect(
            @PathVariable Integer type,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        log.info("时段销售趋势(当日):type={},date={}", type, date);
        return Result.success(reportService.getSalesTrend(date, date, type, true));
    }

    /**
     * 顶部数据 - 当日（chart 页三个数据框，对应原版 amountCollect）
     * 返回 {payTotal 实收(分), noPayTotal 未收(分), totalPerson 就餐人数=去重下单用户数}
     * 例：GET /admin/report/amountCollect/2026-09-22
     */
    @GetMapping("/amountCollect/{date}")
    @ApiOperation("顶部数据-当日")
    public Result<ChartTopVO> amountCollect(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        log.info("顶部数据(当日):{}", date);
        return Result.success(reportService.getTopData(date, date));
    }

    /**
     * 顶部数据 - 时间段（chart 页三个数据框，对应原版 dayCollect）
     * 例：GET /admin/report/dayCollect/2026-09-01/2026-09-30
     */
    @GetMapping("/dayCollect/{start}/{end}")
    @ApiOperation("顶部数据-时间段")
    public Result<ChartTopVO> dayCollect(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end) {
        log.info("顶部数据(区间):{}~{}", start, end);
        return Result.success(reportService.getTopData(start, end));
    }

}
