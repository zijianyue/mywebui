<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let startY = 0;
	let currentY = 0;
	let isRefreshing = false;
	let isScrolling = false;
	let startTime: number;
	
	export let onRefresh = () => {
		console.log('Refreshing...');
		window.location.reload();
	};

	function handleTouchStart(event: TouchEvent) {
		startY = event.touches[0].clientY;
		startTime = Date.now();
	}

	function handleTouchMove(event: TouchEvent) {
		currentY = event.touches[0].clientY;
		const elapsedTime = Date.now() - startTime;
		// console.log('currentY:', currentY);
		// console.log('currentY - startY:', currentY - startY);
		// console.log('elapsedTime:', elapsedTime);
		// console.log('isScrolling:', isScrolling);
		// console.log('isRefreshing:', isRefreshing);

		if (!isScrolling && currentY < 300 && elapsedTime >= 300 && currentY - startY > 100 && !isRefreshing) { // 增加触发阈值，防止误触
			isRefreshing = true;
			onRefresh();
		}
	}

	function handleTouchEnd(event: TouchEvent) {
		startY = 0;
		currentY = 0;
		isRefreshing = false;
	}

	function handleScroll() {
		isScrolling = window.scrollY > 0;
	}

	onMount(() => {
		container.addEventListener('touchstart', handleTouchStart);
		container.addEventListener('touchmove', handleTouchMove);
		container.addEventListener('touchend', handleTouchEnd);
		window.addEventListener('scroll', handleScroll);
	});

	onDestroy(() => {
		container.removeEventListener('touchstart', handleTouchStart);
		container.removeEventListener('touchmove', handleTouchMove);
		container.removeEventListener('touchend', handleTouchEnd);
		window.removeEventListener('scroll', handleScroll);
	});
</script>

<div bind:this={container} class="pull-to-refresh-container">
	<slot></slot>
</div>

<style>
	.pull-to-refresh-container {
		width: 100%;
		height: 100%;
	}
</style>