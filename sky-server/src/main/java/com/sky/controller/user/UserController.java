package com.sky.controller.user;

import com.sky.constant.JwtClaimsConstant;
import com.sky.context.BaseContext;
import com.sky.dto.UserAccountLoginDTO;
import com.sky.dto.UserPasswordEditDTO;
import com.sky.dto.UserRegisterDTO;
import com.sky.entity.User;
import com.sky.properties.JwtProperties;
import com.sky.result.Result;
import com.sky.service.UserService;
import com.sky.utils.JwtUtil;
import com.sky.vo.UserLoginVO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * C端用户账号接口：注册 / 用户名密码登录 / 修改密码
 */
@RestController("userUserController")
@RequestMapping("/user/user")
@Api(tags = "C端-用户账号接口")
@Slf4j
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtProperties jwtProperties;

    /**
     * 用户注册（注册成功后直接返回token，实现免登录）
     */
    @PostMapping("/register")
    @ApiOperation("用户注册")
    public Result<UserLoginVO> register(@RequestBody UserRegisterDTO userRegisterDTO) {
        log.info("用户注册：{}", userRegisterDTO.getUsername());
        User user = userService.register(userRegisterDTO);

        //注册成功后签发token，实现免登录
        UserLoginVO userLoginVO = buildLoginVO(user);
        return Result.success(userLoginVO);
    }

    /**
     * 用户名密码登录
     */
    @PostMapping("/login")
    @ApiOperation("用户名密码登录")
    public Result<UserLoginVO> login(@RequestBody UserAccountLoginDTO userAccountLoginDTO) {
        log.info("用户登录：{}", userAccountLoginDTO.getUsername());
        User user = userService.login(userAccountLoginDTO);
        UserLoginVO userLoginVO = buildLoginVO(user);
        return Result.success(userLoginVO);
    }

    /**
     * 修改密码（需登录，从token获取用户id）
     */
    @PutMapping("/editPassword")
    @ApiOperation("修改密码")
    public Result editPassword(@RequestBody UserPasswordEditDTO userPasswordEditDTO) {
        Long userId = BaseContext.getCurrentId();
        log.info("用户修改密码：userId={}", userId);
        userService.editPassword(userId, userPasswordEditDTO);
        return Result.success();
    }

    /**
     * 构建登录返回VO（生成jwt令牌）
     */
    private UserLoginVO buildLoginVO(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(JwtClaimsConstant.USER_ID, user.getId());
        claims.put(JwtClaimsConstant.USERNAME, user.getUsername());
        String token = JwtUtil.createJWT(
                jwtProperties.getUserSecretKey(),
                jwtProperties.getUserTtl(),
                claims);

        return UserLoginVO.builder()
                .id(user.getId())
                .openid(user.getOpenid())
                .username(user.getUsername())
                .name(user.getName())
                .token(token)
                .build();
    }
}
