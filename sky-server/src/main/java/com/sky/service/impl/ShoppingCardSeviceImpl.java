package com.sky.service.impl;

import com.sky.context.BaseContext;
import com.sky.dto.ShoppingCartDTO;
import com.sky.entity.Dish;
import com.sky.entity.Setmeal;
import com.sky.entity.ShoppingCart;
import com.sky.mapper.DishMapper;
import com.sky.mapper.SetmealMapper;
import com.sky.mapper.ShoppingCardMapper;
import com.sky.service.ShoppingCardService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class ShoppingCardSeviceImpl implements ShoppingCardService {
    @Autowired
    private ShoppingCardMapper shoppingCardMapper;

    @Autowired
    private DishMapper dishMapper;

    @Autowired
    private SetmealMapper setmealMapper;
    @Override
    public void addShoppingCard(ShoppingCartDTO shoppingCartDTO) {
        ShoppingCart shoppingCart=new ShoppingCart();
        BeanUtils.copyProperties(shoppingCartDTO,shoppingCart);
        Long curentId=BaseContext.getCurrentId();
        log.info("获取目前id{}",curentId);
        shoppingCart.setUserId(curentId);
        List<ShoppingCart> shoppingCartList=shoppingCardMapper.list(shoppingCart);
        if(shoppingCartList!=null && !shoppingCartList.isEmpty()){
            ShoppingCart cart=shoppingCartList.get(0);
            cart.setNumber(cart.getNumber()+1);
            shoppingCardMapper.update(cart);
        }else{
            Long dishId=shoppingCartDTO.getDishId();
            if(dishId!=null){
                Dish dish=dishMapper.getById(dishId);
                shoppingCart.setName(dish.getName());
                shoppingCart.setImage(dish.getImage());
                shoppingCart.setAmount(dish.getPrice());

            }else {
                Long setmealId = shoppingCartDTO.getSetmealId();
                Setmeal setmeal=setmealMapper.getById(setmealId);
                shoppingCart.setName(setmeal.getName());
                shoppingCart.setImage(setmeal.getImage());
                shoppingCart.setAmount(setmeal.getPrice());

            }
            shoppingCart.setNumber(1);
            shoppingCart.setCreateTime(LocalDateTime.now());
            shoppingCardMapper.insert(shoppingCart);

        }

    }

    @Override
    public void subShoppingCard(ShoppingCartDTO shoppingCartDTO) {
        ShoppingCart shoppingCart = new ShoppingCart();
        BeanUtils.copyProperties(shoppingCartDTO, shoppingCart);
        shoppingCart.setUserId(BaseContext.getCurrentId());

        List<ShoppingCart> shoppingCartList = shoppingCardMapper.list(shoppingCart);
        if (shoppingCartList == null || shoppingCartList.isEmpty()) {
            return;
        }

        ShoppingCart cart = shoppingCartList.get(0);
        if (cart.getNumber() > 1) {
            cart.setNumber(cart.getNumber() - 1);
            shoppingCardMapper.update(cart);
        } else {
            shoppingCardMapper.deleteById(cart.getId());
        }
    }

    @Override
    public List<ShoppingCart> show() {
        Long userId=BaseContext.getCurrentId();
        log.info("当前查找的用户是{}",userId);
        ShoppingCart shoppingCart= ShoppingCart.builder()
                        .userId(userId)
                        .build();
        List<ShoppingCart> list= shoppingCardMapper.list(shoppingCart);
        return list;
    }

    @Override
    public void cleanShoppingcart() {
        Long userId=BaseContext.getCurrentId();
        shoppingCardMapper.deleteByUserId(userId);
    }
}
