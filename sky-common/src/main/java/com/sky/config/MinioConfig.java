package com.sky.config;

import com.sky.properties.MinIoProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.minio.MinioClient;

@Configuration
public class MinioConfig {



        @Autowired
        private MinIoProperties minioProperties;

        @Bean
        public MinioClient minioClient() {
            return MinioClient.builder()
                    .endpoint(minioProperties.getEndpoint())
                    .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                    .build();
        }
    }

