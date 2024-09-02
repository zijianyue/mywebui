
<script lang="ts">
    let year = new Date().getFullYear();
    let selectedYear = 2024;
</script>

<div class="wrap">
    <div class="scrollable line-border">
        <p style="font-size: 1.5em; font-weight: bold; text-align: center;">费用账单</p>
        
        <p>&nbsp;</p>
        <p>&nbsp;</p>

        <div style="font-size: 0.95em;">
            <p>&nbsp;</p>
            <hr class=" dark:border-gray-850 my-4" />

            <p>&nbsp;</p>
            <p>月度账单</p>
            <hr class=" dark:border-gray-850 my-4" />

            <select style="width: 8em; " bind:value={selectedYear}>
                {#each Array(year - 2020).keys() as i}
                    <option value={year - i}>{year - i}</option>
                {/each}
            </select>

            <p>&nbsp;</p>
            <table>
                <tr class="table-cap">
                    <th style="font-weight: bold;">账单</th>
                    <th style="font-weight: bold;">Token数量</th>
                    <th style="font-weight: bold;">消费总额（元）</th>
                    <th style="font-weight: bold;">操作</th>
                </tr>
                <tr>
                    <th>2024-08</th>
                    <th>2079329</th>
                    <th>0.2746</th>
                    <th><a href="/todo" target="_blank"><span class=" underline">费用账单</span></a></th>
                </tr>
                <tr class="table-row">
                    <th>2024-07</th>
                    <th>2043311</th>
                    <th>0.2698</th>
                    <th><a href="/todo" target="_blank"><span class=" underline">费用账单</span></a></th>
                </tr>
            </table>

            <p>&nbsp;</p>
            <p>&nbsp;</p>
        </div>
    </div>
    <div class="flex" style="text-align: center; align-items: center; justify-content: right;">
        <p style="font-size: 1.5em; color:blue; font-weight: bold;">
            <a class="flex flex-1 rounded-xl px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition" href="/costCenter">返回</a>
        </p>
    </div>
</div>

<style>
    .table-cap {
        background-color: rgb(230, 245, 254);
    }
    .table-row {
        background-color: rgb(243, 242, 242);
    }

    table {
        width: 100%;
        border-collapse:collapse;
    }
    table,th, td {
        border: 1px solid black;
        font-weight: normal;
    }

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
