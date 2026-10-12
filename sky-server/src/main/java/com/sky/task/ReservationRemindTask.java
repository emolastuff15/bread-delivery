package com.sky.task;

import com.alibaba.fastjson.JSON;
import com.sky.entity.Orders;
import com.sky.service.OrderService;
import com.sky.websocket.WebSocketServer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 预约单提前提醒任务（设计B：任务纯只读，不改订单状态）
 *
 * 规则：
 *   每分钟扫描一次「仍处于"预约中"、且预约时间已进入 1 小时窗口」的预约单；
 *   有就汇总推一条 WebSocket 给管理端，没有就什么都不做；
 *   店员在管理端调用现有接单接口（PUT /admin/order/confirm）后 status 变为已接单，
 *   下次扫描自然不再命中，提醒自动停止。
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ReservationRemindTask {

    private final OrderService orderService;
    private final WebSocketServer webSocketServer;

    /** 提前提醒窗口（分钟） */
    private static final long REMIND_AHEAD_MINUTES = 60;

    /** 管理端消息类型：预约提醒 */
    private static final int MSG_TYPE_RESERVATION_REMIND = 3;

    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Scheduled(cron = "0 * * * * ?", zone = "Asia/Shanghai")
    public void remindReservation() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadline = now.plusMinutes(REMIND_AHEAD_MINUTES);
        try {
            List<Orders> pending = orderService.listPendingReservationReminders(deadline);
            if (pending == null || pending.isEmpty()) {
                // 没有未处理的预约单：不推送，避免打扰
                return;
            }

            // 统计：已超时未处理的数量
            long overdueCount = pending.stream()
                    .filter(o -> o.getReservationTime() != null && o.getReservationTime().isBefore(now))
                    .count();
            int upcomingCount = pending.size() - (int) overdueCount;

            // 最近一单还有多少分钟（负数表示已超时）
            LocalDateTime earliest = pending.stream()
                    .map(Orders::getReservationTime)
                    .filter(t -> t != null)
                    .min(LocalDateTime::compareTo)
                    .orElse(now);

            String content = "未来1小时内 " + upcomingCount + " 单预约待处理";
            if (overdueCount > 0) {
                content = content + "，另有 " + overdueCount + " 单已超时未处理";
            }

            Map<String, Object> message = new HashMap<>();
            message.put("type", MSG_TYPE_RESERVATION_REMIND);
            message.put("count", pending.size());
            message.put("upcomingCount", upcomingCount);
            message.put("overdueCount", overdueCount);
            message.put("earliestMinutes", Duration.between(now, earliest).toMinutes());
            message.put("content", content);
            message.put("pushTime", now.format(TIME_FORMATTER));
            message.put("orders", buildBriefOrders(pending));

            // 只推管理端，避免推给 C 端顾客
            webSocketServer.sendToAdminClient(JSON.toJSONString(message));
            log.info("预约提醒已推送：{}（订单id：{}）", content,
                    pending.stream().map(Orders::getId).collect(java.util.stream.Collectors.toList()));
        } catch (Exception e) {
            log.error("预约提醒任务执行异常", e);
        }
    }

    /**
     * 精简订单信息：不查菜品明细，避免 N+1 查询
     */
    private List<Map<String, Object>> buildBriefOrders(List<Orders> pending) {
        List<Map<String, Object>> briefList = new ArrayList<>(pending.size());
        for (Orders order : pending) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", order.getId());
            item.put("number", order.getNumber());
            item.put("reservationTime",
                    order.getReservationTime() == null ? null : order.getReservationTime().format(TIME_FORMATTER));
            item.put("consignee", order.getConsignee());
            item.put("phone", order.getPhone());
            item.put("amount", order.getAmount());
            briefList.add(item);
        }
        return briefList;
    }
}
