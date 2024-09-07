<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';

	let showContent = false;

	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://assets.salesmartly.com/js/project_110907_115361_1724377087.js';
		script.async = true;
		document.body.appendChild(script);
		showContent = true;
	});
</script>

<div class="cost-center">
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
					<li>按量后付费</li>
					<li>按需付费</li>
				</ul>
				<a href="/costCenter/feeStandards" class="btn btn-outline" target="_blank">查看收费标准</a>
			</div>

			<div class="card recharge" transition:fly={{ y: 20, duration: 300, delay: 200 }}>
				<h2>充值</h2>
				<p>请联系客服进行充值操作。</p>
			</div>

			<div class="card bill" transition:fly={{ y: 20, duration: 300, delay: 300 }}>
				<h2>费用账单</h2>
				<p>查看您的详细费用账单和使用情况。</p>
				<a href="/costCenter/expenseBil" class="btn btn-outline" target="_blank">查看账单</a>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background-color: #f8f7fc;
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
		background-color: #ffffff;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	h1 {
		font-size: 1.5rem;
		color: #4a148c;
		margin: 0;
		font-weight: 600;
		flex-grow: 1;
		text-align: center;
	}

	.card {
		background-color: #ffffff;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		padding: 1.5rem;
		margin-bottom: 2rem;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		border-left: 4px solid #7b1fa2;
	}

	.card:hover {
		transform: translateY(-5px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
	}

	h2 {
		font-size: 1.5rem;
		color: #4a148c;
		margin-bottom: 1rem;
		font-weight: 600;
	}

	p {
		color: #37474f;
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
		color: #37474f;
	}

	li::before {
		content: "•";
		position: absolute;
		left: 0;
		color: #7b1fa2;
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
		background-color: #7b1fa2;
		color: #ffffff;
		border: none;
	}

	.btn-primary:hover {
		background-color: #4a148c;
	}

	.btn-outline {
		border: 2px solid #7b1fa2;
		color: #7b1fa2;
		background-color: transparent;
	}

	.btn-outline:hover {
		background-color: #7b1fa2;
		color: #ffffff;
	}

	.btn-back {
		display: flex;
		align-items: center;
		background-color: transparent;
		color: #4a148c;
		padding: 0.5rem;
	}

	.btn-back:hover {
		background-color: rgba(74, 20, 140, 0.1);
	}

	.placeholder {
		width: 40px;
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

		.placeholder {
			width: 36px;
		}
	}
</style>