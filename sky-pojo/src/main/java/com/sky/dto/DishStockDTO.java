package com.sky.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * 菜品库存操作
 */
@Data
public class DishStockDTO implements Serializable {

    //菜品id
    private Long id;

    //库存数量：
    //  添加库存时 = 要增加的份数（必须 > 0）
    //  编辑库存时 = 要设置的目标库存（必须 >= 0）
    private Integer number;
}
