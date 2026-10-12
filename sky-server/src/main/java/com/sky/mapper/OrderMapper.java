package com.sky.mapper;

import com.github.pagehelper.Page;
import com.sky.dto.GoodsSalesDTO;
import com.sky.dto.OrdersPageQueryDTO;
import com.sky.entity.Orders;
import com.sky.vo.ChartTopVO;
import com.sky.vo.ChartValueVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface OrderMapper {
    void insert(Orders orders);

    Page<Orders> pageQuery(OrdersPageQueryDTO ordersPageQueryDTO);


    @Select("select * from orders where id = #{orderId}")
    Orders getById(Long orderId);

    /**
     * 根据订单号查询订单
     * @param orderNumber
     */
    @Select("select * from orders where number = #{orderNumber}")
    Orders getByNumber(String orderNumber);

    void update(Orders orders);
    @Select("select count(id) from orders where status = #{status}")
    Integer countStatus(Integer toBeConfirmed);

    @Select("select * from orders where status = #{status} and order_time < #{orderTime}")
    List<Orders> getByStatusAndOrderTimeLT(Integer status, LocalDateTime orderTime);


    //统计营业额，根据时间
    Double sumByMap(Map map);

    //统计订单数，根据时间
    Integer countByMap(Map map);

    //top10
    List<GoodsSalesDTO> getSalesTop(LocalDateTime begin,LocalDateTime end);

    /**
     * 菜品分类占比/销量（chart 页饼图）
     * @param begin 开始时间
     * @param end 结束时间
     * @param type 1=按金额(返回分) 2=按销量
     * @return [{name, value}]，按 value 降序
     */
    List<ChartValueVO> getCategorySales(@Param("begin") LocalDateTime begin,
                                        @Param("end") LocalDateTime end,
                                        @Param("type") Integer type);

    /**
     * 菜单销售排行（chart 页柱状图），按 order_detail.name 分组，取前 10
     * @param type 1=按金额(返回分) 2=按销量
     * @return [{name, value}]，按 value 降序
     */
    List<ChartValueVO> getDishSales(@Param("begin") LocalDateTime begin,
                                    @Param("end") LocalDateTime end,
                                    @Param("type") Integer type);

    /**
     * 时段销售趋势（chart 页柱状图）
     * @param byHour true=按小时分组(当日 0~23 点) false=按天分组(区间内每一天)
     * @param type 1=按金额(返回分) 2=按单数
     * @return [{name: "小时/datetime 字符串", value}]，只含有单的时段，补零在业务层做
     */
    List<ChartValueVO> getSalesTrend(@Param("begin") LocalDateTime begin,
                                     @Param("end") LocalDateTime end,
                                     @Param("type") Integer type,
                                     @Param("byHour") boolean byHour);

    /**
     * 顶部三个数据框（chart 页 amountCollect / dayCollect）
     * @return {payTotal 实收(分), noPayTotal 未收(分), totalPerson 去重下单用户数}
     */
    ChartTopVO getTopData(@Param("begin") LocalDateTime begin,
                          @Param("end") LocalDateTime end);
}
