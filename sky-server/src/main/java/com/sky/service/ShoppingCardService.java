package com.sky.service;

import com.sky.dto.ShoppingCartDTO;
import com.sky.entity.ShoppingCart;

import java.util.List;

public interface ShoppingCardService {
    //动态条件查询
    void addShoppingCard(ShoppingCartDTO shoppingCartDTO);

    //购物车减一（数量为1时删除该条记录）
    void subShoppingCard(ShoppingCartDTO shoppingCartDTO);

    List<ShoppingCart> show();

    void cleanShoppingcart();
}
