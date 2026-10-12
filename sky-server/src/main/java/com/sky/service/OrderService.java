package com.sky.service;

import com.sky.dto.*;
import com.sky.entity.Orders;
import com.sky.result.PageResult;
import com.sky.vo.OrderPaymentVO;
import com.sky.vo.OrderStatisticsVO;
import com.sky.vo.OrderSubmitVO;
import com.sky.vo.OrderVO;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderService {

    OrderSubmitVO submitOrder(OrdersSubmitDTO ordersSubmitDTO);//用户下单

    PageResult pageQuery4User(int page, int pageSize, Integer status);

    OrderVO details(Long id);



    /**
     * 订单支付
     * @param ordersPaymentDTO
     * @return
     */
    OrderPaymentVO payment(OrdersPaymentDTO ordersPaymentDTO) throws Exception;

    /**
     * 支付成功，修改订单状态
     * @param outTradeNo
     */
    void paySuccess(String outTradeNo);

    void userCancelOrder(Long id);

    PageResult conditionSearch(OrdersPageQueryDTO ordersPageQueryDTO);

    OrderStatisticsVO statistics();

    void confirm(OrdersConfirmDTO ordersConfirmDTO);

    void rejection(OrdersRejectionDTO ordersRejectionDTO) throws Exception;

    void cancel(OrdersCancelDTO ordersCancelDTO) throws Exception;

    void delivery(Long id);

    void complete(Long id);

    List<Orders> listTodayReservation(LocalDateTime time);

    /**
     * 查询"预约时间早于 deadline 且仍未接单"的预约单（用于提前提醒管理端）
     * 不设下界：已过预约时间但一直未处理的单会持续被提醒
     *
     * @param deadline 提醒截止线，一般为 当前时间 + 1小时
     */
    List<Orders> listPendingReservationReminders(LocalDateTime deadline);

    /**
     * 按订单明细回补菜品库存（订单取消/超时/拒单时调用）
     * @param orderId 订单id
     */
    void restoreStockByOrderId(Long orderId);

    void reminder(Long id);
}
