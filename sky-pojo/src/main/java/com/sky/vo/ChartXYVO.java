package com.sky.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 折线/柱状图数据（chart 页通用，对应原版 Basic.vue / MixedChart.vue 的 chartData）
 *
 * 前端 ChartStats.tsx 的 toXYData() 按 {xaxis, series} 解析：
 *   xData: data.xaxis, yData: data.series（金额类接口前端会 /100 还原成元）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartXYVO implements Serializable {

    private static final long serialVersionUID = 1L;

    //x 轴刻度（菜品名 / 日期 / 小时）
    @Builder.Default
    private List<String> xaxis = new ArrayList<>();

    //对应数值（销量份数 或 金额分）
    @Builder.Default
    private List<Long> series = new ArrayList<>();
}
