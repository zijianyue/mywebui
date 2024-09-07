
<script lang="ts">
</script>

<div class="wrap">
    <div class="scrollable line-border">
        <p style="font-size: 1.5em; font-weight: bold; text-align: center;">费用中心</p>
        <p style="font-size: 1em; font-weight: bold; text-align: center;">最新版本生效日期：2024年8月31日</p>
        
        <p>&nbsp;</p>
        <p>&nbsp;</p>

        <div style="font-size: 0.95em;">

            <hr class=" dark:border-gray-850 my-4" />
            
            <p>CPoe平台提供按量后付费、按需付费两种付费方式：</p>
            <a href="/costCenter/feeStandards" target="_blank">具体收费标准请参考链接：<span class=" underline">收费标准</span></a>

            <p>&nbsp;</p>
            <p>&nbsp;</p>

            <p>充值：请联系客服。</p>

            <p>&nbsp;</p>
            <p>&nbsp;</p>

            <a href="/costCenter/expenseBil" target="_blank"><span class=" underline">费用账单</span></a>
            
            <p>&nbsp;</p>
            <p>&nbsp;</p>

            <hr class=" dark:border-gray-850 my-4" />

            <p>&nbsp;</p>
            <p>&nbsp;</p>
        </div>
    </div>
    <div class="flex" style="text-align: center; align-items: center; justify-content: right;">
        <p style="font-size: 1.5em; color:blue; font-weight: bold;">
            <a class="flex flex-1 rounded-xl px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition" href="/">返回</a>
        </p>
    </div>
</div>

<style>
    .para-indent {
        padding-left: 2em;
    }
    .blue-text {
        color:rgb(0, 106, 255);
    }

    .title-text {        
        font-weight: bold;
        line-height: 2;
    }
    .title-lineheight {
        line-height: 2;
    }
    .bold-text {        
        font-weight: bold;
    }
    .underline-text {
        text-decoration: underline;
    }

    .wrap {
        max-height: 100vh;
    }
    .scrollable {
        height: calc(100vh - 3.5em);
        overflow-y: scroll; /* 启用垂直滚动条 */
        border: 1px solid #ccc; /* 可视边界 */
    }
    .line-border {
        position: relative;
        line-height: 1.6; /* 根据需要设置行高 */
        color: #333; /* 根据需要设置文本颜色 */
        padding-left: 22%;
        padding-right: 22%;
        padding-top: 3%;
    }
    @media (max-width: 1200px) {
        .line-border {
            padding-left: 11%;
            padding-right: 11%;
            padding-top: 2%;
        }
    }
    @media (max-width: 800px) {
        .line-border {
            padding-left: 5%;
            padding-right: 5%;
            padding-top: 1%;
        }
    }
    /* 屏幕宽度小于600px时（适用于大多数手机） */
    @media (max-width: 600px) {
        .line-border {
            padding-left: 2%;
            padding-right: 2%;
            padding-top: 1%;
        }
    }

</style>
