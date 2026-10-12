package com.sky.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * C端用户修改密码
 */
@Data
public class UserPasswordEditDTO implements Serializable {

    //旧密码
    private String oldPassword;

    //新密码
    private String newPassword;
}
