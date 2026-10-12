package com.sky.service.impl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.sky.constant.MessageConstant;
import com.sky.context.BaseContext;
import com.sky.dto.*;
import com.sky.entity.*;
import com.sky.exception.AddressBookBusinessException;
import com.sky.exception.OrderBusinessException;
import com.sky.mapper.*;
import com.sky.result.PageResult;
import com.sky.service.OrderService;
import com.sky.vo.OrderPaymentVO;
import com.sky.vo.OrderStatisticsVO;
import com.sky.vo.OrderSubmitVO;
import com.sky.vo.OrderVO;
import com.sky.websocket.WebSocketServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OrderServiceImpl implements OrderService {
    @Autowired
    private OrderMapper orderMapper;
    @Autowired
    private AddressBookMapper addressBookMapper;
    @Autowired
    private ShoppingCardMapper shoppingCardMapper;
    @Autowired
    private OrderDetailMapper orderDetailMapper;
    @Autowired
    private WebSocketServer webSocketServer;
    @Autowired
    private DishMapper dishMapper;

    @Override
    @Transactional   // 下单要写 4 张表（订单/库存/明细/清购物车），任一步失败整体回滚
    public OrderSubmitVO submitOrder(OrdersSubmitDTO ordersSubmitDTO) {
        log.info("当前用户下单:{}",ordersSubmitDTO);
        AddressBook adressBook= addressBookMapper.getById(ordersSubmitDTO.getAddressBookId());
        if(adressBook==null){
            throw new AddressBookBusinessException(MessageConstant.ADDRESS_BOOK_IS_NULL);
        }

        ShoppingCart shoppingCart=new ShoppingCart();
        Long userId= BaseContext.getCurrentId();
        shoppingCart.setUserId(userId);
        List<ShoppingCart> list= shoppingCardMapper.list(shoppingCart);
        if (list==null || list.isEmpty()){
            throw new AddressBookBusinessException(MessageConstant.SHOPPING_CART_IS_NULL);
        }

        Orders orders=new Orders();
        BeanUtils.copyProperties(ordersSubmitDTO,orders);   // 含 reservationTime（同名字段自动复制）
        orders.setOrderTime(LocalDateTime.now());
        orders.setPayStatus(Orders.UN_PAID);
        // 预约单同样需要先付款：提交后一律进入"待付款"，
        // 付款成功后再由 paySuccess() 分流（预约单→预约中，普通单→待接单）
        orders.setStatus(Orders.PENDING_PAYMENT);
        orders.setNumber(String.valueOf(System.currentTimeMillis()));
        orders.setPhone(adressBook.getPhone());
        orders.setConsignee(adressBook.getConsignee());
        // 把地址簿里的完整地址（省市区 + 详细地址 + 房间地址）写进订单，供管理端/用户端展示
        orders.setAddress(buildFullAddress(adressBook));
        orders.setUserId(userId);

        orderMapper.insert(orders);

        List<OrderDetail> orderDetailList=new ArrayList<>();
        for(ShoppingCart cart:list){
            OrderDetail orderDetail=new OrderDetail();
            BeanUtils.copyProperties(cart,orderDetail);
            orderDetail.setOrderId(orders.getId());
            orderDetailList.add((orderDetail));
        }

        // 扣减菜品库存：逐条扣、逐条校验（与本方法其它写操作同事务，失败整体回滚）
        for(OrderDetail orderDetail:orderDetailList) {
            if (orderDetail.getDishId() == null) {
                // 套餐行没有 dishId（只有 setmealId），此处不扣库存
                continue;
            }
            int rows = dishMapper.updateDishNumber(orderDetail);
            if (rows == 0) {
                // 影响行数为 0：说明库存不足（SQL 里带了 number >= #{number} 条件）
                throw new OrderBusinessException(
                        MessageConstant.DISH_STOCK_NOT_ENOUGH + "：" + orderDetail.getName());
            }
        }

        orderDetailMapper.insertBatch(orderDetailList);

        shoppingCardMapper.deleteByUserId(userId);

        OrderSubmitVO orderSubmitVO=OrderSubmitVO.builder()
                .id(orders.getId())
                .orderTime(orders.getOrderTime())
                .orderNumber(orders.getNumber())
                .orderAmount(orders.getAmount())
                .build();
        return orderSubmitVO;
    }

    @Override
    public PageResult pageQuery4User(int page, int pageSize, Integer status) {
        PageHelper.startPage(page,pageSize);
        OrdersPageQueryDTO ordersPageQueryDTO=new OrdersPageQueryDTO();
        ordersPageQueryDTO.setUserId(BaseContext.getCurrentId());
        ordersPageQueryDTO.setStatus(status);
        //设置DTO,查询符合的page
        Page<Orders> ordersPage=orderMapper.pageQuery(ordersPageQueryDTO);
        //循环每个page的id，得到详细订单，然后赋值
        List<OrderVO> list=new ArrayList<>();
        if(ordersPage!=null && !ordersPage.isEmpty()) {
            for (Orders orders : ordersPage) {
                Long orderId=orders.getId();
                List<OrderDetail> orderDetails= orderDetailMapper.getByOrdersId(orderId);
                OrderVO orderVO=new OrderVO();
                BeanUtils.copyProperties(orders,orderVO);
                orderVO.setOrderDetailList(orderDetails);
                //得到V0后加入list
                list.add(orderVO);
            }
        }
        return new PageResult(ordersPage.getTotal(),list);
    }

    @Override
    public OrderVO details(Long id) {
        //获取订单号
        Orders orders= orderMapper.getById(id);
        List<OrderDetail> OrderDetailList=orderDetailMapper.getByOrdersId(orders.getId());//获取订单详情
        OrderVO orderVO=new OrderVO();//把东西放在VO
        BeanUtils.copyProperties(orders,orderVO);
        orderVO.setOrderDetailList(OrderDetailList);
        return orderVO;
    }

    @Override
    public OrderPaymentVO payment(OrdersPaymentDTO ordersPaymentDTO) throws Exception {
        // 当前登录用户id
        Long userId = BaseContext.getCurrentId();
        //User user = userMapper.getById(userId);

//        //调用微信支付接口，生成预支付交易单
//        JSONObject jsonObject = weChatPayUtil.pay(
//                ordersPaymentDTO.getOrderNumber(), //商户订单号
//                new BigDecimal(0.01), //支付金额，单位 元
//                "苍穹外卖订单", //商品描述
//                user.getOpenid() //微信用户的openid
//        );

//        if (jsonObject.getString("code") != null && jsonObject.getString("code").equals("ORDERPAID")) {
//            throw new OrderBusinessException("该订单已支付");
//        }
//
//        OrderPaymentVO vo = jsonObject.toJavaObject(OrderPaymentVO.class);
//        vo.setPackageStr(jsonObject.getString("package"));

        return null;
    }

    @Override
    public void paySuccess(String outTradeNo) {
        // 根据订单号查询订单
        Orders ordersDB = orderMapper.getByNumber(outTradeNo);
        if (ordersDB == null) {
            throw new OrderBusinessException(MessageConstant.ORDER_NOT_FOUND);
        }

        // 预约单：付款后进入"预约中"，等预约时间进入 1 小时窗口再由 ReservationRemindTask 提醒管理端接单
        // 普通单：付款后直接进入"待接单"
        boolean isReservation = ordersDB.getReservationTime() != null;
        Integer targetStatus = isReservation ? Orders.RESERVATION : Orders.TO_BE_CONFIRMED;

        // 根据订单id更新订单的状态、支付方式、支付状态、结账时间
        Orders orders = Orders.builder()
                .id(ordersDB.getId())
                .status(targetStatus)
                .payStatus(Orders.PAID)
                .checkoutTime(LocalDateTime.now())
                .build();

        orderMapper.update(orders);

        if (isReservation) {
            // 预约单此刻不需要催接单（可能还有几天才到店），立即来单提醒会干扰后厨，
            // 提醒统一由预约前 1 小时的汇总推送(type=3)负责
            log.info("预约单支付成功，进入预约中：id={}, 预约时间={}", ordersDB.getId(), ordersDB.getReservationTime());
            return;
        }

        Map map=new HashMap();
        map.put("type",1);
        map.put("orderId",ordersDB.getId());
        map.put("content","订单号:"+outTradeNo);
        String json= JSON.toJSONString(map);
        webSocketServer.sendToAllClient(json);
    }


    @Override
    @Transactional   // 改订单状态 + 回补库存，要一起成功或一起回滚
    public void userCancelOrder(Long id) {
        //找到对应的订单
        Orders orders=orderMapper.getById(id);
        if(orders.getStatus()>2){
            throw new OrderBusinessException(MessageConstant.ORDER_NOT_FOUND);
        }
        //创建新order，保护数据
        Orders orderChange=new Orders();
        orderChange.setId(orders.getId());
        orderChange.setStatus(Orders.REFUND);
        orders.setStatus(Orders.CANCELLED);
        orders.setCancelReason("用户取消");
        orders.setCancelTime(LocalDateTime.now());
        //更新
        orderMapper.update(orders);
        // 回补库存（下单时扣过）
        restoreStockByOrderId(orders.getId());
    }

    /**
     * 按订单明细把库存加回去（订单取消/超时/拒单时调用）
     * 套餐行没有 dishId，跳过不处理（套餐库存未纳入扣减）
     */
    @Override
    @Transactional
    public void restoreStockByOrderId(Long orderId) {
        List<OrderDetail> orderDetailList = orderDetailMapper.getByOrdersId(orderId);
        if (orderDetailList == null || orderDetailList.isEmpty()) {
            return;
        }
        int count = 0;
        for (OrderDetail orderDetail : orderDetailList) {
            if (orderDetail.getDishId() == null) {
                continue;
            }
            dishMapper.restoreDishNumber(orderDetail);
            count++;
        }
        log.info("已回补订单[{}]的菜品库存，涉及菜品{}条", orderId, count);
    }



    @Override
    public PageResult conditionSearch(OrdersPageQueryDTO ordersPageQueryDTO) {
        PageHelper.startPage(ordersPageQueryDTO.getPage(),ordersPageQueryDTO.getPageSize());
        Page<Orders> page=orderMapper.pageQuery(ordersPageQueryDTO);
        List<OrderVO> OrderVOlist=getOrderVOList(page);

        return new PageResult(page.getTotal(), OrderVOlist);
    }

    @Override
    public OrderStatisticsVO statistics() {
        Integer toBeConfirmed = orderMapper.countStatus(Orders.TO_BE_CONFIRMED);
        Integer confirmed = orderMapper.countStatus(Orders.CONFIRMED);
        Integer deliveryInProgress = orderMapper.countStatus(Orders.DELIVERY_IN_PROGRESS);

        // 将查询出的数据封装到orderStatisticsVO中响应
        OrderStatisticsVO orderStatisticsVO = new OrderStatisticsVO();
        orderStatisticsVO.setToBeConfirmed(toBeConfirmed);
        orderStatisticsVO.setConfirmed(confirmed);
        orderStatisticsVO.setDeliveryInProgress(deliveryInProgress);
        return orderStatisticsVO;

    }

    @Override
    public void confirm(OrdersConfirmDTO ordersConfirmDTO) {//接单
            Orders orders = Orders.builder()
                    .id(ordersConfirmDTO.getId())
                    .status(Orders.CONFIRMED)
                    .build();

            orderMapper.update(orders);
    }

    @Override
    @Transactional   // 拒单 + 回补库存，一起成功或一起回滚
    public void rejection(OrdersRejectionDTO ordersRejectionDTO) {
        Orders ordersDB = orderMapper.getById(ordersRejectionDTO.getId());

        // 订单只有存在且状态为2（待接单）才可以拒单
        if (ordersDB == null || !ordersDB.getStatus().equals(Orders.TO_BE_CONFIRMED)) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }


        // 拒单需要退款，根据订单id更新订单状态、拒单原因、取消时间
        Orders orders = new Orders();
        orders.setId(ordersDB.getId());
        orders.setStatus(Orders.CANCELLED);
        orders.setRejectionReason(ordersRejectionDTO.getRejectionReason());
        orders.setCancelTime(LocalDateTime.now());

        orderMapper.update(orders);

        // 回补库存（下单时扣过）
        restoreStockByOrderId(ordersDB.getId());

    }

    @Override
    @Transactional   // 取消 + 回补库存，一起成功或一起回滚
    public void cancel(OrdersCancelDTO ordersCancelDTO) throws Exception {
        // 根据id查询订单
        Orders ordersDB = orderMapper.getById(ordersCancelDTO.getId());

        //支付状态
        Integer payStatus = ordersDB.getPayStatus();

        // 已是取消状态则不再重复回补库存（防止库存虚增）
        boolean needRestore = ordersDB != null && !Orders.CANCELLED.equals(ordersDB.getStatus());

        // 管理端取消订单需要退款，根据订单id更新订单状态、取消原因、取消时间
        Orders orders = new Orders();
        orders.setId(ordersCancelDTO.getId());
        orders.setStatus(Orders.CANCELLED);
        orders.setCancelReason(ordersCancelDTO.getCancelReason());
        orders.setCancelTime(LocalDateTime.now());
        orderMapper.update(orders);

        // 回补库存（下单时扣过）
        if (needRestore) {
            restoreStockByOrderId(ordersCancelDTO.getId());
        }

    }

    @Override
    public void delivery(Long id) {
        // 根据id查询订单
        Orders ordersDB = orderMapper.getById(id);

        // 校验订单是否存在，并且状态为3
        if (ordersDB == null || !ordersDB.getStatus().equals(Orders.CONFIRMED)) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }

        Orders orders = new Orders();
        orders.setId(ordersDB.getId());
        // 更新订单状态,状态转为派送中
        orders.setStatus(Orders.DELIVERY_IN_PROGRESS);

        orderMapper.update(orders);

    }

    @Override
    public void complete(Long id) {
        // 根据id查询订单
        Orders ordersDB = orderMapper.getById(id);

        // 校验订单是否存在，并且状态为4
        if (ordersDB == null || !ordersDB.getStatus().equals(Orders.DELIVERY_IN_PROGRESS)) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }

        Orders orders = new Orders();
        orders.setId(ordersDB.getId());
        // 更新订单状态,状态转为完成
        orders.setStatus(Orders.COMPLETED);
        orders.setDeliveryTime(LocalDateTime.now());

        orderMapper.update(orders);

    }


    @Override
    public List<Orders> listTodayReservation(LocalDateTime time) {
        OrdersPageQueryDTO dto = new OrdersPageQueryDTO();
        dto.setStatus(Orders.RESERVATION);          // 只查"预约中"(0)
        dto.setReservationBegin(time);              // 左闭：[time, ...)
        dto.setReservationEnd(time.plusDays(1));    // 右开：[..., time+1天)
        // 直接调 mapper，不经过 conditionSearch（避免 PageHelper.startPage 把结果分页掉）
        return orderMapper.pageQuery(dto);
    }

    @Override
    public List<Orders> listPendingReservationReminders(LocalDateTime deadline) {
        OrdersPageQueryDTO dto = new OrdersPageQueryDTO();
        dto.setStatus(Orders.RESERVATION);          // 仍处于"预约中"= 店员还没接单
        dto.setReservationEnd(deadline);            // reservation_time < deadline（不设下界，超时未处理的也提醒）
        return orderMapper.pageQuery(dto);
    }

    //获order，转化ordervo
    private List<OrderVO> getOrderVOList(Page<Orders> page) {
        List<OrderVO> list=new ArrayList<>();
        List<Orders>  ordersList=page.getResult();
        for(Orders orders:ordersList){
            // 将共同字段复制到OrderVO
            OrderVO orderVO = new OrderVO();
            BeanUtils.copyProperties(orders, orderVO);
            String orderDishes = getOrderDishesStr(orders);

            // 将订单菜品信息封装到orderVO中，并添加到orderVOList
            orderVO.setOrderDishes(orderDishes);
            list.add(orderVO);

        }
        return list;
    }

    /**
     * 拼接订单上的完整收货地址：省 + 市 + 区 + 详细地址 + 房间地址
     * （地址簿里省市区/门牌号是分开存的，订单只保留一个 address 字段）
     */
    private String buildFullAddress(AddressBook addressBook) {
        StringBuilder sb = new StringBuilder();
        if (addressBook.getProvinceName() != null) {
            sb.append(addressBook.getProvinceName());
        }
        if (addressBook.getCityName() != null) {
            sb.append(addressBook.getCityName());
        }
        if (addressBook.getDistrictName() != null) {
            sb.append(addressBook.getDistrictName());
        }
        if (addressBook.getDetail() != null) {
            sb.append(addressBook.getDetail());
        }
        if (addressBook.getRoomDetail() != null && !addressBook.getRoomDetail().trim().isEmpty()) {
            sb.append(" ").append(addressBook.getRoomDetail().trim());
        }
        return sb.toString();
    }

    /**
     * 根据订单id获取菜品信息字符串
     *
     * @param orders
     * @return
     */
    private String getOrderDishesStr(Orders orders) {
        // 查询订单菜品详情信息（订单中的菜品和数量）
        List<OrderDetail> orderDetailList = orderDetailMapper.getByOrdersId(orders.getId());

        // 将每一条订单菜品信息拼接为字符串（格式：宫保鸡丁*3；）
        List<String> orderDishList = orderDetailList.stream().map(x -> {
            String orderDish = x.getName() + "*" + x.getNumber() + ";";
            return orderDish;
        }).collect(Collectors.toList());

        // 将该订单对应的所有菜品信息拼接在一起
        return String.join("", orderDishList);
    }

    //客户催单
    @Override
    public void reminder(Long id) {
        // 根据id查询订单
        Orders ordersDB = orderMapper.getById(id);

        // 校验订单是否存在，并且状态为4
        if (ordersDB == null) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }

        Map map=new HashMap<>();
        map.put("type",2);//1.来单提醒 2.客户催单
        map.put("orderId",id);
        map.put("content","订单号:"+ordersDB.getNumber());
        String json =JSON.toJSONString(map);
        webSocketServer.sendToAllClient(json);


    }


}
