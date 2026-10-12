package com.sky.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * C端用户注册
 */
@Data
public class UserRegisterDTO implements Serializable {

    //用户名
    private String username;

    //密码
    private String password;

    //姓名
    private String name;

    //手机号
    private String phone;
}
