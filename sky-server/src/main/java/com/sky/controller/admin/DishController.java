package com.sky.controller.admin;

import com.sky.dto.DishDTO;
import com.sky.dto.DishPageQueryDTO;
import com.sky.dto.DishStockDTO;
import com.sky.entity.Dish;
import com.sky.result.PageResult;
import com.sky.result.Result;
import com.sky.service.DishService;
import com.sky.vo.DishVO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/dish")
@Api(tags = "菜品相关接口")
@Slf4j
public class DishController {
    @Autowired
    private DishService dishService;

    @PostMapping()
    @ApiOperation(value = "新增菜品")
    public Result save(@RequestBody DishDTO dishDTO){
        log.info("正在添加菜品:{}",dishDTO);
        dishService.saveWithFlavour(dishDTO);
        return Result.success("YES");
    }
    @ApiOperation("菜品的分页查询")
    @GetMapping("/page")
    public Result<PageResult> page(DishPageQueryDTO dishPageQueryDTO){
        log.info("菜品分类查询:{}",dishPageQueryDTO);
        PageResult pageResult=dishService.pageQuery(dishPageQueryDTO);
        return Result.success(pageResult);
    }
    @ApiOperation("菜品的批量删除")
    @DeleteMapping
    public Result delete(@RequestParam List<Long> ids){
        log.info("菜品删除:{}",ids);
        dishService.deleteBath(ids);
        return Result.success();
    }
    @GetMapping("{id}")
    @ApiOperation("根据id查询商品")
    public Result<DishVO> getById(@PathVariable Long id){
        log.info("根据id查询菜品:{}",id);
        DishVO dishVO= dishService.getByIdWithFlavor(id);
        return Result.success(dishVO);
    }
    @ApiOperation("修改菜品")
    @PutMapping()
    public Result update(@RequestBody DishDTO dishDTO){
        log.info("上传修改后的菜品:{}",dishDTO);
        dishService.updateWithFlavor(dishDTO);
        return Result.success();
    }

    /**
     * 根据分类id查询菜品
     * @param categoryId
     * @return
     */
    @GetMapping("/list")
    @ApiOperation("根据分类id查询菜品")
    public Result<List<Dish>> list(Long categoryId){
        List<Dish> list = dishService.list(categoryId);
        return Result.success(list);
    }

    @PutMapping("/stock/add")
    @ApiOperation("添加菜品库存（只能增）")
    public Result addStock(@RequestBody DishStockDTO dishStockDTO){
        log.info("添加菜品库存:{}",dishStockDTO);
        dishService.addStock(dishStockDTO);
        return Result.success();
    }

    @PutMapping("/stock")
    @ApiOperation("编辑菜品库存（仅停售或打烊时可用）")
    public Result editStock(@RequestBody DishStockDTO dishStockDTO){
        log.info("编辑菜品库存:{}",dishStockDTO);
        dishService.editStock(dishStockDTO);
        return Result.success();
    }
}
