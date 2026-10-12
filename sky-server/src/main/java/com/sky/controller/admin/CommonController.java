package com.sky.controller.admin;

import com.sky.config.MinioBucketInitializer;
import com.sky.properties.MinIoProperties;
import com.sky.result.Result;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * 通用接口（管理端）
 *
 * 上传流程：文件字节存入 MinIO → 返回对象的【永久直链】，前端再把这个 URL 字符串
 * 作为 dish.image / setmeal.image 提交保存。
 *
 * 注意：不再返回预签名 URL（那玩意 7 天过期，存进数据库后图片会失效）。
 */
@RestController
@RequestMapping("/admin/common")
@Api(tags = "通用接口")
@Slf4j
public class CommonController {

    @Autowired
    private MinioClient minioClient;

    @Autowired
    private MinIoProperties minioProperties;

    @Autowired
    private MinioBucketInitializer minioBucketInitializer;

    @PostMapping("/upload")
    @ApiOperation(value = "上传文件")
    public Result<String> upload(MultipartFile file) throws Exception {
        String bucketName = minioProperties.getBucketName();

        String originalFilename = file.getOriginalFilename();
        String extension = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String objectName = UUID.randomUUID().toString() + extension;

        // 确保 bucket 存在且为公共读（幂等，启动时也会做一次）
        minioBucketInitializer.ensureBucketAndPublicRead();

        // 上传文件（真正的文件字节进 MinIO）
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(file.getInputStream(), file.getSize(), -1L)
                        .contentType(file.getContentType())
                        .build());

        // 返回永久直链，形如 http://127.0.0.1:9000/photo/xxxx.jpg
        String imageUrl = minioBucketInitializer.buildPublicUrl(objectName);
        log.info("文件上传成功：{}", imageUrl);
        return Result.success(imageUrl);
    }
}
