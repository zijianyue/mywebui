<script lang="ts">
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';

	import { createEventDispatcher } from 'svelte';
	import { onMount, tick, getContext } from 'svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	const dispatch = createEventDispatcher();

	import { config, models, settings, user, mobile } from '$lib/stores';
	import { synthesizeOpenAISpeech } from '$lib/apis/audio';
	import { imageGenerations } from '$lib/apis/images';
	import {
		getHistoryPromptText,
		getUserPosition,
		approximateToHumanReadable,
		extractParagraphsForAudio,
		extractSentencesForAudio,
		cleanText,
		getMessageContentParts
	} from '$lib/utils';
	import { WEBUI_BASE_URL } from '$lib/constants';

	import Name from './Name.svelte';
	import ProfileImage from './ProfileImage.svelte';
	import Skeleton from './Skeleton.svelte';
	import Image from '$lib/components/common/Image.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import RateComment from './RateComment.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import WebSearchResults from './ResponseMessage/WebSearchResults.svelte';
	import Sparkles from '$lib/components/icons/Sparkles.svelte';
	import Markdown from './Markdown.svelte';
	import Error from './Error.svelte';
	import Citations from './Citations.svelte';
	import { generateOpenAIChatCompletion } from '$lib/apis/openai';

	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';

	interface MessageType {
		id: string;
		model: string;
		content: string;
		files?: { type: string; url: string }[];
		timestamp: number;
		role: string;
		statusHistory?: {
			done: boolean;
			action: string;
			description: string;
			urls?: string[];
			query?: string;
		}[];
		status?: {
			done: boolean;
			action: string;
			description: string;
			urls?: string[];
			query?: string;
		};
		done: boolean;
		error?: boolean | { content: string };
		citations?: string[];
		info?: {
			openai?: boolean;
			prompt_tokens?: number;
			completion_tokens?: number;
			total_tokens?: number;
			eval_count?: number;
			eval_duration?: number;
			prompt_eval_count?: number;
			prompt_eval_duration?: number;
			total_duration?: number;
			load_duration?: number;
		};
		annotation?: { type: string; rating: number };
	}

	export let message: MessageType;
	export let messages;
	export let siblings;

	export let isLastMessage = true;

	export let readOnly = false;

	export let updateChatMessages: Function;
	export let confirmEditResponseMessage: Function;
	export let showPreviousMessage: Function;
	export let showNextMessage: Function;
	export let rateMessage: Function;

	export let copyToClipboard: Function;
	export let continueGeneration: Function;
	export let regenerateResponse: Function;
	export let submitPrompt: Function;
	export let suggestQuestionsList = [];
	let lastSuggestQuestionsList = [];
	let suggestUpdated = false;
	let hospitals = [];
	let recentMessages :string;

	let model = null;
	$: model = $models.find((m) => m.id === message.model);

	let edit = false;
	let editedContent = '';
	let editTextAreaElement: HTMLTextAreaElement;

	let audioParts: Record<number, HTMLAudioElement | null> = {};
	let speaking = false;
	let speakingIdx: number | undefined;

	let loadingSpeech = false;
	let generatingImage = false;

	let showRateComment = false;

	function handleClick(hospital) {
		const phone = hospital.phone ? hospital.phone : '无电话信息';
		const distance = hospital.distance ? hospital.distance : '未知距离';
		const lineNames = hospital.stationData && Array.isArray(hospital.stationData)
			  ? hospital.stationData.map(station => station.lineName).filter(lineName => lineName).join(', ')
			  : '无线路信息';
		alert(`电话: ${phone}, 距离: ${distance}, 线路: ${lineNames}`);
	}

	// TODO: 获取不到精确位置，使用智能硬件定位，需要获取wifi或者蓝牙信息，都获取不到的情况下就让用户选择设置位置(需要保存)，或者使用IP定位所在城市中心位置, 搜索结果在静态地图中展示，跳转到系统导航程序
	async function fetchNearbyPlaces(keyword) {
		let pointLonlat = await getUserPosition(false ,true).catch((error) => {
			console.log('get pointLonlat fail:', error.message);
			toast.error("当前设备无法获取位置信息,建议使用手机或者平板");
			return;
		});
		// let pointLonlat = "114.267150,30.715988" // mock position
		console.log('pointLonlat:', pointLonlat);
		let collection = [];
		hospitals = [];
		const apiKey = 'ba3509a3a414b4e66d14f7168efe8798';
		let startNum = 0;
		const countPerPage = 10; // 每页的结果数量

		try {
			while (true) {
				const url = `https://api.tianditu.gov.cn/v2/search?postStr={"keyWord":"${keyword}","level":12,"queryRadius":5000,"pointLonlat":"${pointLonlat}","queryType":3,"start":${startNum},"count":${countPerPage}}&type=query&tk=${apiKey}`;
				const response = await fetch(url);
				const data = await response.json();
				console.log('fetch url ret:', data);
				if (data.status.infocode === 1000 && data.count > 0) {
					// let ret = data.pois.map(poi => poi.name);
					// hospitals = [...data.pois];
					collection.push(...data.pois);
				} else {
					break; // 停止循环，没有更多结果
				}
				startNum += countPerPage;
			}
		}
		catch (error) {
			console.error('获取数据时出错:', error);
			collection.push('获取数据时出错');
		}
		hospitals = [...collection];
		console.log('所有医院数据:', hospitals);
	}

	const playAudio = (idx: number) => {
		return new Promise<void>((res) => {
			speakingIdx = idx;
			const audio = audioParts[idx];

			if (!audio) {
				return res();
			}

			audio.play();
			audio.onended = async () => {
				await new Promise((r) => setTimeout(r, 300));

				if (Object.keys(audioParts).length - 1 === idx) {
					speaking = false;
				}

				res();
			};
		});
	};

	const toggleSpeakMessage = async () => {
		if (speaking) {
			try {
				speechSynthesis.cancel();

				if (speakingIdx !== undefined && audioParts[speakingIdx]) {
					audioParts[speakingIdx]!.pause();
					audioParts[speakingIdx]!.currentTime = 0;
				}
			} catch {}

			speaking = false;
			speakingIdx = undefined;
			return;
		}

		if (!(message?.content ?? '').trim().length) {
			toast.info($i18n.t('No content to speak'));
			return;
		}

		speaking = true;

		if ($config.audio.tts.engine !== '') {
			loadingSpeech = true;

			const messageContentParts: string[] = getMessageContentParts(
				message.content,
				$config?.audio?.tts?.split_on ?? 'punctuation'
			);

			if (!messageContentParts.length) {
				console.log('No content to speak');
				toast.info($i18n.t('No content to speak'));

				speaking = false;
				loadingSpeech = false;
				return;
			}

			console.debug('Prepared message content for TTS', messageContentParts);

			audioParts = messageContentParts.reduce(
				(acc, _sentence, idx) => {
					acc[idx] = null;
					return acc;
				},
				{} as typeof audioParts
			);

			let lastPlayedAudioPromise = Promise.resolve(); // Initialize a promise that resolves immediately

			for (const [idx, sentence] of messageContentParts.entries()) {
				const res = await synthesizeOpenAISpeech(
					localStorage.token,
					$settings?.audio?.tts?.defaultVoice === $config.audio.tts.voice
						? ($settings?.audio?.tts?.voice ?? $config?.audio?.tts?.voice)
						: $config?.audio?.tts?.voice,
					sentence
				).catch((error) => {
					console.error(error);
					toast.error(error);

					speaking = false;
					loadingSpeech = false;
				});

				if (res) {
					const blob = await res.blob();
					const blobUrl = URL.createObjectURL(blob);
					const audio = new Audio(blobUrl);
					audioParts[idx] = audio;
					loadingSpeech = false;
					lastPlayedAudioPromise = lastPlayedAudioPromise.then(() => playAudio(idx));
				}
			}
		} else {
			let voices = [];
			const getVoicesLoop = setInterval(() => {
				voices = speechSynthesis.getVoices();
				if (voices.length > 0) {
					clearInterval(getVoicesLoop);

					const voice =
						voices
							?.filter(
								(v) => v.voiceURI === ($settings?.audio?.tts?.voice ?? $config?.audio?.tts?.voice)
							)
							?.at(0) ?? undefined;

					console.log(voice);

					const speak = new SpeechSynthesisUtterance(message.content);

					console.log(speak);

					speak.onend = () => {
						speaking = false;
						if ($settings.conversationMode) {
							document.getElementById('voice-input-button')?.click();
						}
					};

					if (voice) {
						speak.voice = voice;
					}

					speechSynthesis.speak(speak);
				}
			}, 100);
		}
	};

	const editMessageHandler = async () => {
		edit = true;
		editedContent = message.content;

		await tick();

		editTextAreaElement.style.height = '';
		editTextAreaElement.style.height = `${editTextAreaElement.scrollHeight}px`;
	};

	const editMessageConfirmHandler = async () => {
		if (editedContent === '') {
			editedContent = ' ';
		}

		confirmEditResponseMessage(message.id, editedContent);

		edit = false;
		editedContent = '';

		await tick();
	};

	const cancelEditMessage = async () => {
		edit = false;
		editedContent = '';
		await tick();
	};

	function isPureEnglish(str) {
		return /^[\x00-\x7F]*$/.test(str);
	}

	const generateImage = async (message: MessageType) => {
		generatingImage = true;
		let retries = 3;
		let promptUsed = '';
		let pure = isPureEnglish(message.content);
		if (pure) {
			retries = 0;
			promptUsed = message.content;
		} else {
			promptUsed = `将后面的文字翻译成英语，不要包含翻译注解，结果必须是纯英文，不能有unicode字符：${message.content}`;
		}
		while (retries > 0) {
			const [ret, controller] = await generateOpenAIChatCompletion(
				localStorage.token,
				{
					stream: false,
					model: 'gemma2:2b',
					temperature: 0,
					messages: [
						{
							role: 'user',
							content: promptUsed
						}
					]
				},
				`${WEBUI_BASE_URL}/api`
			).catch((error) => {
				console.log('translate fail:', error);
				return [null, null];
			});

			if (!ret) {
				generatingImage = false;
				return;
			}
			const data = await ret.json().catch((error) => {
				console.log('Error parsing JSON:', error);
				return null;
			});
			if (!data) {
				generatingImage = false;
				return;
			}
			console.log('translate result json:', data);

			promptUsed = data.choices[0].message.content;
			console.log('promptUsed:', promptUsed);
			if (isPureEnglish(promptUsed)) {
				break;
			} else {
				console.log('not pure english');
				retries--;
			}
		}

		if (!pure && !isPureEnglish(promptUsed)) {
			console.log('translate fail at last');
			generatingImage = false;
			return;
		}
		const res = await imageGenerations(localStorage.token, promptUsed).catch((error) => {
			toast.error(error);
		});
		console.log(res);

		if (res) {
			message.files = res.map((image) => ({
				type: 'image',
				url: `${image.url}`
			}));

			dispatch('save', message);
		}

		generatingImage = false;
	};

	$: if (!edit) {
		(async () => {
			await tick();
		})();
	}

	$: (async () => {
		suggestUpdated = false;
		if (JSON.stringify(lastSuggestQuestionsList) !== JSON.stringify(suggestQuestionsList)) {
			lastSuggestQuestionsList = [...suggestQuestionsList];
			if (isLastMessage && message.done) {
				suggestUpdated = true;
			}
		} 
	})();

	$: (async () => {
		recentMessages = '';
		if (isLastMessage && message.done) {
			recentMessages = getHistoryPromptText(messages);
			console.debug('recentMessages:', recentMessages);
		}
	})();

	onMount(async () => {
		await tick();
	});
