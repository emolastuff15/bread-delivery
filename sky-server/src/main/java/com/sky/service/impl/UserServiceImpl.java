package com.sky.service.impl;

import com.sky.constant.MessageConstant;
import com.sky.dto.UserAccountLoginDTO;
import com.sky.dto.UserPasswordEditDTO;
import com.sky.dto.UserRegisterDTO;
import com.sky.entity.User;
import com.sky.exception.AccountNotFoundException;
import com.sky.exception.BaseException;
import com.sky.exception.PasswordErrorException;
import com.sky.mapper.UserMapper;
import com.sky.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service
@Slf4j
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public User register(UserRegisterDTO userRegisterDTO) {
        //1、校验用户名是否已存在
        String username = userRegisterDTO.getUsername();
        User existed = userMapper.getByUsername(username);
        if (existed != null) {
            throw new BaseException("用户名已存在");
        }

        //2、构造用户并保存（密码MD5加密）
        User user = new User();
        BeanUtils.copyProperties(userRegisterDTO, user);
        user.setPassword(DigestUtils.md5DigestAsHex(userRegisterDTO.getPassword().getBytes(StandardCharsets.UTF_8)));
        user.setCreateTime(LocalDateTime.now());
        userMapper.insert(user);
        log.info("新用户注册成功：username={}", username);
        return user;
    }

    @Override
    public User login(UserAccountLoginDTO userAccountLoginDTO) {
        String username = userAccountLoginDTO.getUsername();
        String password = userAccountLoginDTO.getPassword();

        //1、根据用户名查询用户
        User user = userMapper.getByUsername(username);
        if (user == null) {
            throw new AccountNotFoundException(MessageConstant.ACCOUNT_NOT_FOUND);
        }

        //2、比对密码（MD5）
        String md5Password = DigestUtils.md5DigestAsHex(password.getBytes(StandardCharsets.UTF_8));
        if (!md5Password.equals(user.getPassword())) {
            throw new PasswordErrorException(MessageConstant.PASSWORD_ERROR);
        }

        return user;
    }

    @Override
    public void editPassword(Long userId, UserPasswordEditDTO userPasswordEditDTO) {
        User user = userMapper.getById(userId);
        if (user == null) {
            throw new AccountNotFoundException(MessageConstant.ACCOUNT_NOT_FOUND);
        }

        //1、校验旧密码
        String oldMd5 = DigestUtils.md5DigestAsHex(userPasswordEditDTO.getOldPassword().getBytes(StandardCharsets.UTF_8));
        if (!oldMd5.equals(user.getPassword())) {
            throw new PasswordErrorException(MessageConstant.PASSWORD_ERROR);
        }

        //2、更新新密码
        String newMd5 = DigestUtils.md5DigestAsHex(userPasswordEditDTO.getNewPassword().getBytes(StandardCharsets.UTF_8));
        userMapper.updatePassword(userId, newMd5);
        log.info("用户修改密码成功：userId={}", userId);
    }
}
