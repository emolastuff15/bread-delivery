package com.sky.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 顶部三个数据框（chart 页 amountCollect / dayCollect）
 *
 * 前端 ChartStats.tsx 按 {payTotal, noPayTotal, totalPerson} 解析，
 * 金额字段会 /100 显示成元，所以这里单位是【分】。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartTopVO implements Serializable {

    private static final long serialVersionUID = 1L;

    //实收金额（分）：已支付（pay_status=1）的订单金额合计
    private Long payTotal;

    //未收金额（分）：未支付（pay_status=0）且未取消的订单金额合计
    private Long noPayTotal;

    //就餐人数：该时间段内下单的去重用户数（count(distinct user_id)）
    private Long totalPerson;
}
