package com.sky.controller.user;

import com.sky.entity.Category;
import com.sky.result.Result;
import com.sky.service.CategoryService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * C端-分类浏览接口
 *
 * ⚠️ 这里只保留顾客真正需要的一个接口：按类型查询分类。
 * 分类的新增/修改/删除/启停/分页查询属于管理端功能，统一放在
 * com.sky.controller.admin.CategoryController（/admin/category/**）。
 *
 * 之前这里误把管理端整套 CRUD 复制了过来（/user/category 下也有 POST/PUT/DELETE/status/page），
 * 而 /user/** 只校验用户端 JWT —— 任何注册顾客拿着自己的 token 就能增删改分类，
 * 属于越权，已移除。
 */
@RestController("userCategoryController")
@RequestMapping("/user/category")
@Api(tags = "C端-分类浏览接口")
@Slf4j
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    /**
     * 根据类型查询分类
     * @param type
     * @return
     */
    @GetMapping("/list")
    @ApiOperation("根据类型查询分类")
    public Result<List<Category>> list(Integer type){
        List<Category> list = categoryService.list(type);
        return Result.success(list);
    }
}
