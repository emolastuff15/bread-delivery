package com.sky.mapper;

import com.sky.entity.OrderDetail;
import com.sky.entity.Orders;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface OrderDetailMapper {
    void insertBatch(List<OrderDetail> orderDetailList);


    @Select("select * from order_detail where order_id = #{orderId}")
    List<OrderDetail> getByOrdersId(Long orderId);

    List<Orders> getByTime(Map map);
}
