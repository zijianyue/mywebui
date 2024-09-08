<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let showContent = false;
	let darkMode = false;

	function updateTheme() {
		darkMode = document.documentElement.classList.contains('dark');
	}

	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://assets.salesmartly.com/js/project_110907_115361_1724377087.js';
		script.async = true;
		document.body.appendChild(script);
		showContent = true;

		updateTheme();

		// Listen for changes in system preference
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const mediaQueryHandler = () => {
			if (localStorage.theme === 'system') {
				updateTheme();
			}
		};
		mediaQuery.addEventListener('change', mediaQueryHandler);

		// Use MutationObserver to detect changes in document.documentElement.classList
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		return () => {
			observer.disconnect();
			mediaQuery.removeEventListener('change', mediaQueryHandler);
		};
	});

	afterUpdate(updateTheme);
</script>

<div class="cost-center" class:dark={darkMode}>
	<header>
		<a href="/" class="btn-back" aria-label="返回首页">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 12H5M12 19l-7-7 7-7"/>
			</svg>
		</a>
		<h1>费用中心</h1>
		<div class="placeholder"></div>
	</header>

	{#if showContent}
		<div class="content" transition:fade={{ duration: 300 }}>
			<div class="card pricing" transition:fly={{ y: 20, duration: 300, delay: 100 }}>
				<h2>付费方式</h2>
				<p>CPoe平台提供以下付费方式：</p>
				<ul>
					<li>按服务计费</li>
					<li>按流量计费</li>
				</ul>
				<a href="/costCenter/feeStandards" class="btn btn-outline" target="_blank">收费标准</a>
			</div>

			<div class="card recharge" transition:fly={{ y: 20, duration: 300, delay: 200 }}>
				<h2>充值</h2>
				<p>微信充值即将上线，请联系客服手工充值，感谢您的支持</p>
			</div>

			<div class="card bill" transition:fly={{ y: 20, duration: 300, delay: 300 }}>
				<h2>费用账单</h2>
				<p>查看您的详细费用账单和使用情况。</p>
				<a href="/costCenter/expenseBil" class="btn btn-outline" target="_blank">账单明细</a>
			</div>
		</div>
	{/if}
</div>

<style>
	:root {
		--bg-color: var(--color-gray-100, #f8f7fc);
		--card-bg-color: var(--color-white, #ffffff);
		--text-color: var(--color-gray-700, #37474f);
		--heading-color: var(--color-primary-700, #4a148c);
		--accent-color: var(--color-primary-600, #7b1fa2);
		--btn-text-color: var(--color-white, #ffffff);
		--btn-hover-bg: var(--color-primary-800, #4a148c);
		--card-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		--card-hover-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
	}

	:global(.dark) {
		--bg-color: var(--color-gray-900, #121212);
		--card-bg-color: var(--color-gray-800, #1e1e1e);
		--text-color: var(--color-gray-300, #e0e0e0);
		--heading-color: var(--color-primary-300, #bb86fc);
		--accent-color: var(--color-secondary-400, #03dac6);
		--btn-text-color: var(--color-gray-900, #121212);
		--btn-hover-bg: var(--color-secondary-700, #018786);
		--card-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
		--card-hover-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
	}

	:global(body) {
		background-color: var(--bg-color);
		color: var(--text-color);
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	.cost-center {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		background-color: var(--card-bg-color);
		padding: 1rem;
		border-radius: 8px;
		box-shadow: var(--card-shadow);
	}

	h1 {
		font-size: 1.5rem;
		color: var(--heading-color);
		margin: 0;
		font-weight: 600;
		flex-grow: 1;
		text-align: center;
	}

	.card {
		background-color: var(--card-bg-color);
		border-radius: 8px;
		box-shadow: var(--card-shadow);
		padding: 1.5rem;
		margin-bottom: 2rem;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		border-left: 4px solid var(--accent-color);
	}

	.card:hover {
		transform: translateY(-5px);
		box-shadow: var(--card-hover-shadow);
	}

	h2 {
		font-size: 1.5rem;
		color: var(--heading-color);
		margin-bottom: 1rem;
		font-weight: 600;
	}

	p {
		color: var(--text-color);
		line-height: 1.6;
	}

	ul {
		list-style-type: none;
		padding-left: 0;
		margin-bottom: 1rem;
	}

	li {
		position: relative;
		padding-left: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--text-color);
	}

	li::before {
		content: "•";
		position: absolute;
		left: 0;
		color: var(--accent-color);
		font-weight: bold;
	}

	.btn {
		display: inline-block;
		padding: 0.6rem 1.2rem;
		border-radius: 4px;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.3s ease;
		text-align: center;
	}

	.btn-primary {
		background-color: var(--accent-color);
		color: var(--btn-text-color);
		border: none;
	}

	.btn-primary:hover {
		background-color: var(--btn-hover-bg);
	}

	.btn-outline {
		border: 2px solid var(--accent-color);
		color: var(--accent-color);
		background-color: transparent;
	}

	.btn-outline:hover {
		background-color: var(--accent-color);
		color: var(--btn-text-color);
	}

	.btn-back {
		display: flex;
		align-items: center;
		background-color: transparent;
		color: var(--heading-color);
		padding: 0.5rem;
	}

	.btn-back:hover {
		background-color: rgba(74, 20, 140, 0.1);
	}

	.btn-toggle {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.5rem;
	}

	@media (max-width: 600px) {
		header {
			padding: 0.5rem;
		}

		h1 {
			font-size: 1.25rem;
		}

		.btn-back {
			width: 36px;
			height: 36px;
		}

		.btn-back svg {
			width: 20px;
			height: 20px;
		}
	}
</style>