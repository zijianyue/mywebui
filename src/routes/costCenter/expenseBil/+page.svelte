<script lang="ts">
    import dayjs from 'dayjs';
    import { onMount, getContext } from 'svelte';
    import { getAcountBillsByYear, getAcountBillsByYearMonth } from '$lib/apis/users';
    import { user } from '$lib/stores';

    const i18n = getContext('i18n');

    let yearUpper = new Date().getFullYear();
    let selectedYear = 2024;
    let noYearRecords = false;
    
    let billMonth = [
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
        { month: '', tokenAmount: 0, cost: 0, has: false},
    ];

    let selectMonth = -1;
    let showCostDetails = false;

    interface BillRec {
        id: string;
        model_id: string;
        expense_time: number;
        input_tokens: string;
        output_tokens: string;
        input_cost: string;
        output_cost: string;
        amount: string;
        year: number;
        month: number;
    }
    let costDetails : BillRec[] = [];

    async function updateBillInfo(year: number) {
        if ($user != undefined && year != undefined) {
            let acount_bill_info = await getAcountBillsByYear($user.id, year);
            // console.log(acount_bill_info);

            if (acount_bill_info.length == 0) {
                noYearRecords = true;
                return;
            }
            noYearRecords = false;

            for (let i = 0; i < billMonth.length; i++) {
                billMonth[i].month = year.toString() + '-' + (i + 1).toString();
                billMonth[i].tokenAmount = 0;
                billMonth[i].cost = 0;
                billMonth[i].has = false;
            }

            for (const bill of acount_bill_info) {
                if ((bill.model_id).includes('充值')) {
                    // 不统计
                    billMonth[bill.month - 1].has = true;
                    continue;
                }
                if (bill.output_tokens == '图片') {
                    // 避免NaN
                } else {
                    billMonth[bill.month - 1].tokenAmount += Number(bill.input_tokens) + Number(bill.output_tokens);
                }
                billMonth[bill.month - 1].cost += Number(bill.input_cost) + Number(bill.output_cost);
                billMonth[bill.month - 1].has = true;
            }
            // console.log(billMonth);
        }
	}

    $: if (selectedYear != undefined) {
        showCostDetails = false;
        updateBillInfo(selectedYear);
    }

    async function handleCostDetails(event: MouseEvent, month: number) {
		event.preventDefault();
        selectMonth = -1;
        showCostDetails = false;

        if (month > 0 && month <= 12) {
            selectMonth = month;
            showCostDetails = true;
            console.log('select month is', selectMonth, billMonth[selectMonth - 1]);

            if ($user != undefined && selectedYear != undefined) {
                costDetails = await getAcountBillsByYearMonth($user.id, selectedYear, month);
                // console.log(costDetails);
            }
        }
	}

    onMount(async () => {
        let year = new Date().getFullYear();
        updateBillInfo(year);
	});

    // 函数用于截断浮点数到小数点后六位，去掉浮点精度的随机误差
    const setAccuracy = (val : number) => {
        return Math.floor(val * 1000000) / 1000000;
    };
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
                {#each Array(yearUpper - 2022).keys() as i}
                    <option value={yearUpper - i}>{yearUpper - i}</option>
                {/each}
            </select>

            <p>&nbsp;</p>
            {#if noYearRecords}
                <p>没有消费记录。</p>
            {:else}
                <table>
                    <tr class="table-cap">
                        <th style="font-weight: bold;">账单</th>
                        <th style="font-weight: bold;">Token数量</th>
                        <th style="font-weight: bold;">消费总额（元）</th>
                        <th style="font-weight: bold;">操作</th>
                    </tr>
                    {#each billMonth.reverse() as perBill, i}
                        {#if perBill.has}
                            {#if i % 2 == 0 }
                                <tr>
                                    <th>{perBill.month}</th>
                                    <th>{perBill.tokenAmount}</th>
                                    <th>{setAccuracy(perBill.cost)}</th>
                                    <th><button class=" underline" on:click={(e) => handleCostDetails(e, 12 - i)}>费用明细</button></th>
                                </tr>
                            {:else}
                                <tr class="table-row">
                                    <th>{perBill.month}</th>
                                    <th>{perBill.tokenAmount}</th>
                                    <th>{setAccuracy(perBill.cost)}</th>
                                    <th><button class=" underline" on:click={(e) => handleCostDetails(e, 12 - i)}>费用明细</button></th>
                                </tr>
                            {/if}
                        {/if}
                    {/each}
                </table>
            {/if}


            <p>&nbsp;</p>
            <p>&nbsp;</p>
        </div>

        {#if showCostDetails}
            <hr class=" dark:border-gray-850 my-4" />

            <p>&nbsp;</p>
            <p>{selectedYear}年{selectMonth}月费用明细</p>
            <hr class=" dark:border-gray-850 my-4" />

            {#if costDetails.length == 0}
                <p>没有消费记录。</p>
            {:else}
                <div style="font-size: 0.95em;">
                    <table>
                        <tr class="table-cap">
                            <th style="font-weight: bold;">消费时间</th>
                            <th style="font-weight: bold;">模型</th>
                            <th style="font-weight: bold;">输入Token数量</th>
                            <th style="font-weight: bold;">输入消费（元）</th>
                            <th style="font-weight: bold;">输出Token数量</th>
                            <th style="font-weight: bold;">输出消费（元）</th>
                            <th style="font-weight: bold;">余额（元）</th>
                        </tr>
                        {#each costDetails.reverse() as perBill, i}
                            {#if i % 2 == 0 }
                                <tr>
                                    <th>{dayjs(perBill.expense_time * 1000).format($i18n.t('MMMM DD, YYYY'))}</th>
                                    <th>{perBill.model_id}</th>
                                    <th>{perBill.input_tokens}</th>
                                    <th>{perBill.input_cost}</th>
                                    <th>{perBill.output_tokens}</th>
                                    <th>{perBill.output_cost}</th>
                                    <th>{perBill.amount}</th>
                                </tr>
                            {:else}
                                <tr class="table-row">
                                    <th>{dayjs(perBill.expense_time * 1000).format($i18n.t('MMMM DD, YYYY'))}</th>
                                    <th>{perBill.model_id}</th>
                                    <th>{perBill.input_tokens}</th>
                                    <th>{perBill.input_cost}</th>
                                    <th>{perBill.output_tokens}</th>
                                    <th>{perBill.output_cost}</th>
                                    <th>{perBill.amount}</th>
                                </tr>
                            {/if}
                        {/each}
                    </table>
                </div>
            {/if}
        {/if}
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
