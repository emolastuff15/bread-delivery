package com.sky.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * C端用户账号密码登录
 */
@Data
public class UserAccountLoginDTO implements Serializable {

    //用户名
    private String username;

    //密码
    private String password;
}
