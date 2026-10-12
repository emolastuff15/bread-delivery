package com.sky.service;

import com.sky.dto.UserAccountLoginDTO;
import com.sky.dto.UserPasswordEditDTO;
import com.sky.dto.UserRegisterDTO;

public interface UserService {

    /**
     * C端用户注册
     *
     * @return 注册成功的用户实体
     */
    com.sky.entity.User register(UserRegisterDTO userRegisterDTO);

    /**
     * C端用户账号密码登录
     */
    com.sky.entity.User login(UserAccountLoginDTO userAccountLoginDTO);

    /**
     * C端用户修改密码
     *
     * @param userId            当前登录用户id
     * @param userPasswordEditDTO 旧密码/新密码
     */
    void editPassword(Long userId, UserPasswordEditDTO userPasswordEditDTO);
}
