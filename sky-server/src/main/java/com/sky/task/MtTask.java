package com.sky.task;

import com.sky.entity.Orders;
import com.sky.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component                 // ← 别忘了，@Scheduled 只对 Spring Bean 生效
@Slf4j
@RequiredArgsConstructor   // ← 生成含 final 字段的构造器，完成依赖注入
public class MtTask {

    private final OrderService orderService;

    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Shanghai")
    public void runAtMidnight() {
        long start = System.currentTimeMillis();
        LocalDateTime time = LocalDateTime.now();
        log.info("凌晨12点任务开始：{}", time);
        try {
            // 未来 24 小时内（今天）的预约单
            List<Orders> pages = orderService.listTodayReservation(time);
            log.info("未来24小时内的预约单共 {} 条", pages.size());
            for (Orders order : pages) {
                // 你的处理逻辑
            }
        } catch (Exception e) {
            log.error("凌晨12点任务执行异常", e);   // 自己兜住异常，方便排查
        } finally {
            log.info("凌晨12点任务结束，耗时 {} ms", System.currentTimeMillis() - start);
        }
    }
}