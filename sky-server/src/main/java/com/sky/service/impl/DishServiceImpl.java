package com.sky.service.impl;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.sky.constant.MessageConstant;
import com.sky.constant.StatusConstant;
import com.sky.dto.DishDTO;
import com.sky.dto.DishPageQueryDTO;
import com.sky.dto.DishStockDTO;
import com.sky.entity.Dish;
import com.sky.entity.DishFlavor;
import com.sky.exception.BaseException;
import com.sky.exception.DeletionNotAllowedException;
import com.sky.mapper.DishFlavourMapper;
import com.sky.mapper.DishMapper;
import com.sky.mapper.SetmealDishMapper;
import com.sky.result.PageResult;
import com.sky.service.DishService;
import com.sky.vo.DishVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class DishServiceImpl implements DishService {

    /** 新增菜品时的默认库存（dish.number 数据库默认是 0，会导致新菜无法下单，这里给个初始值） */
    private static final int DEFAULT_DISH_STOCK = 100;

    @Autowired
    private DishMapper dishMapper;
    @Autowired
    private DishFlavourMapper dishFlavourMapper;
    @Autowired
    private SetmealDishMapper setmealDishMapper;
    @Autowired
    private RedisTemplate redisTemplate;

    @Transactional
    @Override
    //新增菜品和口味
    public void saveWithFlavour(DishDTO dishDTO) {
        Dish dish=new Dish();
        BeanUtils.copyProperties(dishDTO,dish);
        //库存：不传默认给 100，传了就必须 >= 0（dish.number 是 NOT NULL）
        Integer stock = dishDTO.getNumber();
        if(stock == null){
            dish.setNumber(DEFAULT_DISH_STOCK);
        }else if(stock < 0){
            throw new BaseException(MessageConstant.DISH_STOCK_NUMBER_INVALID);
        }
        dishMapper.insert(dish);//获取到主键的id
        Long dishId=dish.getId();

        List<DishFlavor> flavours=dishDTO.getFlavors();
        if(flavours != null && !flavours.isEmpty()){
            flavours.forEach(dishFlavor -> {
                dishFlavor.setDishId(dishId);
            });
            dishFlavourMapper.insertBatch(flavours);
        }
    }

    @Override
    public PageResult pageQuery(DishPageQueryDTO dishPageQueryDTO) {
        PageHelper.startPage(dishPageQueryDTO.getPage(),dishPageQueryDTO.getPageSize());
        Page<DishVO> page =dishMapper.pageQuery(dishPageQueryDTO);
        return new PageResult(page.getTotal(), page.getResult());
    }

    @Transactional
    @Override
    public void deleteBath(List<Long> ids) {
        int count= dishMapper.selectAll(ids);
        if(count>0){

            List<Long> setmealids = setmealDishMapper.getSetmealIdsByDishIds(ids);
            if(setmealids!=null && !setmealids.isEmpty()){
                throw new DeletionNotAllowedException(MessageConstant.DISH_BE_RELATED_BY_SETMEAL);
            }
            dishMapper.delete(ids);
            dishFlavourMapper.deleteBatchByDishIds(ids);
            return ;
        }else return ;

    }

    @Override
    public DishVO getByIdWithFlavor(Long id) {
        Dish dish= dishMapper.getById(id);
        List<DishFlavor> dishFlavors= dishFlavourMapper.getByDishId(id);
        DishVO dishVo=new DishVO();
        BeanUtils.copyProperties(dish,dishVo);
        dishVo.setFlavors(dishFlavors);
        return dishVo;
    }

    @Override
    public void updateWithFlavor(DishDTO dishDTO) {
        Dish dish=new Dish();
        BeanUtils.copyProperties(dishDTO,dish);
        dishMapper.update(dish);
        Long dishId=dish.getId();

        dishFlavourMapper.deleteByDishIds(dishDTO.getId());
        List<DishFlavor> flavours=dishDTO.getFlavors();
        if(flavours != null && !flavours.isEmpty()){
            flavours.forEach(dishFlavor -> {
                dishFlavor.setDishId(dishId);
            });
            dishFlavourMapper.insertBatch(flavours);
        }

    }

    /**
     * 条件查询菜品和口味
     * @param dish
     * @return
     */
    public List<DishVO> listWithFlavor(Dish dish) {
        List<Dish> dishList = dishMapper.list(dish);

        List<DishVO> dishVOList = new ArrayList<>();

        for (Dish d : dishList) {
            DishVO dishVO = new DishVO();
            BeanUtils.copyProperties(d,dishVO);
            //库存属于商家经营信息，不下发给用户端
            dishVO.setNumber(null);

            //根据菜品id查询对应的口味
            List<DishFlavor> flavors = dishFlavourMapper.getByDishId(d.getId());

            dishVO.setFlavors(flavors);
            dishVOList.add(dishVO);
        }

        return dishVOList;
    }


    /**
     * 根据分类id查询菜品
     * @param categoryId
     * @return
     */
    public List<Dish> list(Long categoryId) {
        Dish dish = Dish.builder()
                .categoryId(categoryId)
                .status(StatusConstant.ENABLE)
                .build();
        return dishMapper.list(dish);
    }

    /**
     * 添加菜品库存
     * 营业中/已停售都允许，只能增加，不能减少
     */
    @Transactional
    @Override
    public void addStock(DishStockDTO dishStockDTO) {
        Long id = dishStockDTO.getId();
        Integer number = dishStockDTO.getNumber();
        if (id == null) {
            throw new BaseException(MessageConstant.DISH_NOT_FOUND);
        }
        if (number == null || number <= 0) {
            throw new BaseException(MessageConstant.DISH_STOCK_ADD_NUMBER_INVALID);
        }
        Dish dish = dishMapper.getById(id);
        if (dish == null) {
            throw new BaseException(MessageConstant.DISH_NOT_FOUND);
        }
        dishMapper.addDishStock(id, number);
        log.info("菜品[{}]添加库存:{},当前库存:{}", dish.getName(), number,
                dish.getNumber() == null ? number : dish.getNumber() + number);
    }

    /**
     * 编辑菜品库存（直接设置为目标值）
     * 只有【店铺已打烊】或【菜品已停售】时才允许，避免营业中把库存改小影响正在下的单
     */
    @Transactional
    @Override
    public void editStock(DishStockDTO dishStockDTO) {
        Long id = dishStockDTO.getId();
        Integer number = dishStockDTO.getNumber();
        if (id == null) {
            throw new BaseException(MessageConstant.DISH_NOT_FOUND);
        }
        if (number == null || number < 0) {
            throw new BaseException(MessageConstant.DISH_STOCK_NUMBER_INVALID);
        }
        Dish dish = dishMapper.getById(id);
        if (dish == null) {
            throw new BaseException(MessageConstant.DISH_NOT_FOUND);
        }

        boolean shopClosed = isShopClosed();
        boolean dishStopped = !StatusConstant.ENABLE.equals(dish.getStatus());
        if (!shopClosed && !dishStopped) {
            throw new BaseException(MessageConstant.DISH_STOCK_EDIT_FORBIDDEN);
        }

        dishMapper.setDishStock(id, number);
        log.info("菜品[{}]库存修改为:{}", dish.getName(), number);
    }

    /**
     * 店铺是否已打烊
     * Redis 中查不到营业状态时按“已打烊”处理，避免营业中误改库存
     */
    private boolean isShopClosed() {
        Object status = redisTemplate.opsForValue().get("SHOP_STATUS");
        return !StatusConstant.ENABLE.equals(status);
    }
}