</script>

{#key message.id}
	<div
		class=" flex w-full message-{message.id}"
		id="message-{message.id}"
		dir={$settings.chatDirection}
	>
		<ProfileImage
			src={model?.info?.meta?.profile_image_url ??
				($i18n.language === 'dg-DG' ? `/doge.png` : `${WEBUI_BASE_URL}/static/favicon.png`)}
		/>

		<div class="w-full overflow-hidden pl-1">
			<Name>
				{model?.name ?? message.model}

				{#if message.timestamp}
					<span
						class=" self-center invisible group-hover:visible text-gray-400 text-xs font-medium uppercase ml-0.5 -mt-0.5"
					>
						{dayjs(message.timestamp * 1000).format($i18n.t('h:mm a'))}
					</span>
				{/if}
			</Name>

			<div>
				{#if message?.files && message.files?.filter((f) => f.type === 'image').length > 0}
					<div class="my-2.5 w-full flex overflow-x-auto gap-2 flex-wrap">
						{#each message.files as file}
							<div>
								{#if file.type === 'image'}
									<Image src={file.url} />
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				<div class="chat-{message.role} w-full min-w-full markdown-prose">
					<div>
						{#if (message?.statusHistory ?? [...(message?.status ? [message?.status] : [])]).length > 0}
							{@const status = (
								message?.statusHistory ?? [...(message?.status ? [message?.status] : [])]
							).at(-1)}
							<div class="status-description flex items-center gap-2 pt-0.5 pb-1">
								{#if status?.done === false}
									<div class="">
										<Spinner className="size-4" />
									</div>
								{/if}

								{#if status?.action === 'web_search' && status?.urls}
									<WebSearchResults {status}>
										<div class="flex flex-col justify-center -space-y-0.5">
											<div class="shimmer text-base line-clamp-1 text-wrap">
												{status?.description}
											</div>
										</div>
									</WebSearchResults>
								{:else}
									<div class="flex flex-col justify-center -space-y-0.5">
										<div
											class="shimmer text-gray-500 dark:text-gray-500 text-base line-clamp-1 text-wrap"
										>
											{status?.description}
										</div>
									</div>
								{/if}
							</div>
						{/if}

						{#if edit === true}
							<div class="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl px-5 py-3 my-2">
								<textarea
									id="message-edit-{message.id}"
									bind:this={editTextAreaElement}
									class=" bg-transparent outline-none w-full resize-none"
									bind:value={editedContent}
									on:input={(e) => {
										e.target.style.height = '';
										e.target.style.height = `${e.target.scrollHeight}px`;
									}}
									on:keydown={(e) => {
										if (e.key === 'Escape') {
											document.getElementById('close-edit-message-button')?.click();
										}

										const isCmdOrCtrlPressed = e.metaKey || e.ctrlKey;
										const isEnterPressed = e.key === 'Enter';

										if (isCmdOrCtrlPressed && isEnterPressed) {
											document.getElementById('save-edit-message-button')?.click();
										}
									}}
								/>

								<div class=" mt-2 mb-1 flex justify-end space-x-1.5 text-sm font-medium">
									<button
										id="close-edit-message-button"
										class="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 transition rounded-3xl"
										on:click={() => {
											cancelEditMessage();
										}}
									>
										{$i18n.t('Cancel')}
									</button>

									<button
										id="save-edit-message-button"
										class=" px-4 py-2 bg-gray-900 hover:bg-gray-850 text-gray-100 transition rounded-3xl"
										on:click={() => {
											editMessageConfirmHandler();
										}}
									>
										{$i18n.t('Save')}
									</button>
								</div>
							</div>
						{:else}
							<div class="w-full flex flex-col">
								{#if message.content === '' && !message.error}
									<Skeleton />
								{:else if message.content && message.error !== true}
									<!-- always show message contents even if there's an error -->
									<!-- unless message.error === true which is legacy error handling, where the error message is stored in message.content -->
									<Markdown id={message.id} content={message.content} {model} />
								{/if}

								{#if message.error}
									<Error content={message?.error?.content ?? message.content} />
								{/if}

								{#if message.citations}
									<Citations citations={message.citations} />
								{/if}
							</div>
						{/if}
					</div>
				</div>

				{#if !edit}
					{#if message.done || siblings.length > 1}
						<div
							class=" flex justify-start overflow-x-auto buttons text-gray-600 dark:text-gray-500 mt-0.5"
						>
							{#if siblings.length > 1}
								<div class="flex self-center min-w-fit" dir="ltr">
									<button
										class="self-center p-1 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-black rounded-md transition"
										on:click={() => {
											showPreviousMessage(message);
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2.5"
											class="size-3.5"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M15.75 19.5 8.25 12l7.5-7.5"
											/>
										</svg>
									</button>

									<div
										class="text-sm tracking-widest font-semibold self-center dark:text-gray-100 min-w-fit"
									>
										{siblings.indexOf(message.id) + 1}/{siblings.length}
									</div>

									<button
										class="self-center p-1 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-black rounded-md transition"
										on:click={() => {
											showNextMessage(message);
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2.5"
											class="size-3.5"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="m8.25 4.5 7.5 7.5-7.5 7.5"
											/>
										</svg>
									</button>
								</div>
							{/if}

							{#if message.done}
								{#if !readOnly}
									{#if $user.role === 'user' ? ($config?.permissions?.chat?.editing ?? true) : true}
										<Tooltip content={$i18n.t('Edit')} placement="bottom">
											<button
												class="{isLastMessage
													? 'visible'
													: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition"
												on:click={() => {
													editMessageHandler();
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2.3"
													stroke="currentColor"
													class="w-4 h-4"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
													/>
												</svg>
											</button>
										</Tooltip>
									{/if}
								{/if}

								<Tooltip content={$i18n.t('Copy')} placement="bottom">
									<button
										class="{isLastMessage
											? 'visible'
											: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition copy-response-button"
										on:click={() => {
											copyToClipboard(message.content);
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2.3"
											stroke="currentColor"
											class="w-4 h-4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
											/>
										</svg>
									</button>
								</Tooltip>

								<Tooltip content={$i18n.t('Read Aloud')} placement="bottom">
									<button
										id="speak-button-{message.id}"
										class="{isLastMessage
											? 'visible'
											: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition"
										on:click={() => {
											if (!loadingSpeech) {
												toggleSpeakMessage();
											}
										}}
									>
										{#if loadingSpeech}
											<svg
												class=" w-4 h-4"
												fill="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
												><style>
													.spinner_S1WN {
														animation: spinner_MGfb 0.8s linear infinite;
														animation-delay: -0.8s;
													}
													.spinner_Km9P {
														animation-delay: -0.65s;
													}
													.spinner_JApP {
														animation-delay: -0.5s;
													}
													@keyframes spinner_MGfb {
														93.75%,
														100% {
															opacity: 0.2;
														}
													}
												</style><circle class="spinner_S1WN" cx="4" cy="12" r="3" /><circle
													class="spinner_S1WN spinner_Km9P"
													cx="12"
													cy="12"
													r="3"
												/><circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3" /></svg
											>
										{:else if speaking}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2.3"
												stroke="currentColor"
												class="w-4 h-4"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
												/>
											</svg>
										{:else}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2.3"
												stroke="currentColor"
												class="w-4 h-4"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
												/>
											</svg>
										{/if}
									</button>
								</Tooltip>

								{#if $config?.features.enable_image_generation && !readOnly}
									<Tooltip content={$i18n.t('Generate Image')} placement="bottom">
										<button
											class="{isLastMessage
												? 'visible'
												: 'invisible group-hover:visible'}  p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition"
											on:click={() => {
												if (!generatingImage) {
													generateImage(message);
												}
											}}
										>
											{#if generatingImage}
												<svg
													class=" w-4 h-4"
													fill="currentColor"
													viewBox="0 0 24 24"
													xmlns="http://www.w3.org/2000/svg"
													><style>
														.spinner_S1WN {
															animation: spinner_MGfb 0.8s linear infinite;
															animation-delay: -0.8s;
														}
														.spinner_Km9P {
															animation-delay: -0.65s;
														}
														.spinner_JApP {
															animation-delay: -0.5s;
														}
														@keyframes spinner_MGfb {
															93.75%,
															100% {
																opacity: 0.2;
															}
														}
													</style><circle class="spinner_S1WN" cx="4" cy="12" r="3" /><circle
														class="spinner_S1WN spinner_Km9P"
														cx="12"
														cy="12"
														r="3"
													/><circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3" /></svg
												>
											{:else}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2.3"
													stroke="currentColor"
													class="w-4 h-4"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
													/>
												</svg>
											{/if}
										</button>
									</Tooltip>
								{/if}

								{#if message.info}
									<Tooltip
										content={message.info.openai
											? `prompt_tokens: ${message.info.prompt_tokens ?? 'N/A'}<br/>
													completion_tokens: ${message.info.completion_tokens ?? 'N/A'}<br/>
													total_tokens: ${message.info.total_tokens ?? 'N/A'}`
											: `response_token/s: ${
													`${
														Math.round(
															((message.info.eval_count ?? 0) /
																((message.info.eval_duration ?? 0) / 1000000000)) *
																100
														) / 100
													} tokens` ?? 'N/A'
												}<br/>
					prompt_token/s: ${
						Math.round(
							((message.info.prompt_eval_count ?? 0) /
								((message.info.prompt_eval_duration ?? 0) / 1000000000)) *
								100
						) / 100 ?? 'N/A'
					} tokens<br/>
		            total_duration: ${
									Math.round(((message.info.total_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
								}ms<br/>
		            load_duration: ${
									Math.round(((message.info.load_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
								}ms<br/>
		            prompt_eval_count: ${message.info.prompt_eval_count ?? 'N/A'}<br/>
		            prompt_eval_duration: ${
									Math.round(((message.info.prompt_eval_duration ?? 0) / 1000000) * 100) / 100 ??
									'N/A'
								}ms<br/>
		            eval_count: ${message.info.eval_count ?? 'N/A'}<br/>
		            eval_duration: ${
									Math.round(((message.info.eval_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
								}ms<br/>
		            approximate_total: ${approximateToHumanReadable(message.info.total_duration ?? 0)}`}
										placement="top"
									>
										<Tooltip content={$i18n.t('Generation Info')} placement="bottom">
											<button
												class=" {isLastMessage
													? 'visible'
													: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition whitespace-pre-wrap"
												on:click={() => {
													console.log(message);
												}}
												id="info-{message.id}"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2.3"
													stroke="currentColor"
													class="w-4 h-4"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
													/>
												</svg>
											</button>
										</Tooltip>
									</Tooltip>
								{/if}

								{#if !readOnly}
									{#if $config?.features.enable_message_rating ?? true}
										<Tooltip content={$i18n.t('Good Response')} placement="bottom">
											<button
												class="{isLastMessage
													? 'visible'
													: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg {(message
													?.annotation?.rating ?? null) === 1
													? 'bg-gray-100 dark:bg-gray-800'
													: ''} dark:hover:text-white hover:text-black transition"
												on:click={async () => {
													await rateMessage(message.id, 1);

													(model?.actions ?? [])
														.filter((action) => action?.__webui__ ?? false)
														.forEach((action) => {
															dispatch('action', {
																id: action.id,
																event: {
																	id: 'good-response',
																	data: {
																		messageId: message.id
																	}
																}
															});
														});

													showRateComment = true;
													window.setTimeout(() => {
														document
															.getElementById(`message-feedback-${message.id}`)
															?.scrollIntoView();
													}, 0);
												}}
											>
												<svg
													stroke="currentColor"
													fill="none"
													stroke-width="2.3"
													viewBox="0 0 24 24"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="w-4 h-4"
													xmlns="http://www.w3.org/2000/svg"
													><path
														d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
													/></svg
												>
											</button>
										</Tooltip>

										<Tooltip content={$i18n.t('Bad Response')} placement="bottom">
											<button
												class="{isLastMessage
													? 'visible'
													: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg {(message
													?.annotation?.rating ?? null) === -1
													? 'bg-gray-100 dark:bg-gray-800'
													: ''} dark:hover:text-white hover:text-black transition"
												on:click={async () => {
													await rateMessage(message.id, -1);

													(model?.actions ?? [])
														.filter((action) => action?.__webui__ ?? false)
														.forEach((action) => {
															dispatch('action', {
																id: action.id,
																event: {
																	id: 'bad-response',
																	data: {
																		messageId: message.id
																	}
																}
															});
														});

													showRateComment = true;
													window.setTimeout(() => {
														document
															.getElementById(`message-feedback-${message.id}`)
															?.scrollIntoView();
													}, 0);
												}}
											>
												<svg
													stroke="currentColor"
													fill="none"
													stroke-width="2.3"
													viewBox="0 0 24 24"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="w-4 h-4"
													xmlns="http://www.w3.org/2000/svg"
													><path
														d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
													/></svg
												>
											</button>
										</Tooltip>
									{/if}

									{#if isLastMessage}
										<Tooltip content={$i18n.t('Continue Response')} placement="bottom">
											<button
												type="button"
												id="continue-response-button"
												class="{isLastMessage
													? 'visible'
													: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition regenerate-response-button"
												on:click={() => {
													continueGeneration();

													(model?.actions ?? [])
														.filter((action) => action?.__webui__ ?? false)
														.forEach((action) => {
															dispatch('action', {
																id: action.id,
																event: {
																	id: 'continue-response',
																	data: {
																		messageId: message.id
																	}
																}
															});
														});
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2.3"
													stroke="currentColor"
													class="w-4 h-4"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z"
													/>
												</svg>
											</button>
										</Tooltip>

										<Tooltip content={$i18n.t('Regenerate')} placement="bottom">
											<button
												type="button"
												class="{isLastMessage
													? 'visible'
													: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition regenerate-response-button"
												on:click={() => {
													showRateComment = false;
													regenerateResponse(message);

													(model?.actions ?? [])
														.filter((action) => action?.__webui__ ?? false)
														.forEach((action) => {
															dispatch('action', {
																id: action.id,
																event: {
																	id: 'regenerate-response',
																	data: {
																		messageId: message.id
																	}
																}
															});
														});
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2.3"
													stroke="currentColor"
													class="w-4 h-4"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
													/>
												</svg>
											</button>
										</Tooltip>

										{#each (model?.actions ?? []).filter((action) => !(action?.__webui__ ?? false)) as action}
											<Tooltip content={action.name} placement="bottom">
												<button
													type="button"
													class="{isLastMessage
														? 'visible'
														: 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition regenerate-response-button"
													on:click={() => {
														dispatch('action', action.id);
													}}
												>
													{#if action.icon_url}
														<img
															src={action.icon_url}
															class="w-4 h-4 {action.icon_url.includes('svg')
																? 'dark:invert-[80%]'
																: ''}"
															style="fill: currentColor;"
															alt={action.name}
														/>
													{:else}
														<Sparkles strokeWidth="2.1" className="size-4" />
													{/if}
												</button>
											</Tooltip>
										{/each}
									{/if}
								{/if}
							{/if}
						</div>
					{/if}
					<div class='flex flex-wrap justify-start'>
						{#if suggestUpdated}
							{#each suggestQuestionsList as suggestQuestion}
								<button
									class="visible p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition regenerate-response-button border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-blue-800 dark:text-cyan-300"
									style="flex: 0 1 auto; min-width: 50px; margin: 5px; text-align: left"
									on:click={() => {
										submitPrompt(suggestQuestion);
									}}
								>
									{suggestQuestion}
								</button>
							{/each}
							{#if suggestQuestionsList.some(question => ["感统", "感觉统合", "发育迟缓"]
								.some(keyword => question.includes(keyword))) || ["感统", "感觉统合", "发育迟缓"]
								.some(keyword => recentMessages.includes(keyword))}
								<button
									class="visible p-1.5 hover:bg-purple-600 dark:hover:bg-purple-800 rounded-lg dark:hover:text-white hover:text-white transition regenerate-response-button border border-purple-300 dark:border-purple-600 bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-300"
									style="flex: 0 1 auto; min-width: 50px; margin: 5px;"
									on:click={() => {
										if ($mobile) {
											window.location.href = "/recommend";
										} else {
											window.open("/recommend", "_blank");
										}
									}}
								>
									推荐感统治疗机构
								</button>
							{/if}
							{#if suggestQuestionsList.some(question => ["医", "治", "疗", "疼", "痛", "诊"].some(keyword => question.includes(keyword)))}
								<button
									class="visible p-1.5 hover:bg-purple-600 dark:hover:bg-purple-800 rounded-lg dark:hover:text-white hover:text-white transition regenerate-response-button border border-purple-300 dark:border-purple-600 bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-300"
									style="flex: 0 1 auto; min-width: 50px; margin: 5px;"
									on:click={() => {
										fetchNearbyPlaces("医院");
									}}
								>
									搜索周边医院
								</button>
							{/if}
						{/if}
					</div>
					<style>
						:root {
							--bg-color-light: #f2f2f2;
							--text-color-light: #333;
							--bg-color-dark: #333;
							--text-color-dark: #fff;
						}

						/* 默认浅色主题 */
						.table-container {
							width: 100%;
							max-height: 200px; /* 控制容器的最大高度为5行 */
							overflow-y: auto; /* 启用垂直滚动条 */
							border: 1px solid #ddd;
							border-radius: 5px;
							display: block;
						}

						table {
							width: 100%;
							border-collapse: collapse; /* 合并表格边框 */
						}

						th, td {
							border: 1px solid #ddd;
							padding: 8px; /* 控制内边距 */
							text-align: left; /* 左对齐文本 */
						}

						tr:hover {
							background-color: #f5f5f5; /* 鼠标悬停时的背景色 */
						}

						th {
							background-color: var(--bg-color-light); /* 使用变量 */
							color: var(--text-color-light); /* 使用变量 */
							position: sticky; /* 固定表头 */
							top: 0; /* 表头固定在顶部 */
							z-index: 1; /* 确保表头在其他内容上方 */
						}

						/* 深色主题 */
						@media (prefers-color-scheme: dark) {
							th {
								background-color: var(--bg-color-dark); /* 使用变量 */
								color: var(--text-color-dark); /* 使用变量 */
							}
						}
					</style>
					{#if hospitals.length > 0}
						<div class="table-container">
							<table>
								<thead>
									<tr>
										<th>医院名称</th>
										<th>地址</th>
									</tr>
								</thead>
								<tbody>
									{#each hospitals as hospital}
										<tr on:click={() => handleClick(hospital)}>
											<td>{hospital.name}</td>
											<td>{hospital.address}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
					{#if message.done && showRateComment}
						<RateComment
							messageId={message.id}
							bind:show={showRateComment}
							bind:message
							on:submit={(e) => {
								updateChatMessages();

								(model?.actions ?? [])
									.filter((action) => action?.__webui__ ?? false)
									.forEach((action) => {
										dispatch('action', {
											id: action.id,
											event: {
												id: 'rate-comment',
												data: {
													messageId: message.id,
													comment: e.detail.comment,
													reason: e.detail.reason
												}
											}
										});
									});
							}}
						/>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/key}

<style>
	.buttons::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.buttons {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.shimmer {
		background: linear-gradient(90deg, #9a9b9e 25%, #2a2929 50%, #9a9b9e 75%);
		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shimmer 4s linear infinite;
		color: #818286; /* Fallback color */
	}

	:global(.dark) .shimmer {
		background: linear-gradient(90deg, #818286 25%, #eae5e5 50%, #818286 75%);
		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shimmer 4s linear infinite;
		color: #a1a3a7; /* Darker fallback color for dark mode */
	}

	@keyframes smoothFadeIn {
		0% {
			opacity: 0;
			transform: translateY(-10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.status-description {
		animation: smoothFadeIn 0.2s forwards;
	}
</style>
