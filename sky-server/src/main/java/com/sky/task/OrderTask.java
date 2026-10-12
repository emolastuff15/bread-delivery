package com.sky.task;

import com.sky.entity.Orders;
import com.sky.mapper.OrderMapper;
import com.sky.service.OrderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
public class OrderTask {

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private OrderService orderService;

    @Scheduled(cron="0 * * * * ?")//每分钟触发一次
    public void processTimeoutOrder(){
        log.info("定时触发:{}", LocalDateTime.now());

        LocalDateTime time=LocalDateTime.now().plusMinutes(-15);

        List<Orders> ordersList= orderMapper.getByStatusAndOrderTimeLT(Orders.PENDING_PAYMENT,time);

        if(ordersList !=null && !ordersList.isEmpty()){
            for(Orders orders:ordersList){
                try {
                    orders.setStatus(Orders.CANCELLED);
                    orders.setCancelReason("订单超时，自动取消");
                    orders.setCancelTime(LocalDateTime.now());
                    orderMapper.update(orders);
                    // 回补库存（下单时已扣，超时取消要还回去）
                    orderService.restoreStockByOrderId(orders.getId());
                    log.info("超时订单[{}]已自动取消并回补库存", orders.getId());
                } catch (Exception e) {
                    // 单条失败不影响其余订单，下一分钟还会再扫到它
                    log.error("处理超时订单[{}]失败", orders.getId(), e);
                }
            }
        }
    }

    @Scheduled(cron="0 0 1 * * ?")//每天凌晨1点
    public void processDeliveryOrder(){
        log.info("定时处理处于派送中的订单:{}",LocalDateTime.now());

        LocalDateTime time = LocalDateTime.now().plusMinutes(-60);

        orderMapper.getByStatusAndOrderTimeLT(Orders.DELIVERY_IN_PROGRESS,time);
    }
}
