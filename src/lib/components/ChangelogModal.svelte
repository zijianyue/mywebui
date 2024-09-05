<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { Confetti } from 'svelte-confetti';

	import { WEBUI_NAME, config, mobile } from '$lib/stores';

	import { WEBUI_VERSION } from '$lib/constants';
	import { getChangelog, handleModuleUIClick } from '$lib/apis';
	import { toast } from 'svelte-sonner';

	import Modal from './common/Modal.svelte';

	const i18n = getContext('i18n');

	export let show = false;

	let changelog = null;
	async function handleModuleUIClickWrapper(event: MouseEvent, url: string) {
		let ret = await handleModuleUIClick(event, url);
		if (ret === 400 || ret === 500) {
			toast.success('仅充值会员可以使用');
		} else if (ret === 200) {
			
		} else {
			toast.error('无法访问');
		}
	}

	onMount(async () => {
		const res = await getChangelog();
		changelog = res;
	});
</script>

<Modal bind:show>
	<div class="px-5 pt-4 dark:text-gray-300 text-gray-700">
		<div class="flex justify-between items-start">
			<div class="text-xl font-semibold">
				{$i18n.t('Welcome title')}
				{$WEBUI_NAME}
				<Confetti x={[-1, -0.25]} y={[0, 0.5]} />
			</div>
			<button
				class="self-center"
				on:click={() => {
					localStorage.version = $config.version;
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
		<div class="flex items-center mt-1">
			<div class="text-sm dark:text-gray-200">{$i18n.t('Release Notes')}</div>
			<div class="flex self-center w-[1px] h-6 mx-2.5 bg-gray-200 dark:bg-gray-700" />
			<div class="text-sm dark:text-gray-200">
				v{WEBUI_VERSION}
			</div>
		</div>
	</div>

	<div class=" w-full p-4 px-5 text-gray-700 dark:text-gray-100">
		<div class=" overflow-y-scroll max-h-80 scrollbar-hidden">
			<div class="mb-3">
				<div class="text-sm dark:text-gray-200">小技巧：将网站安装到桌面,像手机APP一样使用</div>
				<div class="my-4">
					<div class="border p-4 rounded-md shadow-sm space-y-4">
						<span class="text-lg font-medium text-gray-800 dark:text-white">跳转其他板块</span>
						<div class="flex flex-col sm:flex-row sm:flex-wrap -mx-1">
							<div class="px-1 mb-2">
								<a href="https://dify.nas.cpolar.cn" target="_blank" class="dify-button">
									<span>{$i18n.t('工作流和智能体')}</span>
								</a>
							</div>
							<div class="px-1 mb-2">
								<a href="https://llamafactory.nas.cpolar.cn" target="_blank"
								   on:click={(event) => handleModuleUIClickWrapper(event, 'https://llamafactory.nas.cpolar.cn')}
									class="train-button"
									>
									<span>{$i18n.t('模型训练微调')}</span>
								</a>
							</div>
							<div class="px-1 mb-2">
								<a href="https://comfyui.nas.cpolar.cn" target="_blank"
								   on:click={(event) => handleModuleUIClickWrapper(event, 'https://comfyui.nas.cpolar.cn')}
									class="comfy-ui-button"
									>
									<span>{$i18n.t('ComfyUI生成图片或视频')}</span>
								</a>
							</div>
						</div>
					</div>
				</div>

				<div class="text-sm dark:text-gray-200" style="text-align: right;">
					<a href="/agreement" target="_blank"><span class=" underline">{$i18n.t('User Agreement')}</span></a>
				</div>
				{#if changelog}
					{#each Object.keys(changelog) as version}
						<div class=" mb-3 pr-2">
							<div class="font-semibold text-xl mb-1 dark:text-white">
								v{version} - {changelog[version].date}
							</div>

							<hr class=" dark:border-gray-800 my-2" />

							{#each Object.keys(changelog[version]).filter((section) => section !== 'date') as section}
								<div class="">
									<div
										class="font-semibold uppercase text-xs {section === 'added'
											? 'text-white bg-blue-600'
											: section === 'fixed'
												? 'text-white bg-green-600'
												: section === 'changed'
													? 'text-white bg-yellow-600'
													: section === 'removed'
														? 'text-white bg-red-600'
														: ''}  w-fit px-3 rounded-full my-2.5"
									>
										{section}
									</div>

									<div class="my-2.5 px-1.5">
										{#each Object.keys(changelog[version][section]) as item}
											<div class="text-sm mb-2">
												<div class="font-semibold uppercase">
													{changelog[version][section][item].title}
												</div>
												<div class="mb-2 mt-1">{changelog[version][section][item].content}</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
		</div>
		<div class="flex justify-end pt-3 text-sm font-medium">
			<button
				on:click={() => {
					localStorage.version = $config.version;
					show = false;
				}}
				class=" px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-gray-100 transition rounded-lg"
			>
				<span class="relative">{$i18n.t("Okay, Let's Go!")}</span>
			</button>
		</div>
	</div>
</Modal>
<style>
	.comfy-ui-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.25rem;
		color: white;
		background-image: linear-gradient(to right, #dc2626, #ea580c);
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease-in-out;
	}

	.comfy-ui-button:hover {
		background-image: linear-gradient(to right, #b91c1c, #c2410c);
	}

	.comfy-ui-button:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.5);
	}

	.train-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.25rem;
		color: white;
		background-image: linear-gradient(to right, #7e22ce, #2563eb);
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease-in-out;
	}

	.train-button:hover {
		background-image: linear-gradient(to right, #6b21a8, #1d4ed8);
	}

	.train-button:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
	}

	.dify-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.25rem;
		color: white;
		background-image: linear-gradient(to right, #16a34a, #2563eb);
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease-in-out;
	}

	.dify-button:hover {
		background-image: linear-gradient(to right, #15803d, #1d4ed8);
	}

	.dify-button:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
	}
</style>