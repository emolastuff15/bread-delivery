package com.sky.controller.user;

import com.sky.dto.OrdersPaymentDTO;
import com.sky.dto.OrdersSubmitDTO;
import com.sky.mapper.OrderDetailMapper;
import com.sky.result.PageResult;
import com.sky.result.Result;
import com.sky.service.OrderService;
import com.sky.vo.OrderPaymentVO;
import com.sky.vo.OrderSubmitVO;
import com.sky.vo.OrderVO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.models.auth.In;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController("userOrderController")
@RequestMapping("/user/order")
@Api(tags="用户端订单相关接口")
@Slf4j
public class OrderController {
    @Autowired
    private OrderService orderService;
    @Autowired
    private OrderDetailMapper orderDetailMapper;

    @ApiOperation("用户上传订单")
    @PostMapping("/submit")
    public Result<OrderSubmitVO> submit(@RequestBody OrdersSubmitDTO ordersSubmitDTO){
        OrderSubmitVO orderSubmitVO=orderService.submitOrder(ordersSubmitDTO);
        return Result.success(orderSubmitVO);
    }

    /**
     * 订单支付
     *
     * @param ordersPaymentDTO
     * @return
     */
    @PutMapping("/payment")
    @ApiOperation("订单支付")
    public Result<OrderPaymentVO> payment(@RequestBody OrdersPaymentDTO ordersPaymentDTO) throws Exception {
        log.info("订单支付：{}", ordersPaymentDTO);
        OrderPaymentVO orderPaymentVO = orderService.payment(ordersPaymentDTO);
        log.info("生成预支付交易单：{}", orderPaymentVO);
        return Result.success(orderPaymentVO);
    }

    /**
     * 模拟支付（本项目未接入真实支付业务）
     * 前端"付款页面"点击付款即调用此接口，直接视为支付成功，
     * 触发 paySuccess 的状态流转：预约单 → 0 预约中；普通单 → 2 待接单
     */
    @PutMapping("/mockPay")
    @ApiOperation("模拟支付（点击付款即视为支付成功）")
    public Result mockPay(@RequestBody OrdersPaymentDTO ordersPaymentDTO) {
        String orderNumber = ordersPaymentDTO.getOrderNumber();
        log.info("模拟支付成功，订单号：{}", orderNumber);
        orderService.paySuccess(orderNumber);
        return Result.success();
    }

    @ApiOperation("用户查看历史订单")
    @GetMapping("/historyOrders")
    public Result<PageResult> page(int page, int pageSize, Integer status){

        PageResult pageResult=orderService.pageQuery4User(page,pageSize,status);
        return  Result.success(pageResult);
    }
    @ApiOperation("订单详情")
    @GetMapping("/orderDetail/{id}")
    public Result<OrderVO> details(@PathVariable("id") Long id){
        OrderVO orderVO=orderService.details(id);
        return Result.success(orderVO);
    }
    @ApiOperation("取消订单")
    @PutMapping("/cancel/{id}")
    public Result cancel(@PathVariable("id") Long id){
        orderService.userCancelOrder(id);
        return Result.success();
    }

    @GetMapping("/reminder/{id}")
    @ApiOperation("客户催单")
    public Result reminder(@PathVariable Long id){
        orderService.reminder(id);
        return Result.success();
    }
}
