package com.sky.config;

import com.sky.properties.MinIoProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

/**
 * MinIO bucket 初始化 + 公共访问地址
 *
 * 背景：原实现返回的是"预签名 URL"（带签名、7 天过期），把它存进数据库后，
 *      一周后图片会全部 403。这里改为：
 *        1) 启动时确保 bucket 存在，并把 bucket 策略设为"公共读"
 *        2) 上传后返回对象的【永久直链】：{endpoint}/{bucket}/{objectName}
 *
 * 注意：如果 MinIO 未启动，启动阶段的初始化只打警告，不影响应用启动；
 *      真正上传时会再确保一次（幂等）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MinioBucketInitializer {

    private final MinioClient minioClient;
    private final MinIoProperties minioProperties;

    /** bucket 是否已确认存在 */
    private volatile boolean bucketReady = false;
    /** 公共读策略是否已处理过（成功或已记录失败，避免每次上传都重试） */
    private volatile boolean policyHandled = false;

    @PostConstruct
    public void init() {
        try {
            ensureBucketAndPublicRead();
        } catch (Exception e) {
            log.warn("MinIO 初始化未完成（MinIO 可能未启动），首次上传时会重试：{}", e.getMessage());
        }
    }

    /**
     * 幂等：确保 bucket 存在且为公共读。
     * 上传前调用即可，重复调用无副作用。
     */
    public synchronized void ensureBucketAndPublicRead() throws Exception {
        String bucket = minioProperties.getBucketName();
        if (bucket == null || bucket.trim().isEmpty()) {
            throw new IllegalStateException("未配置 sky.minio.bucket-name");
        }

        if (!bucketReady) {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("已创建 MinIO bucket：{}", bucket);
            }
            bucketReady = true;
        }

        if (!policyHandled) {
            try {
                minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                        .bucket(bucket)
                        .config(publicReadPolicy(bucket))
                        .build());
                log.info("MinIO bucket [{}] 已设为公共读，图片可用永久直链访问", bucket);
            } catch (Exception e) {
                // 例如账号无设置策略权限；若 bucket 已被手动设为公共读可忽略
                log.warn("设置 bucket [{}] 公共读策略失败：{}", bucket, e.getMessage());
            }
            policyHandled = true;
        }
    }

    /**
     * 拼接对象的永久访问地址（不再带签名、不会过期）
     * 若配置了 sky.minio.public-base-url，则用它（便于浏览器/手机从其他主机访问）
     */
    public String buildPublicUrl(String objectName) {
        String base = minioProperties.getPublicBaseUrl();
        if (base == null || base.trim().isEmpty()) {
            base = minioProperties.getEndpoint();
        }
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + minioProperties.getBucketName() + "/" + objectName;
    }

    /** 只读权限的 bucket 策略：任何人均可 GET 对象，但不可列举/写入 */
    private String publicReadPolicy(String bucket) {
        return "{\"Version\":\"2012-10-17\",\"Statement\":[{"
                + "\"Effect\":\"Allow\","
                + "\"Principal\":{\"AWS\":[\"*\"]},"
                + "\"Action\":[\"s3:GetObject\"],"
                + "\"Resource\":[\"arn:aws:s3:::" + bucket + "/*\"]"
                + "}]}";
    }
}
