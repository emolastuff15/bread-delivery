package com.sky.mapper;

import com.github.pagehelper.Page;
import com.sky.annotation.AutoFill;
import com.sky.dto.DishPageQueryDTO;
import com.sky.entity.Dish;
import com.sky.entity.OrderDetail;
import com.sky.enumeration.OperationType;
import com.sky.vo.DishVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface DishMapper {

    /**
     * 根据分类id查询菜品数量
     * @param categoryId
     * @return
     */
    @Select("select count(id) from dish where category_id = #{categoryId}")
    Integer countByCategoryId(Long categoryId);

    /**
     * 插入菜品数据
     * @param dish
     * @return
     */
    @AutoFill(value = OperationType.INSERT)
    void insert(Dish dish);

    Page<DishVO> pageQuery(DishPageQueryDTO dishPageQueryDTO);

    int selectAll(List<Long> ids);

    void delete(List<Long> ids);

    @Select("select * from dish where id = #{id}")
    Dish getById(Long id);

    @AutoFill(value = OperationType.UPDATE)
    void update(Dish dish);

    List<Dish> list(Dish dish);

    /**
     * 根据套餐id查询菜品
     * @param setmealId
     * @return
     */
    @Select("select a.* from dish a left join setmeal_dish b on a.id = b.dish_id where b.setmeal_id = #{setmealId}")
    List<Dish> getBySetmealId(Long setmealId);


    /**
     * 根据条件统计菜品数量
     * @param map
     * @return
     */
    Integer countByMap(Map map);

    int updateDishNumber(OrderDetail orderDetail);

    /**
     * 回补库存（订单取消/超时/拒单时调用）：number = number + 份数
     * @param orderDetail 订单明细（用 dishId 和 number）
     * @return 影响行数
     */
    int restoreDishNumber(OrderDetail orderDetail);

    /**
     * 在现有库存上增加（营业中也能操作）
     * @return 影响行数
     */
    int addDishStock(@Param("id") Long id, @Param("number") Integer number);

    /**
     * 直接设置库存（业务层已校验：仅店铺打烊或菜品停售时允许）
     * @return 影响行数
     */
    int setDishStock(@Param("id") Long id, @Param("number") Integer number);
}
