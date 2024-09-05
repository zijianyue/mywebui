<script lang="ts">
	import { getContext } from 'svelte';
	import Modal from '../common/Modal.svelte';

	const i18n = getContext('i18n');

	export let show = false;
</script>

<Modal bind:show>
	<div class="text-gray-700 dark:text-gray-100">
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4">
			<div class=" text-lg font-medium self-center">{$i18n.t('Ask for help')}</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>

		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4">
			<div class=" text-lg font-medium self-center">在线客服</div>
		</div>

		<div class="flex flex-col md:flex-row w-full p-5 md:space-x-4 dark:text-gray-200">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<div class="flex flex-col space-y-3 w-full self-start">
					主界面右边偏下，有一个蓝色”联系我们“的浮动标记，点击会弹开窗口，可以直接向人工客服寻求帮助。如下图所示：
				</div>
			</div>
		</div>

		<div class="flex flex-col md:flex-row p-5 md:space-x-4 dark:text-gray-200" style="max_width=80%">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<div class="flex flex-row w-full space-x-3 space-y-3 self-start">
					<div>
						<img src="/static/help/contact_us1.jpg" alt="客服入口" />
					</div>
					<div>
						<img src="/static/help/contact_us2.jpg" alt="客服界面" />
					</div>
				</div>
			</div>
		</div>

		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4">
			<div class=" text-lg font-medium self-center">在线帮助</div>
		</div>

		<div class=" flex flex-col dark:text-gray-300 px-5 pt-4">
			<p>四大板块：CPoe平台、工作流与智能体（Dify）、模型训练（LLaMA-Factory）、ComfyUI生成图片。</p>
			<p>入口：进入CPoe网站，会弹出一个欢迎界面，可跳转到其他三大板块。后面三个板块，需要缴费后才能开通使用权限。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/entrance.jpg" alt="入口" />
			<p>&nbsp;</p>			
		</div>

		<div class=" flex flex-col dark:text-gray-300 px-5 pt-4">
			<p>CPoe平台常用功能如下：</p>
			<p>一、侧边栏：新对话。新建一个对话。</p>
			<p>二、侧边栏：工作空间。可对模型、提示词、文档等个人偏好进行配置。</p>
			<p>三、侧边栏：对话记录。工作空间下面为历史对话记录，可点击打开，继续与AI对话。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/side_bar.jpg" alt="侧边栏" />
			<p>&nbsp;</p>

			<p>四、导航栏：主界面上方的下拉选择栏，可用来选择模型；右侧的+号，可以增加其他模型，做多模型比较。</p>
			<p>五、广告位：在模型选择控件下面的INFO信息。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/model_ctrl.jpg" alt="模型控制" />
			<p>&nbsp;</p>

			<p>六、用户菜单，顶端右侧黄色小圆圈，鼠标左键点击，会弹开用户菜单。选择“设置->账号”，能看到账户余额，还有一个费用中心的超链接。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/account.jpg" alt="账号" />
			<p>&nbsp;</p>

			<p>七、六中点开费用中心超链接，可以查看收费标准、充值方式、费用明细。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/expense_bil.jpg" alt="费用中心" />
			<p>&nbsp;</p>

			<p>八、对话界面。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/chat.jpg" alt="对话界面" />
			<p>&nbsp;</p>

			<p>九、对话输入。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/chat_input.jpg" alt="对话输入" />
			<p>&nbsp;</p>

			<p>十、录音、语音交互。</p>
			<p>&nbsp;</p>
			<img class="img-row" src="/static/help/video.jpg" alt="录音、对话" />
			<p>&nbsp;</p>
		</div>

		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4">
			<div class=" text-lg font-medium self-center">{$i18n.t('contact us')}</div>
		</div>

		<div class="flex flex-col md:flex-row w-full p-5 md:space-x-4 dark:text-gray-200">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<div class="flex flex-col space-y-3 w-full self-start">
					<div class="w-full flex justify-between items-center">
						<div class="flex space-x-1 text-xs">
							<div
								class=" h-fit py-1 px-2 flex items-center justify-center rounded border border-black/10 text-gray-600 dark:border-white/10 dark:text-gray-300"
							>
								邮箱：taopi2001@163.com
							</div>

							<div
								class=" h-fit py-1 px-2 flex items-center justify-center rounded border border-black/10 text-gray-600 dark:border-white/10 dark:text-gray-300"
							>
								电话：19350540120
							</div>

							<!-- <div
								class=" h-fit py-1 px-2 flex items-center justify-center rounded border border-black/10 text-gray-600 dark:border-white/10 dark:text-gray-300"
							>
								微信号1：taopi2001
							</div> -->

							<div
								class=" h-fit py-1 px-2 flex items-center justify-center rounded border border-black/10 text-gray-600 dark:border-white/10 dark:text-gray-300"
							>
								微信号：jinhulord
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</Modal>

<style>
	.img-row {
		max-width: 80%;
		max-height: 50%;
		width: auto;
		height: auto;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}

	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	input[type='number'] {
		-moz-appearance: textfield; /* Firefox */
	}
</style>