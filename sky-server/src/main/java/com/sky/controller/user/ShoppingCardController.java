package com.sky.controller.user;

import com.sky.dto.ShoppingCartDTO;
import com.sky.entity.ShoppingCart;
import com.sky.result.Result;
import com.sky.service.ShoppingCardService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("userShoppingCardController")
@RequestMapping("/user/shoppingCard")
@Slf4j
@Api(tags = "用户端接口")
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
    @PostMapping("/sub")
    @ApiOperation("购物车减一")
    public Result sub(@RequestBody ShoppingCartDTO shoppingCartDTO){
        log.info("购物车减一，商品信息:{}",shoppingCartDTO);
        shoppingCardService.subShoppingCard(shoppingCartDTO);
        return Result.success();
    }
    @ApiOperation("展示购物车" )
    @PostMapping("/list")
    public Result<List<ShoppingCart>> list(){
        List<ShoppingCart> list=shoppingCardService.show();
        return Result.success(list);

    }
    @DeleteMapping("/clean")
    @ApiOperation("清空购物车")
    public Result clean(){
        shoppingCardService.cleanShoppingcart();
        return Result.success();
    }

}
