<script lang="ts">
	import { onMount, createEventDispatcher, getContext } from 'svelte';
	const dispatch = createEventDispatcher();
	const i18n = getContext('i18n');

	import XMark from '$lib/components/icons/XMark.svelte';
	import AdvancedParams from '../Settings/Advanced/AdvancedParams.svelte';
	import Valves from '$lib/components/chat/Controls/Valves.svelte';
	import FileItem from '$lib/components/common/FileItem.svelte';
	import { prompts, settings } from '$lib/stores';
	import { toast } from 'svelte-sonner';
	import { updateUserSettings } from '$lib/apis/users';
	import Collapsible from '$lib/components/common/Collapsible.svelte';

	import { user } from '$lib/stores';

	export let models = [];

	export let chatFiles = [];
	export let params = {};
	onMount(async () => {
		const firstModelSystem = models[0]?.info?.params?.system;
		if ($settings.system) {
			params.system = $settings.system;
		} else if (firstModelSystem) {
			params.system = firstModelSystem;
		} else if ($prompts.length >= 1) {
			params.system = $prompts[0].content;
		}
	});

	const saveSystemDefaultPrompt= async () => {
		if (params.system.length === 0) {
			toast.error($i18n.t('Choose a prompt before saving...'));
			return;
		}
		settings.set({ ...$settings, system: params.system });
		await updateUserSettings(localStorage.token, { ui: $settings });

		toast.success($i18n.t('Default prompt updated'));
	};
</script>

<div class=" dark:text-white">
	<div class=" flex justify-between dark:text-gray-100 mb-2">
		<div class=" text-lg font-medium self-center font-primary">{$i18n.t('Chat Controls')}</div>
		<button
			class="self-center"
			on:click={() => {
				dispatch('close');
			}}
		>
			<XMark className="size-4" />
		</button>
	</div>

	<div class=" dark:text-gray-200 text-sm font-primary py-0.5">
		{#if chatFiles.length > 0}
			<Collapsible title={$i18n.t('Files')} open={true}>
				<div class="flex flex-col gap-1 mt-1.5" slot="content">
					{#each chatFiles as file, fileIdx}
						<FileItem
							className="w-full"
							url={`${file?.url}`}
							name={file.name}
							type={file.type}
							size={file?.size}
							dismissible={true}
							on:dismiss={() => {
								// Remove the file from the chatFiles array

								chatFiles.splice(fileIdx, 1);
								chatFiles = chatFiles;
							}}
						/>
					{/each}
				</div>
			</Collapsible>

			<hr class="my-2 border-gray-100 dark:border-gray-800" />
		{/if}

		{#if $user.role === 'admin'}
			<Collapsible title={$i18n.t('Valves')}>
				<div class="text-sm mt-1.5" slot="content">
					<Valves />
				</div>
			</Collapsible>
		{/if}

		<hr class="my-2 border-gray-100 dark:border-gray-800" />

		<Collapsible title={$i18n.t('System Prompt')} open={true}>
			<div class=" mt-1.5" slot="content">
				<select
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					bind:value={params.system}
					placeholder="Select a prompt"
				>
					<option value="" selected disabled>{$i18n.t('Select session role')}</option>
					{#each $prompts as prompt}
						<option value={prompt.content} class="bg-gray-100 dark:bg-gray-700">{prompt.title}</option>
					{/each}
				</select>
				<textarea
					bind:value={params.system}
					class="w-full rounded-lg px-3.5 py-2.5 text-sm dark:text-gray-300 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 outline-none resize-none"
					rows="4"
					placeholder={$i18n.t('Enter system prompt')}
				/>
				<button
					class="self-center mt-0.5 ml-1 text-[0.7rem] text-gray-500 font-primary"
					on:click={saveSystemDefaultPrompt}
				>
					{$i18n.t('Set as default')}
				</button>
				<button
					class="self-center mt-0.5 ml-1 text-[0.7rem] text-gray-500 font-primary"
					on:click={() => {
						params.system = ''
					}}
				>
					{$i18n.t('Clean the prompt')}
				</button>
			</div>
		</Collapsible>

		<hr class="my-2 border-gray-100 dark:border-gray-800" />

		{#if $user.role === 'admin'}
			<Collapsible title={$i18n.t('Advanced Params')} open={true}>
				<div class="text-sm mt-1.5" slot="content">
					<div>
						<AdvancedParams admin={$user?.role === 'admin'} bind:params />
					</div>
				</div>
			</Collapsible>
		{/if}
	</div>
</div>
