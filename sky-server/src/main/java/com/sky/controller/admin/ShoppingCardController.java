package com.sky.controller.admin;

import com.sky.dto.ShoppingCartDTO;
import com.sky.entity.ShoppingCart;
import com.sky.result.Result;
import com.sky.service.ShoppingCardService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController("adminShoppingCardController")
@RequestMapping("/admin/shoppingCard")
@Slf4j
@Api(tags = "管理员调试用户端接口")
public class ShoppingCardController {
    @Autowired
    private ShoppingCardService shoppingCardService;

    @PostMapping("/add")
    @ApiOperation("添加购物车")
    public Result add(@RequestBody ShoppingCartDTO shoppingCartDTO){
        log.info("添加购物车，商品信息:{}",shoppingCartDTO);
        shoppingCardService.addShoppingCard(shoppingCartDTO);
        return Result.success();

    }
    @ApiOperation("展示购物车" )
    @PostMapping("/list")
    public Result<List<ShoppingCart>> list(){
        List<ShoppingCart> list=shoppingCardService.show();
        return Result.success(list);

    }

}
