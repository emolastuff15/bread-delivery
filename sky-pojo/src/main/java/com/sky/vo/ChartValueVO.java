package com.sky.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 饼图数据项（菜品分类占比 / 店内收款构成等 chart 页图表通用）
 *
 * 前端 ChartStats.tsx 的 toPieData() 按 {name, value, percent} 解析：
 *  - 字段名必须是 value（不是 number），name 必须是分类名（不是分类 id）
 *  - type=1（按金额）时 value 是【分】，前端会 /100 还原成元
 *  - type=2（按销量）时 value 就是份数
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartValueVO implements Serializable {

    private static final long serialVersionUID = 1L;

    //名称（分类名 / 支付方式）
    private String name;

    //金额(分) 或 数量(份)
    private Long value;

    //占比(%)，保留两位小数
    private Double percent;
}
