package com.sky.mapper;

import com.sky.entity.DishFlavor;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface DishFlavourMapper {
    void insertBatch(List<DishFlavor> flavours);

    void deleteBatchByDishIds(List<Long> ids);

    @Select("select * from dish_flavor where dish_id=#{id}")
    List<DishFlavor> getByDishId(Long id);

    @Delete("DELETE FROM dish_flavor WHERE dish_id =#{id}")
    void deleteByDishIds(Long id);
}
