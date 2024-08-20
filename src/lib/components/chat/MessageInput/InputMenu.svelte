<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { flyAndScale } from '$lib/utils/transitions';
	import { createEventDispatcher, getContext } from 'svelte';
	import ArchiveBox from '$lib/components/icons/ArchiveBox.svelte';
	import Image from '$lib/components/icons/Image.svelte';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import DocumentArrowUpSolid from '$lib/components/icons/DocumentArrowUpSolid.svelte';
	import Switch from '$lib/components/common/Switch.svelte';
	import GlobeAltSolid from '$lib/components/icons/GlobeAltSolid.svelte';
	import { config, user } from '$lib/stores';
	import WrenchSolid from '$lib/components/icons/WrenchSolid.svelte';

	const i18n = getContext('i18n');

	export let uploadFilesHandler: Function;

	export let selectedToolIds: string[] = [];
	export let webSearchEnabled: boolean;
	export let generateImageEnabled: boolean;

	export let tools = {};
	export let onClose: Function;

	export let submitPrompt: Function;

	$: tools = Object.fromEntries(
		Object.keys(tools).map((toolId) => [
			toolId,
			{
				...tools[toolId],
				enabled: selectedToolIds.includes(toolId)
			}
		])
	);

	let show = false;
	const dispatch = createEventDispatcher();
</script>

<Dropdown
	bind:show
	on:change={(e) => {
		if (e.detail === false) {
			onClose();
		}
	}}
>
	<Tooltip content={$i18n.t('More')}>
		<slot />
	</Tooltip>

	<div slot="content">
		<DropdownMenu.Content
			class="w-full max-w-[200px] rounded-xl px-1 py-1  border-gray-300/30 dark:border-gray-700/50 z-50 bg-white dark:bg-gray-850 dark:text-white shadow"
			sideOffset={15}
			alignOffset={-8}
			side="top"
			align="start"
			transition={flyAndScale}
		>
			{#if Object.keys(tools).length > 0}
				<div class="  max-h-28 overflow-y-auto scrollbar-hidden">
					{#each Object.keys(tools) as toolId}
						<div
							class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-xl"
						>
							<div class="flex-1 flex items-center gap-2">
								<WrenchSolid />
								<Tooltip content={tools[toolId]?.description ?? ''} className="flex-1">
									<div class=" line-clamp-1">{tools[toolId].name}</div>
								</Tooltip>
							</div>

							<Switch
								bind:state={tools[toolId].enabled}
								on:change={(e) => {
									selectedToolIds = e.detail
										? [...selectedToolIds, toolId]
										: selectedToolIds.filter((id) => id !== toolId);
								}}
							/>
						</div>
					{/each}
				</div>

				<hr class="border-gray-100 dark:border-gray-800 my-1" />
			{/if}
			<div
				class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-xl"
				>
				<div class="flex-1 flex items-center gap-2">
					<Image />
					<div class=" line-clamp-1">{$i18n.t('Generate Image')}</div>
				</div>

				<Switch bind:state={generateImageEnabled} />
			</div>
			{#if $config?.features?.enable_web_search}
				<div
					class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-xl"
				>
					<div class="flex-1 flex items-center gap-2">
						<GlobeAltSolid />
						<div class=" line-clamp-1">{$i18n.t('Web Search')}</div>
					</div>

					<Switch bind:state={webSearchEnabled} />
				</div>

				<hr class="border-gray-100 dark:border-gray-800 my-1" />
			{/if}

			<DropdownMenu.Item
				class="flex gap-2 items-center px-3 py-2 text-sm  font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800  rounded-xl"
				on:click={() => {
					uploadFilesHandler();
				}}
			>
				<DocumentArrowUpSolid />
				<div class=" line-clamp-1">{$i18n.t('Upload Files')}</div>
			</DropdownMenu.Item>

			<DropdownMenu.Item
				class="flex gap-2 items-center px-3 py-2 text-sm  font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800  rounded-xl"
				on:click={() => {
					let data = new Date();
					let medicalRecordsPrompt = "病人姓名：" + $user.name + "，日期：" + data.getFullYear() + "年" + (data.getMonth() + 1) + "月" + data.getDate() + "日。";
					medicalRecordsPrompt += "对上面内容生成300字的电子病历，包含具体问诊信息、用药记录、建议治疗措施、医生签字。 注意：不要捏造不存在的信息，对话中没有出现的信息用“待补充”代替";
					submitPrompt(medicalRecordsPrompt);
					dispatch('mrStatusChanged', 'wait model response');
				}}
			>
				<ArchiveBox className="size-4" strokeWidth="1.5" />
				<div class=" line-clamp-1">{$i18n.t('Generate Medical Records')}</div>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</div>
</Dropdown>
