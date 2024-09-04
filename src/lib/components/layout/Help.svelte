<script lang="ts">
	import { onMount, tick, getContext } from 'svelte';

	const i18n = getContext('i18n');

	import ShortcutsModal from '../chat/ShortcutsModal.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import HelpMenu from './Help/HelpMenu.svelte';
	import HelpInfoModal from '../chat/HelpInfoModal.svelte';

	let showShortcuts = false;
	let showHelpInfo = false;
</script>

<!-- <div class=" hidden lg:flex fixed bottom-0 right-0 px-2 py-2 z-20"> -->
<div class=" flex px-2 py-2">
	<button
		id="show-shortcuts-button"
		class="hidden"
		on:click={() => {
			showShortcuts = !showShortcuts;
		}}
	/>

	<HelpMenu
		showDocsHandler={() => {
			showHelpInfo = !showHelpInfo;
		}}
		showShortcutsHandler={() => {
			showShortcuts = !showShortcuts;
		}}
	>
		<Tooltip content={$i18n.t('Help')} placement="left">
			<button
				class="select-none flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
				aria-label="Help"
				>
				<svg class="size-5 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
					<line x1="12" y1="17" x2="12.01" y2="17"></line>
				</svg>
			</button>
		</Tooltip>
	</HelpMenu>
</div>

<ShortcutsModal bind:show={showShortcuts} />
<HelpInfoModal bind:show={showHelpInfo} />
