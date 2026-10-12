package com.sky.dto;

import com.sky.entity.DishFlavor;
import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
public class DishDTO implements Serializable {

    private Long id;
    //菜品名称
    private String name;
    //菜品分类id
    private Long categoryId;
    //菜品价格
    private BigDecimal price;
    //图片
    private String image;
    //描述信息
    private String description;
    //0 停售 1 起售
    private Integer status;
    //口味
    private List<DishFlavor> flavors = new ArrayList<>();
    /**
     * 库存（份数）。
     * 用包装类型：新增时不传 = null（后端默认给 100），传 0 才是"真的 0 份"；
     * 修改菜品时该字段不参与更新（库存只能走 /admin/dish/stock* 接口）。
     */
    private Integer number;


}
