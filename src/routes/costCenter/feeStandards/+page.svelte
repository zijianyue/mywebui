
<script lang="ts">
    import { onMount } from 'svelte';
    import { modelPrices, PRICE_COE } from '$lib/constants';
	import { getModels, toFixedTruncated, getTaskConfig } from '$lib/apis';

    let modelPriceMap = Object.entries(modelPrices);

    let existModelList: {name: string, input: string, output: string, disc1: string, disc2: string, disc3: string}[] = [];
    let loaded = false;
    onMount(async () => {
        let models = await getModels(localStorage.token);
        let taskConfig = await getTaskConfig(localStorage.token);

        // existModelList.pop();
        for ( let [m_id, priceEle] of modelPriceMap) {
            let model = models.find((m) => m.id === m_id);
            if (model != undefined) {
                console.log('name ', model.name, ' : ', priceEle);

                let coe = Number(priceEle.coe?? PRICE_COE);
                if (priceEle.useExchangeRate ?? false) {
                    coe = coe * Number(taskConfig.EXCHANGERATE);
                }

                existModelList.push({
                        name: model.name,
                        input: toFixedTruncated(priceEle.input * coe, 6), 
                        output: toFixedTruncated(priceEle.output * coe, 6), 
                        disc1: priceEle.disc1?? '', 
                        disc2: priceEle.disc2?? '', 
                        disc3: priceEle.disc3?? ''
                    });
            }
        }
        loaded = true;
    });

    let showModelDetails = false;
    let selectModel = '';
    let modelDetails: string[] = [];
    async function handleModelDetails(event: MouseEvent, name: string, disc1: string, disc2: string, disc3: string) {
		event.preventDefault();

        selectModel = name;
        modelDetails = [disc1, disc2, disc3];
        showModelDetails = true;
	};
</script>

<div class="wrap">
    <div class="scrollable line-border">
        <p style="font-size: 1.5em; font-weight: bold; text-align: center;">收费标准</p>
        
        <p>&nbsp;</p>
        <p>&nbsp;</p>

        <div style="font-size: 0.95em;">            
            <p class="title-text">按量后付费</p>
            <p>根据实际接口调用产生的tokens进行计费，大语言模型根据实际的输入及输出总和tokens数量，系统实时会对您的账户进行扣费。</p>
            
            <p>&nbsp;</p>
            <hr class=" dark:border-gray-850 my-4" />

            <p>下表所列模型价格以“百万tokens”为单位。Token是模型用来表示自然语言文本的最小单位，可以是一个词、一个数字或一个标点符号等。我们将根据模型输入和输出的总token数进行计量计费。</p>
            <p class="bold-text">下表未列出，而平台在使用的模型，属于免费模型，使用不产生任何费用。</p>
            <!-- <p>部分免费模型，如meta/llama-3.1-405b-instruct，有时候比较卡，且每天流量有限，不是太好用，所以平台提供给大家免费使用。</p> -->
            <p>&nbsp;</p>

            <table>
                <caption class="title-text">模型 & 价格细节</caption>
                <tr class="table-cap">
                    <th>模型</th>
                    <th>输入价格（元）/千token</th>
                    <th>输出价格（元）/千token</th>
                    <th>操作</th>
                </tr>
                {#each existModelList as item}
                    {#if loaded}
                        <tr>
                            <th class="table-first-col">{item.name}</th>
                            <th class="table-other-col">{item.input}</th>
                            <th class="table-other-col">{item.output}</th>
                            <th class="table-other-col"><button class="underline" on:click={(e) => handleModelDetails(e, item.name, item.disc1, item.disc2, item.disc3)}>显示模型详细描述</button></th>
                        </tr>
                    {/if}
                {/each}
            </table>

            <p>&nbsp;</p>
            {#if showModelDetails}
                <p class="bold-text">模型“{selectModel}”点评：</p>
                {#each modelDetails as disc}
                    <p style="text-indent: 2em;">{disc}</p>
                {/each}
                <button class="underline" on:click={(e) => { showModelDetails = false; } }>关闭模型详细描述</button>
            {/if}

            <p>&nbsp;</p>
            <hr class=" dark:border-gray-850 my-4" />

            <p style="font-weight: bold;">扣费规则</p>
            <p>扣减费用 = token 消耗量 x 模型单价，对应的费用将直接从充值余额或赠送余额中进行扣减。当充值余额与赠送余额同时存在时，优先扣减赠送余额。</p>
            <p>产品价格可能发生变动，CPoe保留修改价格的权利。请您依据实际用量按需充值，定期查看此页面以获知最新价格信息。</p>

            <p>&nbsp;</p>
            <p>&nbsp;</p>

            <p class="title-text">按需付费</p>
            <p>根据具体的服务类型，比如包月服务、服务器环境配置价格、工具使用价格等，需要向系统预先付费。具体请联系客服。</p>

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
        background-color: aquamarine;
    }
    .table-first-col {
        background-color: antiquewhite;
        font-weight: normal;
    }
    .table-other-col {
        background-color: rgb(243, 242, 242);
        font-weight: normal;
    }

    table {
        width: 100%;
        border-collapse:collapse;
    }
    table,th, td {
        border: 1px solid black;
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
        font-size: 1.25em;
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
