package com.sky.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Redis 初始化
 *
 * 启动时做两件事：
 *  1. 探活：连不上（Redis 没启动）时只 WARN，不阻断应用启动，和 MinioBucketInitializer 保持一致；
 *  2. 初始化营业状态：Redis 里没有 SHOP_STATUS 键时写入默认值。
 *
 * 为什么必须有第 2 步：Redis 里没有这个键时，GET /user/shop/status 返回 null，
 * 而用户端 Home.tsx 的判断是 setShopOpen(s === 1) —— null 会被当成"已打烊"，
 * 于是店铺首页显示"店铺已打烊"、所有加购按钮 disabled，但管理员从没关过店。
 * 只在键不存在时写入，绝不覆盖管理员已经设置过的值。
 */
@Component
@Slf4j
public class RedisInitializer implements ApplicationRunner {

    /** 与 admin/ShopController、user/ShopController 里使用的键保持一致 */
    public static final String SHOP_STATUS_KEY = "SHOP_STATUS";

    @Autowired
    private RedisTemplate redisTemplate;

    /** 营业状态初始值：1=营业中 0=已打烊，可在 application.yml 用 sky.shop-status.default 覆盖 */
    @Value("${sky.shop-status.default:1}")
    private Integer defaultShopStatus;

    @Override
    public void run(ApplicationArguments args) {
        RedisConnection connection = null;
        try {
            // 1、探活
            connection = redisTemplate.getConnectionFactory().getConnection();
            log.info("Redis 连接正常：PING -> {}", connection.ping());

            // 2、初始化营业状态（幂等：只在缺失时写入）
            Object status = redisTemplate.opsForValue().get(SHOP_STATUS_KEY);
            if (status == null) {
                redisTemplate.opsForValue().set(SHOP_STATUS_KEY, defaultShopStatus);
                log.info("Redis 缺少 {} 键，已初始化为默认值 {}（{}）；可在 application.yml 的 sky.shop-status.default 调整",
                        SHOP_STATUS_KEY, defaultShopStatus, shopStatusDesc(defaultShopStatus));
            } else {
                log.info("Redis 营业状态已存在：{}（{}），保持不变", status, shopStatusDesc((Integer) status));
            }
        } catch (Exception e) {
            // Redis 不可用不阻断启动：营业状态读取处都有兜底（库存编辑按"已打烊"处理、用户端按"打烊"显示）
            log.warn("Redis 初始化未完成，Redis 未启动或不可用：{}", e.getMessage());
        } finally {
            if (connection != null) {
                try {
                    connection.close();
                } catch (Exception ignored) {
                    // 关闭失败无需处理
                }
            }
        }
    }

    private String shopStatusDesc(Integer status) {
        return status != null && status == 1 ? "营业中" : "已打烊";
    }
}
