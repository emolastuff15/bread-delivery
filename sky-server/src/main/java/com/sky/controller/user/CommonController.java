package com.sky.controller.user;

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
 * 通用接口（用户端）
 * 与管理端一致：上传后返回对象的【永久直链】而非会过期的预签名 URL。
 */
@RestController("userCommonController")
@RequestMapping("/user/common")
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

        // 确保 bucket 存在且为公共读（幂等）
        minioBucketInitializer.ensureBucketAndPublicRead();

        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(file.getInputStream(), file.getSize(), -1L)
                        .contentType(file.getContentType())
                        .build());

        String imageUrl = minioBucketInitializer.buildPublicUrl(objectName);
        log.info("文件上传成功：{}", imageUrl);
        return Result.success(imageUrl);
    }
}
