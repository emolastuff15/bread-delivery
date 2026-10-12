package com.sky.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "sky.minio")
public class MinIoProperties {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucketName;

    /**
     * 对外访问地址前缀（可选）。
     * 不配置时使用 endpoint；当浏览器/手机不在同一台机器上时，
     * 需要把它配成外部可访问的地址（如 nginx 反代的 MinIO 域名）。
     */
    private String publicBaseUrl;
}