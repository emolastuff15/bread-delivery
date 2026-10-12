package com.sky.service.impl;

import com.sky.dto.GoodsSalesDTO;
import com.sky.entity.OrderDetail;
import com.sky.entity.Orders;
import com.sky.mapper.DishMapper;
import com.sky.mapper.OrderDetailMapper;
import com.sky.mapper.OrderMapper;
import com.sky.service.ReportService;
import com.sky.service.WorkspaceService;
import com.sky.vo.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import javax.swing.*;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ReportServiceImpl implements ReportService {
    @Autowired
    private final OrderMapper orderMapper;
    @Autowired
    private final DishMapper dishMapper;
    @Autowired
    private WorkspaceService workspaceService;
    @Autowired
    private OrderDetailMapper orderDetailMapper;

    public ReportServiceImpl(OrderMapper orderMapper, DishMapper dishMapper) {
        this.orderMapper = orderMapper;
        this.dishMapper = dishMapper;
    }

    @Override
    public TurnoverReportVO getTurnOverStatistics(LocalDate begin, LocalDate end) {
        List<LocalDate> dataList=new ArrayList<>();// 存放从begin到end的每一天
        dataList.add(begin);
        //循环放置
        while (!begin.equals(end)){
            begin=begin.plusDays(1);
            dataList.add(begin);
        }


        List<Double> turnoverList=new ArrayList<>();//营业额数组
        for(LocalDate date:dataList){//查询当日的营业额
            LocalDateTime beginTime= LocalDateTime.of(date,LocalTime.MIN);
            LocalDateTime endTime=LocalDateTime.of(date,LocalTime.MAX);
            Map map=new HashMap();
            map.put("begin",beginTime);
            map.put("end",endTime);
            map.put("status", Orders.COMPLETED);
            Double turnover= orderMapper.sumByMap(map);
            if(turnover==null)
                turnover= 0.0;
            turnoverList.add(turnover);
        }


        //构建包含begin，end日期,营业额的vo字符串
        TurnoverReportVO turnoverReportVO= TurnoverReportVO.builder().
                dateList(StringUtils.join(dataList,",")).
                turnoverList(StringUtils.join(turnoverList,","))
                .build();

        return turnoverReportVO;
    }

    @Override
    public OrderReportVO getOrdersStatistics(LocalDate begin, LocalDate end) {
        List<LocalDate> dataList=new ArrayList<>();// 存放从begin到end的每一天
        dataList.add(begin);
        //循环放置
        while (!begin.equals(end)){
            begin=begin.plusDays(1);
            dataList.add(begin);
        }

        //时间段内订单总数的集合
        List<Integer> orderCountList=new ArrayList<>();
        //时间段内有效订单的集合
        List<Integer> vailedCountList=new ArrayList<>();

        for (LocalDate date : dataList) {
            //设置一整天
            LocalDateTime startTime=LocalDateTime.of(date,LocalTime.MIN);
            LocalDateTime endTime=LocalDateTime.of(date,LocalTime.MAX);

            //查询每天订单总数
            Integer orderCount = getOrderCount(startTime,endTime,null);
            //查询每天有效订单
            Integer valiedOrderCount = getOrderCount(startTime,endTime,Orders.COMPLETED);

            orderCountList.add(orderCount);
            vailedCountList.add(valiedOrderCount);

        }
        //总订单
        Integer totalOrderCount = orderCountList.stream().reduce(Integer::sum).get();

        //总有效订单
        Integer validOrderCount = vailedCountList.stream().reduce(Integer::sum).get();

        //计算完成率
        Double orderCompletioRate = 0.0;
        if(totalOrderCount!=0){
            orderCompletioRate= validOrderCount.doubleValue()/totalOrderCount;
        }

        OrderReportVO orderReportVO= OrderReportVO.builder()
                .dateList(StringUtils.join(dataList,","))
                .orderCountList(StringUtils.join(orderCountList,","))
                .validOrderCountList(StringUtils.join(orderCountList,","))
                .totalOrderCount(totalOrderCount)
                .orderCompletionRate(orderCompletioRate)
                .build();
        return orderReportVO;
    }

    //得到销量排名
    @Override
    public SalesTop10ReportVO getSalesTop10(LocalDate begin, LocalDate end) {

        LocalDateTime beginTime= LocalDateTime.of(begin,LocalTime.MIN);
        LocalDateTime endTime= LocalDateTime.of(end,LocalTime.MAX);
        List<GoodsSalesDTO> salesTop10= orderMapper.getSalesTop(beginTime,endTime);

        List<String> names= salesTop10.stream().map(GoodsSalesDTO::getName).collect(Collectors.toList());
        String nameList = StringUtils.join(names,",");

        List<Integer> numbers=salesTop10.stream().map(GoodsSalesDTO::getNumber).collect(Collectors.toList());
        String numberList=StringUtils.join(numbers,",");

        return SalesTop10ReportVO.builder().nameList(nameList).numberList(numberList).build();
    }

    //生成销量文件
    @Override
    public void exportBusinessData(HttpServletResponse response) throws IOException {
        LocalDate dateBegin=LocalDate.now().minusDays(30);
        LocalDate dateEnd=LocalDate.now().minusDays(1);
        BusinessDataVO businessDataVO= workspaceService.getBusinessData(LocalDateTime.of(dateBegin,LocalTime.MIN),LocalDateTime.of(dateEnd,LocalTime.MAX));

        InputStream in= this.getClass().getClassLoader().getResourceAsStream("template/运营数据报表模板");
        XSSFWorkbook excel = new XSSFWorkbook(in);
        //填充数据
        XSSFSheet sheets=excel.getSheet("Sheet1");

        sheets.getRow(1).getCell(1).setCellValue("时间:"+dateBegin+"---"+dateEnd);

        XSSFRow row=sheets.getRow(3);//获取第四行
        row.getCell(2).setCellValue(businessDataVO.getTurnover());//获取营业额
        row.getCell(4).setCellValue(businessDataVO.getOrderCompletionRate());//获取完成率
        row.getCell(6).setCellValue(businessDataVO.getNewUsers());//新用户

        row=sheets.getRow(4);//获取第五行
        row.getCell(2).setCellValue(businessDataVO.getValidOrderCount());
        row.getCell(4).setCellValue(businessDataVO.getUnitPrice());

        //填写明细
        for(int i=0;i<30;i++){
            LocalDate date=dateBegin.plusDays(i);
            workspaceService.getBusinessData(LocalDateTime.of(date,LocalTime.MIN),LocalDateTime.of(date,LocalTime.MAX));
            row= sheets.getRow(7+i);
            row.getCell(1).setCellValue(date.toString());
            row.getCell(2).setCellValue(businessDataVO.getTurnover());
            row.getCell(3).setCellValue(businessDataVO.getValidOrderCount());
            row.getCell(4).setCellValue(businessDataVO.getOrderCompletionRate());
            row.getCell(5).setCellValue(businessDataVO.getUnitPrice());
            row.getCell(6).setCellValue(businessDataVO.getNewUsers());

        }


        ServletOutputStream outputStream = response.getOutputStream();//输出到浏览器
        excel.write(outputStream);
        outputStream.close();
        excel.close();




    }

    /**
     * 菜品分类占比（饼图）
     * type=1 按金额：SQL 里已经 ×100 转成分，前端 /100 显示成元
     * type=2 按销量：直接是份数
     */
    @Override
    public List<ChartValueVO> getPieChart(LocalDate begin, LocalDate end, Integer type) {
        LocalDateTime beginTime = LocalDateTime.of(begin, LocalTime.MIN);
        LocalDateTime endTime = LocalDateTime.of(end, LocalTime.MAX);

        List<ChartValueVO> list = orderMapper.getCategorySales(beginTime, endTime, type == null ? 1 : type);

        // 计算占比（饼图 tooltip/图例用）
        long total = list.stream().mapToLong(v -> v.getValue() == null ? 0L : v.getValue()).sum();
        if (total > 0) {
            for (ChartValueVO vo : list) {
                long v = vo.getValue() == null ? 0L : vo.getValue();
                vo.setPercent(Math.round(v * 10000.0 / total) / 100.0);
            }
        }
        log.info("菜品分类占比统计:{},{} type={} 共 {} 个分类", begin, end, type, list.size());
        return list;
    }

    /**
     * 菜单销售排行（柱状图）
     * 前端 ChartStats.tsx：
     *  - 当日 currentDishRank  → toXYData(res, false)，不除 100 → 这里传 type=2 返回销量
     *  - 区间 dishRankForDate  → toXYData(res, true) ，会 /100 → 这里传 type=1 返回金额(分)
     */
    @Override
    public ChartXYVO getDishRank(LocalDate begin, LocalDate end, Integer type) {
        LocalDateTime beginTime = LocalDateTime.of(begin, LocalTime.MIN);
        LocalDateTime endTime = LocalDateTime.of(end, LocalTime.MAX);

        List<ChartValueVO> list = orderMapper.getDishSales(beginTime, endTime, type == null ? 1 : type);

        List<String> xaxis = list.stream()
                .map(v -> v.getName() == null ? "" : v.getName())
                .collect(Collectors.toList());
        List<Long> series = list.stream()
                .map(v -> v.getValue() == null ? 0L : v.getValue())
                .collect(Collectors.toList());

        log.info("菜单销售排行统计:{},{} type={} 共 {} 条", begin, end, type, list.size());
        return ChartXYVO.builder().xaxis(xaxis).series(series).build();
    }

    /** 按天补零用的格式化器 */
    private static final DateTimeFormatter DAY_KEY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MM-dd");

    /**
     * 时段销售趋势（柱状图）
     *
     * 关键点：SQL 只会返回"有单的那些小时/天"，这里必须把骨架补全，
     * 否则柱子会错位（没单的时段也得有一根高度为 0 的柱子）。
     *
     * type=1 金额：SQL 里已 ×100，返回【分】，前端 toXYData(res, tA===1) 会 /100
     * type=2 单数：直接是订单数
     */
    @Override
    public ChartXYVO getSalesTrend(LocalDate begin, LocalDate end, Integer type, boolean byHour) {
        LocalDateTime beginTime = LocalDateTime.of(begin, LocalTime.MIN);
        LocalDateTime endTime = LocalDateTime.of(end, LocalTime.MAX);

        List<ChartValueVO> rows = orderMapper.getSalesTrend(beginTime, endTime,
                type == null ? 1 : type, byHour);

        // name -> value，便于按骨架回填
        Map<String, Long> valueMap = new HashMap<>();
        for (ChartValueVO row : rows) {
            valueMap.put(row.getName(), row.getValue() == null ? 0L : row.getValue());
        }

        List<String> xaxis = new ArrayList<>();
        List<Long> series = new ArrayList<>();

        if (byHour) {
            // 0时 ~ 23时，共 24 个刻度
            for (int hour = 0; hour < 24; hour++) {
                xaxis.add(hour + "时");
                series.add(valueMap.getOrDefault(String.valueOf(hour), 0L));
            }
        } else {
            // 区间内每一天，缺的补 0（标签用 MM-dd，避免 31 个日期太长）
            for (LocalDate day = begin; !day.isAfter(end); day = day.plusDays(1)) {
                xaxis.add(day.format(DAY_LABEL));
                series.add(valueMap.getOrDefault(day.format(DAY_KEY), 0L));
            }
        }

        log.info("时段销售趋势统计:{},{} type={} byHour={} 刻度 {} 个",
                begin, end, type, byHour, xaxis.size());
        return ChartXYVO.builder().xaxis(xaxis).series(series).build();
    }

    /**
     * 顶部三个数据框
     * payTotal/noPayTotal 单位是【分】（前端 /100 显示成元）
     * totalPerson = 该时间段内下单的去重用户数（排除已取消/退款订单）
     */
    @Override
    public ChartTopVO getTopData(LocalDate begin, LocalDate end) {
        LocalDateTime beginTime = LocalDateTime.of(begin, LocalTime.MIN);
        LocalDateTime endTime = LocalDateTime.of(end, LocalTime.MAX);

        ChartTopVO vo = orderMapper.getTopData(beginTime, endTime);
        if (vo == null) {
            vo = new ChartTopVO();
        }
        // sum() 在空集时返回 NULL，统一兜成 0，避免前端拿到 null
        if (vo.getPayTotal() == null) {
            vo.setPayTotal(0L);
        }
        if (vo.getNoPayTotal() == null) {
            vo.setNoPayTotal(0L);
        }
        if (vo.getTotalPerson() == null) {
            vo.setTotalPerson(0L);
        }
        log.info("顶部数据统计:{},{} 实收={}分 未收={}分 就餐人数={}",
                begin, end, vo.getPayTotal(), vo.getNoPayTotal(), vo.getTotalPerson());
        return vo;
    }

    private Integer getOrderCount(LocalDateTime startTime,LocalDateTime endTime,Integer status){

        //查询每天订单
        Map map=new HashMap();
        map.put("begin",startTime);
        map.put("end",endTime);
        map.put("status",null);

        //
        Integer orderCount=orderMapper.countByMap(map);

        return orderCount;
    }
}
