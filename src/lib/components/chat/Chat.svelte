<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import { toast } from 'svelte-sonner';
	import mermaid from 'mermaid';

	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import type { Unsubscriber, Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import PullToRefresh from '$lib/components/common/PullToRefresh.svelte';
	import {
		chatId,
		chats,
		config,
		type Model,
		models,
		settings,
		showSidebar,
		WEBUI_NAME,
		banners,
		user,
		socket,
		showCallOverlay,
		currentChatPage,
		temporaryChatEnabled
	} from '$lib/stores';

	import {
		convertMessagesToHistory,
		copyToClipboard,
		getMessageContentParts,
		extractSentencesForAudio,
		promptTemplate,
		splitStream
	} from '$lib/utils';

	import { generateChatCompletion } from '$lib/apis/ollama';
	import {
		createNewChat,
		getChatById,
		getChatList,
		getTagsById,
		updateChatById
	} from '$lib/apis/chats';
	import { judgeGenerateImageIntention, translatePrompt, generateOpenAIChatCompletion } from '$lib/apis/openai';
	import { runWebSearch, processDocToQAQuestions, GetQAAnswer } from '$lib/apis/rag';
	import { createOpenAITextStream } from '$lib/apis/streaming';
	import { queryMemory } from '$lib/apis/memories';
	import { getAndUpdateUserLocation, getUserSettings } from '$lib/apis/users';
	import {
		chatCompleted,
		generateTitle,
		generateSearchQuery,
		chatAction,
		generateMoACompletion,
		generateSuggestQuestions
	} from '$lib/apis';

	import Banner from '../common/Banner.svelte';
	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import Messages from '$lib/components/chat/Messages.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import ChatControls from './ChatControls.svelte';
	import EventConfirmDialog from '../common/ConfirmDialog.svelte';

	import { addNewMemory } from '$lib/apis/memories';
	import { imageGenerations } from '$lib/apis/images';
	import { chatCompletionSimple } from '$lib/apis/openai';
	import { modelPrices } from '$lib/constants';

	const i18n: Writable<i18nType> = getContext('i18n');

	export let chatIdProp = '';
	let loaded = false;
	const eventTarget = new EventTarget();

	let showControls = false;
	let stopResponseFlag = false;
	let autoScroll = true;
	let processing = '';
	let messagesContainerElement: HTMLDivElement;

	let showEventConfirmation = false;
	let eventConfirmationTitle = '';
	let eventConfirmationMessage = '';
	let eventConfirmationInput = false;
	let eventConfirmationInputPlaceholder = '';
	let eventConfirmationInputValue = '';
	let eventCallback = null;

	let showModelSelector = true;

	let selectedModels = [''];
	let atSelectedModel: Model | undefined;

	let selectedModelIds = [];
	$: selectedModelIds = atSelectedModel !== undefined ? [atSelectedModel.id] : selectedModels;

	let selectedToolIds = [];
	let webSearchEnabled = false;
	let generateImageEnabled = false;
	let chat = null;
	let tags = [];

	let title = '';
	let prompt = '';

	let chatFiles = [];
	let files = [];
	let messages = [];
	let history = {
		messages: {},
		currentId: null
	};

	let params = {};
	let mrToMemory = false;
	let suggestQuestionsList;
	let callRecordStream :MediaStream;
	let preQA = false;
	let qaQuestions = '';
	let notified = false;
	let qaQuestionsMap = new Map<number, string>();

	// TODO: 识别用户的意图来决定是否生成图片,还有混合意图的处理,比如既生成图片,又回答问题,需要模型有视觉能力
	const genImageKeywords = [
		/^生成.*图片.*/,
		/^生成.*图像.*/,
		/^生成.*照片.*/,
		/^generate.*image.*/i, // 使用正则表达式匹配 "generate a .... image 忽略大小写"
	];

	let chatIdUnsubscriber: Unsubscriber | undefined;

	$: if (history.currentId !== null) {
		let _messages = [];

		let currentMessage = history.messages[history.currentId];
		while (currentMessage !== null) {
			_messages.unshift({ ...currentMessage });
			currentMessage =
				currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
		}
		messages = _messages;
	} else {
		messages = [];
	}

	$: if (chatIdProp) {
		(async () => {
			console.log(chatIdProp);
			if (chatIdProp && (await loadChat())) {
				await tick();
				loaded = true;

				window.setTimeout(() => scrollToBottom(), 0);
				const chatInput = document.getElementById('chat-textarea');
				chatInput?.focus();
			} else {
				await goto('/');
			}
		})();
	}

	const chatEventHandler = async (event, cb) => {
		if (event.chat_id === $chatId) {
			await tick();
			console.log(event);
			let message = history.messages[event.message_id];

			const type = event?.data?.type ?? null;
			const data = event?.data?.data ?? null;

			if (type === 'status') {
				if (message?.statusHistory) {
					message.statusHistory.push(data);
				} else {
					message.statusHistory = [data];
				}
			} else if (type === 'citation') {
				if (message?.citations) {
					message.citations.push(data);
				} else {
					message.citations = [data];
				}
			} else if (type === 'message') {
				message.content += data.content;
			} else if (type === 'replace') {
				message.content = data.content;
			} else if (type === 'action') {
				if (data.action === 'continue') {
					const continueButton = document.getElementById('continue-response-button');

					if (continueButton) {
						continueButton.click();
					}
				}
			} else if (type === 'confirmation') {
				eventCallback = cb;

				eventConfirmationInput = false;
				showEventConfirmation = true;

				eventConfirmationTitle = data.title;
				eventConfirmationMessage = data.message;
			} else if (type === 'input') {
				eventCallback = cb;

				eventConfirmationInput = true;
				showEventConfirmation = true;

				eventConfirmationTitle = data.title;
				eventConfirmationMessage = data.message;
				eventConfirmationInputPlaceholder = data.placeholder;
				eventConfirmationInputValue = data?.value ?? '';
			} else {
				console.log('Unknown message type', data);
			}

			messages = messages;
		}
	};

	const onMessageHandler = async (event: {
		origin: string;
		data: { type: string; text: string };
	}) => {
		if (event.origin !== window.origin) {
			return;
		}

		// Replace with your iframe's origin
		if (event.data.type === 'input:prompt') {
			console.debug(event.data.text);

			const inputElement = document.getElementById('chat-textarea');

			if (inputElement) {
				prompt = event.data.text;
				inputElement.focus();
			}
		}

		if (event.data.type === 'action:submit') {
			console.debug(event.data.text);

			if (prompt !== '') {
				await tick();
				submitPrompt(prompt);
			}
		}

		if (event.data.type === 'input:prompt:submit') {
			console.debug(event.data.text);

			if (prompt !== '') {
				await tick();
				submitPrompt(event.data.text);
			}
		}
	};

	onMount(async () => {
		const script = document.createElement('script');
		script.src = 'https://assets.salesmartly.com/js/project_110907_115361_1724377087.js';
		script.async = true;
		document.body.appendChild(script);

		window.addEventListener('message', onMessageHandler);
		$socket?.on('chat-events', chatEventHandler);

		if (!$chatId) {
			chatIdUnsubscriber = chatId.subscribe(async (value) => {
				if (!value) {
					await initNewChat();
				}
			});
		} else {
			if ($temporaryChatEnabled) {
				await goto('/');
			}
		}
	});

	onDestroy(() => {
		chatIdUnsubscriber?.();
		window.removeEventListener('message', onMessageHandler);
		$socket?.off('chat-events');
	});

	//////////////////////////
	// Web functions
	//////////////////////////

	const initNewChat = async () => {
		if ($page.url.pathname.includes('/c/')) {
			window.history.replaceState(history.state, '', `/`);
		}

		await chatId.set('');
		autoScroll = true;

		title = '';
		messages = [];
		history = {
			messages: {},
			currentId: null
		};

		chatFiles = [];
		params = {};

		if ($page.url.searchParams.get('models')) {
			selectedModels = $page.url.searchParams.get('models')?.split(',');
		} else if ($settings?.models) {
			selectedModels = $settings?.models;
		} else if ($config?.default_models) {
			console.log($config?.default_models.split(',') ?? '');
			selectedModels = $config?.default_models.split(',');
		} else {
			selectedModels = [''];
		}

		if ($page.url.searchParams.get('web-search') === 'true') {
			webSearchEnabled = true;
		}

		if ($page.url.searchParams.get('q')) {
			prompt = $page.url.searchParams.get('q') ?? '';
			selectedToolIds = ($page.url.searchParams.get('tool_ids') ?? '')
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id);

			if (prompt) {
				await tick();
				submitPrompt(prompt);
			}
		}

		if ($page.url.searchParams.get('call') === 'true') {
			showCallOverlay.set(true);
		}

		selectedModels = selectedModels.map((modelId) =>
			$models.map((m) => m.id).includes(modelId) ? modelId : ''
		);

		const userSettings = await getUserSettings(localStorage.token);

		if (userSettings) {
			settings.set(userSettings.ui);
		} else {
			settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));
		}
		console.log('initnewchat settings:', $settings);

		const chatInput = document.getElementById('chat-textarea');
		setTimeout(() => chatInput?.focus(), 0);
	};

	const loadChat = async () => {
		chatId.set(chatIdProp);
		chat = await getChatById(localStorage.token, $chatId).catch(async (error) => {
			await goto('/');
			return null;
		});

		if (chat) {
			tags = await getTags();
			const chatContent = chat.chat;

			if (chatContent) {
				console.log(chatContent);

				selectedModels =
					(chatContent?.models ?? undefined) !== undefined
						? chatContent.models
						: [chatContent.models ?? ''];
				history =
					(chatContent?.history ?? undefined) !== undefined
						? chatContent.history
						: convertMessagesToHistory(chatContent.messages);
				title = chatContent.title;

				const userSettings = await getUserSettings(localStorage.token);

				if (userSettings) {
					await settings.set(userSettings.ui);
				} else {
					await settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));
				}

				params = chatContent?.params ?? {};
				chatFiles = chatContent?.files ?? [];

				autoScroll = true;
				await tick();

				if (messages.length > 0) {
					history.messages[messages.at(-1).id].done = true;
				}
				await tick();

				return true;
			} else {
				return null;
			}
		}
	};

	const scrollToBottom = async () => {
		await tick();
		if (messagesContainerElement) {
			messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
		}
	};

	const createMessagesList = (responseMessageId) => {
		const message = history.messages[responseMessageId];
		if (message.parentId) {
			return [...createMessagesList(message.parentId), message];
		} else {
			return [message];
		}
	};

	const chatCompletedHandler = async (chatId, modelId, responseMessageId, messages) => {
		await mermaid.run({
			querySelector: '.mermaid'
		});

		const res = await chatCompleted(localStorage.token, {
			model: modelId,
			messages: messages.map((m) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				info: m.info ? m.info : undefined,
				timestamp: m.timestamp
			})),
			chat_id: chatId,
			session_id: $socket?.id,
			id: responseMessageId
		}).catch((error) => {
			toast.error(error);
			messages.at(-1).error = { content: error };

			return null;
		});

		if (res !== null) {
			// Update chat history with the new messages
			for (const message of res.messages) {
				history.messages[message.id] = {
					...history.messages[message.id],
					...(history.messages[message.id].content !== message.content
						? { originalContent: history.messages[message.id].content }
						: {}),
					...message
				};
			}
		}

		if ($chatId == chatId) {
			if (!$temporaryChatEnabled) {
				chat = await updateChatById(localStorage.token, chatId, {
					models: selectedModels,
					messages: messages,
					history: history,
					params: params,
					files: chatFiles
				});

				currentChatPage.set(1);
				await chats.set(await getChatList(localStorage.token, $currentChatPage));
			}
		}
	};

	const chatActionHandler = async (chatId, actionId, modelId, responseMessageId, event = null) => {
		const res = await chatAction(localStorage.token, actionId, {
			model: modelId,
			messages: messages.map((m) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				info: m.info ? m.info : undefined,
				timestamp: m.timestamp
			})),
			...(event ? { event: event } : {}),
			chat_id: chatId,
			session_id: $socket?.id,
			id: responseMessageId
		}).catch((error) => {
			toast.error(error);
			messages.at(-1).error = { content: error };
			return null;
		});

		if (res !== null) {
			// Update chat history with the new messages
			for (const message of res.messages) {
				history.messages[message.id] = {
					...history.messages[message.id],
					...(history.messages[message.id].content !== message.content
						? { originalContent: history.messages[message.id].content }
						: {}),
					...message
				};
			}
		}

		if ($chatId == chatId) {
			if (!$temporaryChatEnabled) {
				chat = await updateChatById(localStorage.token, chatId, {
					models: selectedModels,
					messages: messages,
					history: history,
					params: params,
					files: chatFiles
				});

				currentChatPage.set(1);
				await chats.set(await getChatList(localStorage.token, $currentChatPage));
			}
		}
	};

	const getChatEventEmitter = async (modelId: string, chatId: string = '') => {
		return setInterval(() => {
			$socket?.emit('usage', {
				action: 'chat',
				model: modelId,
				chat_id: chatId
			});
		}, 1000);
	};

	//////////////////////////
	// Chat functions
	//////////////////////////

	const submitPrompt = async (userPrompt, { _raw = false } = {}) => {
		let _responses = [];
		console.log('submitPrompt', $chatId);

		selectedModels = selectedModels.map((modelId) =>
			$models.map((m) => m.id).includes(modelId) ? modelId : ''
		);

		if (selectedModels.includes('')) {
			toast.error($i18n.t('Model not selected'));
		} else if (messages.length != 0 && messages.at(-1).done != true) {
			// Response not done
			console.log('wait');
		} else if (messages.length != 0 && messages.at(-1).error) {
			// Error in response
			toast.error(
				$i18n.t(
					`Oops! There was an error in the previous response. Please try again or contact admin.`
				)
			);
		} else if (
			files.length > 0 &&
			files.filter((file) => file.type !== 'image' && file.status !== 'processed').length > 0
		) {
			// Upload not done
			toast.error(
				$i18n.t(
					`Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
				)
			);
		} else if (
			($config?.file?.max_count ?? null) !== null &&
			files.length + chatFiles.length > $config?.file?.max_count
		) {
			console.log(chatFiles.length, files.length);
			toast.error(
				$i18n.t(`You can only chat with a maximum of {{maxCount}} file(s) at a time.`, {
					maxCount: $config?.file?.max_count
				})
			);
		} else {
			// Reset chat input textarea
			const chatTextAreaElement = document.getElementById('chat-textarea');

			if (chatTextAreaElement) {
				chatTextAreaElement.value = '';
				chatTextAreaElement.style.height = '';
			}

			const _files = JSON.parse(JSON.stringify(files));
			chatFiles.push(..._files.filter((item) => ['doc', 'file', 'collection'].includes(item.type)));
			chatFiles = chatFiles.filter(
				// Remove duplicates
				(item, index, array) =>
					array.findIndex((i) => JSON.stringify(i) === JSON.stringify(item)) === index
			);

			files = [];

			prompt = '';

			// Create user message
			let userMessageId = uuidv4();
			let userMessage = {
				id: userMessageId,
				parentId: messages.length !== 0 ? messages.at(-1).id : null,
				childrenIds: [],
				role: 'user',
				content: userPrompt,
				files: _files.length > 0 ? _files : undefined,
				timestamp: Math.floor(Date.now() / 1000), // Unix epoch
				models: selectedModels
			};

			// Add message to history and Set currentId to messageId
			history.messages[userMessageId] = userMessage;
			history.currentId = userMessageId;

			// Append messageId to childrenIds of parent message
			if (messages.length !== 0) {
				history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
			}

			// Wait until history/message have been updated
			await tick();
			_responses = await sendPrompt(userPrompt, userMessageId, { newChat: true });
		}

		return _responses;
	};

	function isPureEnglish(str) {
		return /^[\x00-\x7F]*$/.test(str);
	}

	const generateImage = async (responseMessage, userPrompt: string) => {
		console.log('start generate image by send prompt:', userPrompt);
		let _response = null;
		const _chatId = JSON.parse(JSON.stringify($chatId));
		scrollToBottom();

		let promptUsed = await translatePrompt(userPrompt, responseMessage.model);
		const res = await imageGenerations(localStorage.token, promptUsed).catch((error) => {
			toast.error(error);
		});
		console.log(res);

		if (res) {
			responseMessage.files = res.map((image) => ({
				type: 'image',
				url: `${image.url}`
			}));
			responseMessage.content = null;
			responseMessage.done = true;
			_response = responseMessage.content;

			// dispatch('save', message);
			console.log('add image to responseMessage:', responseMessage);

			history.messages[responseMessage.id] = responseMessage;
			await updateChatById(localStorage.token, _chatId, {
				messages: messages,
				history: history
			});
		}

		scrollToBottom();
		if (messages.length == 2) {
			window.history.replaceState(history.state, '', `/c/${_chatId}`);

			const _title = await generateChatTitle(userPrompt);
			await setChatTitle(_chatId, _title);
		}
		return _response;
	};

	const wantGenerateImage = async (prompt, modelId) => {
		let intention = false;
		let containsKeyword = false;
		if (!$showCallOverlay && $config?.features.enable_image_generation && !generateImageEnabled && ($settings?.autoJudgeGenerateImage ?? false)) {
			if (prompt.length < 20) {
				intention = await judgeGenerateImageIntention(prompt, modelId);
				console.log('judgeIntention ret:', intention);
			}
		}
		if (!intention) {
			containsKeyword = genImageKeywords.some(keyword => {
				if (keyword instanceof RegExp) {
					if (keyword.test(prompt)) {
						return true;
					}
				}
				return false;
			});
			console.log('containsKeyword:', containsKeyword);
		}
		return intention || containsKeyword;
	};

	const getAnswerFromQA = async (
		prompt: string,
		model,
		responseMessageId = '',
		brief = true
	) => {
		let _response = null;
		let detailedResponse = await chatCompletionSimple(`从下面的问题列表中找出于用户问题最相近的问题编号，找不到返回0。人类的问题：${prompt}, 问题列表：${qaQuestions}`, model.id);
		console.log('detailedResponse is:', detailedResponse);
		// 正则表达式匹配数字
		const regex = /\d+/;

		// 使用正则表达式匹配字符串
		let match = regex.exec(detailedResponse);
		let questionIndex = 0;
		if (match) {
			// 提取匹配到的第一个数字，即编号,并确保其为数字类型
			questionIndex = parseInt(match[0], 10);
			console.log("提取到的编号是:", questionIndex);
		} else {
			console.log("没有找到编号");
		}
		if (questionIndex !== 0) {
			const responseMessage = history.messages[responseMessageId];
			const _chatId = JSON.parse(JSON.stringify($chatId));

			let answerRes = await GetQAAnswer(localStorage.token, questionIndex);
			console.log("answer is:", answerRes);
			if (answerRes && 'answer' in answerRes) {
				let res, controller;
				if (!brief) {
					return answerRes.answer;
				}
				qaQuestionsMap.delete(questionIndex);
				preQA = true;
				// ----------------- 以下是copy自sendPromptOpenAI，模拟生成消息的后处理 ------------------
				scrollToBottom();
				eventTarget.dispatchEvent(
					new CustomEvent('chat:start', {
						detail: {
							id: responseMessageId
						}
					})
				);
				await tick();

				[res, controller] = await generateOpenAIChatCompletion(
					localStorage.token,
					{
						stream: true,
						model: model.id,
						stream_options:
						(model.info?.meta?.capabilities?.usage ?? false)
							? {
								include_usage: true
							}
						: undefined,
						messages: [
							{
								role: 'user',
								content: `下面这段话有哪些关键点，列出关键点标题即可：${answerRes.answer}`
							}
						]
							.filter((message) => message?.content?.trim())
							.map((message, idx, arr) => ({
								role: message.role,
								...((message.files?.filter((file) => file.type === 'image').length > 0 ?? false) &&
									message.role === 'user'
									? {
										content: [
											{
												type: 'text',
												text:
												arr.length - 1 !== idx
													? message.content
													: (message?.raContent ?? message.content)
											},
											...message.files
												.filter((file) => file.type === 'image')
												.map((file) => ({
													type: 'image_url',
													image_url: {
														url: file.url
													}
												}))
										]
									}
									: {
										content:
										arr.length - 1 !== idx
											? message.content
											: (message?.raContent ?? message.content)
									})
							})),
						seed: params?.seed ?? $settings?.params?.seed ?? undefined,
						stop:
							(params?.stop ?? $settings?.params?.stop ?? undefined)
							? (params?.stop.split(',').map((token) => token.trim()) ?? $settings.params.stop).map(
								(str) => decodeURIComponent(JSON.parse('"' + str.replace(/\"/g, '\\"') + '"'))
							)
							: undefined,
						temperature: params?.temperature ?? $settings?.params?.temperature ?? undefined,
						top_p: params?.top_p ?? $settings?.params?.top_p ?? undefined,
						frequency_penalty:
							params?.frequency_penalty ?? $settings?.params?.frequency_penalty ?? undefined,
						max_tokens: params?.max_tokens ?? $settings?.params?.max_tokens ?? undefined,
						tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
						files: files.length > 0 ? files : undefined,
						session_id: $socket?.id,
						chat_id: $chatId,
						id: responseMessageId
					},
					`${WEBUI_BASE_URL}/api`
				);
				// TODO undefined没生效
				// res = await chatCompletionSimpleStream(`下面这段话有哪些关键点，列出关键点标题即可：${answerRes.answer}`,
													   // model.id, responseMessageId, $chatId, $socket?.id);
				console.log('brief Res is:', res);

				await tick();

				scrollToBottom();

				if (res && res.ok && res.body) {
					const textStream = await createOpenAITextStream(res.body, $settings.splitLargeChunks);

					for await (const update of textStream) {
						const { value, done, citations, error, usage } = update;
						if (error) {
							await handleOpenAIError(error, null, model, responseMessage);
							break;
						}
						if (done || stopResponseFlag || _chatId !== $chatId) {
							responseMessage.done = true;
							messages = messages;

							if (stopResponseFlag) {
								controller.abort('User: Stop Response');
							} else {
								const messages = createMessagesList(responseMessageId);

								await chatCompletedHandler(_chatId, model.id, responseMessageId, messages);
							}

							_response = responseMessage.content;

							break;
						}

						if (usage) {
							responseMessage.info = { ...usage, openai: true };
						}

						if (citations) {
							responseMessage.citations = citations;
							continue;
						}

						if (responseMessage.content == '' && value == '\n') {
							continue;
						} else {
							responseMessage.content += value;

							if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
								navigator.vibrate(5);
							}

							const sentences = extractSentencesForAudio(responseMessage.content);
							sentences.pop();

							// dispatch only last sentence and make sure it hasn't been dispatched before
							if (
								sentences.length > 0 &&
									sentences[sentences.length - 1] !== responseMessage.lastSentence
							) {
								responseMessage.lastSentence = sentences[sentences.length - 1];
								eventTarget.dispatchEvent(
									new CustomEvent('chat', {
										detail: { id: responseMessageId, content: sentences[sentences.length - 1] }
									})
								);
							}

							messages = messages;
						}

						if (autoScroll) {
							scrollToBottom();
						}
					}

					if ($settings.notificationEnabled && !document.hasFocus()) {
						const notification = new Notification(`${model.id}`, {
							body: responseMessage.content,
							icon: `${WEBUI_BASE_URL}/static/favicon.png`
						});
					}

					if ($settings.responseAutoCopy) {
						copyToClipboard(responseMessage.content);
					}

					if ($settings.responseAutoPlayback && !$showCallOverlay) {
						await tick();

						document.getElementById(`speak-button-${responseMessage.id}`)?.click();
					}

					if ($chatId == _chatId) {
						if (!$temporaryChatEnabled) {
							chat = await updateChatById(localStorage.token, _chatId, {
								models: selectedModels,
								messages: messages,
								history: history,
								params: params,
								files: chatFiles
							});

							currentChatPage.set(1);
							await chats.set(await getChatList(localStorage.token, $currentChatPage));
						}
					}
				} else {
					await handleOpenAIError(null, res, model, responseMessage);
				}

				messages = messages;

				stopResponseFlag = false;
				await tick();

				let lastSentence = extractSentencesForAudio(responseMessage.content)?.at(-1) ?? '';
				if (lastSentence) {
					eventTarget.dispatchEvent(
						new CustomEvent('chat', {
							detail: { id: responseMessageId, content: lastSentence }
						})
					);
				}

				eventTarget.dispatchEvent(
					new CustomEvent('chat:finish', {
						detail: {
							id: responseMessageId,
							content: responseMessage.content
						}
					})
				);

				if (autoScroll) {
					scrollToBottom();
				}

				if (messages.length == 2 && selectedModels[0] === model.id) {
					window.history.replaceState(history.state, '', `/c/${_chatId}`);

					const _title = await generateChatTitle(prompt);
					await setChatTitle(_chatId, _title);
				}

				if (!$showCallOverlay && messages.length >= 2 && messages.at(-1).done == true) {
					console.log('剩余的问题个数:', qaQuestionsMap.size);
					if (qaQuestionsMap.size > 0) {
						suggestQuestionsList = getRandomQuestions(qaQuestionsMap, 3);
						console.log('suggestQuestionsList for preQA:', suggestQuestionsList);
					} else if (!notified) {
						notified = true;
						toast.success('所有常见问题都已经回答过了');
					}
				}

				scrollToBottom();
			}
		}
		return _response;
	};

	function parseQuestions(input: string): Map<number, string> {
		const questionMap = new Map<number, string>();
		const lines = input.trim().split('\n');

		lines.forEach(line => {
			const [key, value] = line.split(': ');
			const questionNumber = parseInt(key, 10);
			if (!isNaN(questionNumber)) {
				questionMap.set(questionNumber, value);
			}
		});

		return questionMap;
	}

	function getRandomQuestions(questionMap: Map<number, string>, count: number): string[] {
		const keys = Array.from(questionMap.keys());
		const randomQuestions = [];

		for (let i = 0; i < count; i++) {
			if (keys.length === 0) break; // 如果所有键都已经被使用，则退出循环
			const randomIndex = Math.floor(Math.random() * keys.length);
			const randomKey = keys[randomIndex];
			randomQuestions.push(questionMap.get(randomKey)!);
			// questionMap.delete(randomKey);
			keys.splice(randomIndex, 1); // 从 keys 数组中移除已使用的键
		}

		return randomQuestions;
	}
	async function shutResponse(responseMessageId) {
		let _response = null;
		const responseMessage = history.messages[responseMessageId];

		showCallOverlay.set(false);
		showControls = false;
		eventTarget.dispatchEvent(
			new CustomEvent('chat:start', {
				detail: {
					id: responseMessageId
				}
			})
		);
		await tick();
		responseMessage.done = true;
		messages = messages;
		_response = responseMessage.content;
		eventTarget.dispatchEvent(
			new CustomEvent('chat:finish', {
				detail: {
					id: responseMessageId,
					content: responseMessage.content
				}
			})
		);
		return _response;
	}


	async function isAmountSufficient(model) {
		let sufficient = true;
		let pricePair = modelPrices[model.id];
		if (!pricePair) { // 没价格的就当是免费
			return sufficient;
		}
		try {
			const userSettings = await getUserSettings(localStorage.token);
			if (userSettings) {
				await settings.set(userSettings.ui);
			} else {
				await settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));
			}
		} catch (error) {
			console.error("Failed to get user settings:", error);
			toast.error($i18n.t('Get balance fail, contact the admin'));
			return;
		}
		console.log('isAmountSufficient start settings:', $settings);

		if ($settings?.balance?.amount) {
			if ($settings.balance.amount < 0.01) {
				let pricePair = modelPrices[model.id];
				if (pricePair.input > 0 || pricePair.output > 0) {
					const balanceAmount = $settings.balance.amount.toString();
					const decimalIndex = balanceAmount.indexOf('.');
					const truncatedAmount = decimalIndex !== -1
						  ? balanceAmount.slice(0, decimalIndex + 4) // 截取到小数点后3位
						  : balanceAmount; // 如果没有小数点，则直接返回原值

					toast.error(`余额(${truncatedAmount})不足1分钱，请充值或者选择免费的模型`);
					sufficient = false;
				}
			}
		} else {
			sufficient = false;
			toast.error($i18n.t('Get balance fail, contact the admin'));
		}
		console.log('sufficient:', sufficient);
		return sufficient;
	}

	const sendPrompt = async (
		prompt: string,
		parentId: string,
		{ modelId = null, modelIdx = null, newChat = false } = {}
	) => {
		let _responses: string[] = [];

		// If modelId is provided, use it, else use selected model
		let selectedModelIds = modelId
			? [modelId]
			: atSelectedModel !== undefined
				? [atSelectedModel.id]
				: selectedModels;

		// Create response messages for each selected model
		const responseMessageIds: Record<PropertyKey, string> = {};
		for (const [_modelIdx, modelId] of selectedModelIds.entries()) {
			const model = $models.filter((m) => m.id === modelId).at(0);

			if (model) {
				let responseMessageId = uuidv4();
				let responseMessage = {
					parentId: parentId,
					id: responseMessageId,
					childrenIds: [],
					role: 'assistant',
					content: '',
					model: model.id,
					modelName: model.name ?? model.id,
					modelIdx: modelIdx ? modelIdx : _modelIdx,
					userContext: null,
					timestamp: Math.floor(Date.now() / 1000) // Unix epoch
				};

				// Add message to history and Set currentId to messageId
				history.messages[responseMessageId] = responseMessage;
				history.currentId = responseMessageId;

				// Append messageId to childrenIds of parent message
				if (parentId !== null) {
					history.messages[parentId].childrenIds = [
						...history.messages[parentId].childrenIds,
						responseMessageId
					];
				}

				responseMessageIds[`${modelId}-${modelIdx ? modelIdx : _modelIdx}`] = responseMessageId;
			}
		}
		await tick();

		// Create new chat if only one message in messages
		if (newChat && messages.length == 2) {
			if (!$temporaryChatEnabled) {
				chat = await createNewChat(localStorage.token, {
					id: $chatId,
					title: $i18n.t('New Chat'),
					models: selectedModels,
					system: $settings.system ?? undefined,
					params: params,
					messages: messages,
					history: history,
					tags: [],
					timestamp: Date.now()
				});

				currentChatPage.set(1);
				await chats.set(await getChatList(localStorage.token, $currentChatPage));
				await chatId.set(chat.id);
			} else {
				await chatId.set('local');
			}
			await tick();
		}

		const _chatId = JSON.parse(JSON.stringify($chatId));

		await Promise.all(
			selectedModelIds.map(async (modelId, _modelIdx) => {
				console.log('modelId', modelId);
				const model = $models.filter((m) => m.id === modelId).at(0);

				if (model) {
					// If there are image files, check if model is vision capable
					const hasImages = messages.some((message) =>
						message.files?.some((file) => file.type === 'image')
					);

					if (hasImages && !(model.info?.meta?.capabilities?.vision ?? true)) {
						toast.error(
							$i18n.t('Model {{modelName}} is not vision capable', {
								modelName: model.name ?? model.id
							})
						);
					}

					let responseMessageId =
						responseMessageIds[`${modelId}-${modelIdx ? modelIdx : _modelIdx}`];
					let responseMessage = history.messages[responseMessageId];

					let userContext = null;
					if ($settings?.memory ?? false) {
						if (userContext === null) {
							const res = await queryMemory(localStorage.token, prompt).catch((error) => {
								toast.error(error);
								return null;
							});
							if (res) {
								if (res.documents[0].length > 0) {
									userContext = res.documents[0].reduce((acc, doc, index) => {
										const createdAtTimestamp = res.metadatas[0][index].created_at;
										const createdAtDate = new Date(createdAtTimestamp * 1000)
											.toISOString()
											.split('T')[0];
										return `${acc}${index + 1}. [${createdAtDate}]. ${doc}\n`;
									}, '');
								}

								console.log(userContext);
							}
						}
					}
					responseMessage.userContext = userContext;

					const chatEventEmitter = await getChatEventEmitter(model.id, _chatId);

					scrollToBottom();
					if (webSearchEnabled) {
						await getWebSearchResults(model.id, parentId, responseMessageId);
					}

					let _response = null;
					// RAG知识库模型预答系统
					preQA = false;
					if (qaQuestions === '' && model?.info?.meta?.knowledge) {
						// console.log('knowledge:', model?.info?.meta?.knowledge);
						qaQuestions = ''; // init
						qaQuestionsMap.clear();
						notified = false;
						let res = await processDocToQAQuestions(localStorage.token, model?.info?.meta?.knowledge);
						console.log('qa_questions is:', res);
						if (res && 'qa_questions' in res) {
							qaQuestions= res.qa_questions;
							qaQuestionsMap = parseQuestions(qaQuestions);
							
						}
					}
					if (qaQuestions !== '') {
						_response = await getAnswerFromQA(prompt, model, responseMessageId);
					}

					if (generateImageEnabled || await wantGenerateImage(prompt, responseMessage.model)) {
						_response = await generateImage(responseMessage, prompt);
					} else if (!preQA) {
						let sufficient = await isAmountSufficient(model);
						if (sufficient) {
							if (model?.owned_by === 'openai') {
								_response = await sendPromptOpenAI(model, prompt, responseMessageId, _chatId);
							} else if (model) {
								_response = await sendPromptOllama(model, prompt, responseMessageId, _chatId);
							}
						}
						else {
							shutResponse(responseMessageId);
						}
					}
					_responses.push(_response);

					if (mrToMemory) {	// 针对生成电子病历的对话请求

						const res = await addNewMemory(localStorage.token, _response).catch((error) => {
							toast.error(error);
						});
						if (res) {
							toast.success($i18n.t('Memory added successfully'));
						}
						mrToMemory = false;
					}

					if (chatEventEmitter) clearInterval(chatEventEmitter);
				} else {
					toast.error($i18n.t(`Model {{modelId}} not found`, { modelId }));
				}
			})
		);

		currentChatPage.set(1);
		chats.set(await getChatList(localStorage.token, $currentChatPage));

		return _responses;
	};

	const sendPromptOllama = async (model, userPrompt, responseMessageId, _chatId) => {
		let _response: string | null = null;

		const responseMessage = history.messages[responseMessageId];
		const userMessage = history.messages[responseMessage.parentId];

		// Wait until history/message have been updated
		await tick();

		// Scroll down
		scrollToBottom();

		const messagesBody = [
			params?.system || $settings.system || (responseMessage?.userContext ?? null)
				? {
						role: 'system',
						content: `${promptTemplate(
							params?.system ?? $settings?.system ?? '',
							$user.name,
							$settings?.userLocation
								? await getAndUpdateUserLocation(localStorage.token)
								: undefined
						)}${
							(responseMessage?.userContext ?? null)
								? `\n\nUser Context:\n${responseMessage?.userContext ?? ''}`
								: ''
						}`
					}
				: undefined,
			...messages
		]
			.filter((message) => message?.content?.trim())
			.map((message) => {
				// Prepare the base message object
				const baseMessage = {
					role: message.role,
					content: message.content
				};

				// Extract and format image URLs if any exist
				const imageUrls = message.files
					?.filter((file) => file.type === 'image')
					.map((file) => file.url.slice(file.url.indexOf(',') + 1));

				// Add images array only if it contains elements
				if (imageUrls && imageUrls.length > 0 && message.role === 'user') {
					baseMessage.images = imageUrls;
				}
				return baseMessage;
			});

		let lastImageIndex = -1;

		// Find the index of the last object with images
		messagesBody.forEach((item, index) => {
			if (item.images) {
				lastImageIndex = index;
			}
		});

		// Remove images from all but the last one
		messagesBody.forEach((item, index) => {
			if (index !== lastImageIndex) {
				delete item.images;
			}
		});

		let files = JSON.parse(JSON.stringify(chatFiles));
		if (model?.info?.meta?.knowledge ?? false) {
			// Only initialize and add status if knowledge exists
			responseMessage.statusHistory = [
				{
					action: 'knowledge_search',
					description: $i18n.t(`Searching Knowledge for "{{searchQuery}}"`, {
						searchQuery: userMessage.content
					}),
					done: false
				}
			];
			files.push(...model.info.meta.knowledge);
			messages = messages; // Trigger Svelte update
		}
		files.push(
			...(userMessage?.files ?? []).filter((item) =>
				['doc', 'file', 'collection'].includes(item.type)
			),
			...(responseMessage?.files ?? []).filter((item) => ['web_search_results'].includes(item.type))
		);

		scrollToBottom();

		eventTarget.dispatchEvent(
			new CustomEvent('chat:start', {
				detail: {
					id: responseMessageId
				}
			})
		);

		await tick();

		const [res, controller] = await generateChatCompletion(localStorage.token, {
			stream: true,
			model: model.id,
			messages: messagesBody,
			options: {
				...{ ...($settings?.params ?? {}), ...params },
				stop:
					(params?.stop ?? $settings?.params?.stop ?? undefined)
						? (params?.stop.split(',').map((token) => token.trim()) ?? $settings.params.stop).map(
								(str) => decodeURIComponent(JSON.parse('"' + str.replace(/\"/g, '\\"') + '"'))
							)
						: undefined,
				num_predict: params?.max_tokens ?? $settings?.params?.max_tokens ?? undefined,
				repeat_penalty:
					params?.frequency_penalty ?? $settings?.params?.frequency_penalty ?? undefined
			},
			format: $settings.requestFormat ?? undefined,
			keep_alive: $settings.keepAlive ?? undefined,
			tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
			files: files.length > 0 ? files : undefined,
			session_id: $socket?.id,
			chat_id: $chatId,
			id: responseMessageId
		});

		if (res && res.ok) {
			console.log('controller', controller);

			const reader = res.body
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream('\n'))
				.getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done || stopResponseFlag || _chatId !== $chatId) {
					responseMessage.done = true;
					messages = messages;

					if (stopResponseFlag) {
						controller.abort('User: Stop Response');
					} else {
						const messages = createMessagesList(responseMessageId);
						await chatCompletedHandler(_chatId, model.id, responseMessageId, messages);
					}

					_response = responseMessage.content;
					break;
				}

				try {
					let lines = value.split('\n');

					for (const line of lines) {
						if (line !== '') {
							// console.log(line);
							let data = JSON.parse(line);

							if ('citations' in data) {
								responseMessage.citations = data.citations;
								// Only remove status if it was initially set
								if (model?.info?.meta?.knowledge ?? false) {
									responseMessage.statusHistory = responseMessage.statusHistory.filter(
										(status) => status.action !== 'knowledge_search'
									);
								}
								continue;
							}

							if ('detail' in data) {
								throw data;
							}

							if (data.done == false) {
								if (responseMessage.content == '' && data.message.content == '\n') {
									continue;
								} else {
									responseMessage.content += data.message.content;

									if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
										navigator.vibrate(5);
									}

									const messageContentParts = getMessageContentParts(
										responseMessage.content,
										$config?.audio?.tts?.split_on ?? 'punctuation'
									);
									messageContentParts.pop();

									// dispatch only last sentence and make sure it hasn't been dispatched before
									if (
										messageContentParts.length > 0 &&
										messageContentParts[messageContentParts.length - 1] !==
											responseMessage.lastSentence
									) {
										responseMessage.lastSentence =
											messageContentParts[messageContentParts.length - 1];
										eventTarget.dispatchEvent(
											new CustomEvent('chat', {
												detail: {
													id: responseMessageId,
													content: messageContentParts[messageContentParts.length - 1]
												}
											})
										);
									}

									messages = messages;
								}
							} else {
								responseMessage.done = true;

								if (responseMessage.content == '') {
									responseMessage.error = {
										code: 400,
										content: `Oops! No text generated from Ollama, Please try again.`
									};
								}

								responseMessage.context = data.context ?? null;
								responseMessage.info = {
									total_duration: data.total_duration,
									load_duration: data.load_duration,
									sample_count: data.sample_count,
									sample_duration: data.sample_duration,
									prompt_eval_count: data.prompt_eval_count,
									prompt_eval_duration: data.prompt_eval_duration,
									eval_count: data.eval_count,
									eval_duration: data.eval_duration
								};
								messages = messages;

								if ($settings.notificationEnabled && !document.hasFocus()) {
									const notification = new Notification(`${model.id}`, {
										body: responseMessage.content,
										icon: `${WEBUI_BASE_URL}/static/favicon.png`
									});
								}

								if ($settings?.responseAutoCopy ?? false) {
									copyToClipboard(responseMessage.content);
								}

								if ($settings.responseAutoPlayback && !$showCallOverlay) {
									await tick();
									document.getElementById(`speak-button-${responseMessage.id}`)?.click();
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					if ('detail' in error) {
						toast.error(error.detail);
					}
					break;
				}

				if (autoScroll) {
					scrollToBottom();
				}
			}
		} else {
			if (res !== null) {
				const error = await res.json();
				console.log(error);
				if ('detail' in error) {
					toast.error(error.detail);
					responseMessage.error = { content: error.detail };
				} else {
					toast.error(error.error);
					responseMessage.error = { content: error.error };
				}
			} else {
				toast.error(
					$i18n.t(`Uh-oh! There was an issue connecting to {{provider}}.`, { provider: 'Ollama' })
				);
				responseMessage.error = {
					content: $i18n.t(`Uh-oh! There was an issue connecting to {{provider}}.`, {
						provider: 'Ollama'
					})
				};
			}
			responseMessage.done = true;

			if (responseMessage.statusHistory) {
				responseMessage.statusHistory = responseMessage.statusHistory.filter(
					(status) => status.action !== 'knowledge_search'
				);
			}

			messages = messages;
		}
		await saveChatHandler(_chatId);

		stopResponseFlag = false;
		await tick();

		let lastMessageContentPart =
			getMessageContentParts(
				responseMessage.content,
				$config?.audio?.tts?.split_on ?? 'punctuation'
			)?.at(-1) ?? '';
		if (lastMessageContentPart) {
			eventTarget.dispatchEvent(
				new CustomEvent('chat', {
					detail: { id: responseMessageId, content: lastMessageContentPart }
				})
			);
		}

		eventTarget.dispatchEvent(
			new CustomEvent('chat:finish', {
				detail: {
					id: responseMessageId,
					content: responseMessage.content
				}
			})
		);

		if (autoScroll) {
			scrollToBottom();
		}

		if (messages.length == 2 && messages.at(1).content !== '' && selectedModels[0] === model.id) {
			window.history.replaceState(history.state, '', `/c/${_chatId}`);
			const _title = await generateChatTitle(userPrompt);
			await setChatTitle(_chatId, _title);
		}

		if (!$showCallOverlay && messages.length >= 2 && messages.at(-1).done == true) {
			suggestQuestionsList = await generateChatSuggestQuestions(messages)
			console.log('suggestQuestionsList:', suggestQuestionsList);
		}
		return _response;
	};

	const sendPromptOpenAI = async (model, userPrompt, responseMessageId, _chatId) => {
		let _response = null;

		const responseMessage = history.messages[responseMessageId];
		const userMessage = history.messages[responseMessage.parentId];

		let files = JSON.parse(JSON.stringify(chatFiles));
		if (model?.info?.meta?.knowledge ?? false) {
			// Only initialize and add status if knowledge exists
			responseMessage.statusHistory = [
				{
					action: 'knowledge_search',
					description: $i18n.t(`Searching Knowledge for "{{searchQuery}}"`, {
						searchQuery: userMessage.content
					}),
					done: false
				}
			];
			files.push(...model.info.meta.knowledge);
			messages = messages; // Trigger Svelte update
		}
		files.push(
			...(userMessage?.files ?? []).filter((item) =>
				['doc', 'file', 'collection'].includes(item.type)
			),
			...(responseMessage?.files ?? []).filter((item) => ['web_search_results'].includes(item.type))
		);

		scrollToBottom();

		eventTarget.dispatchEvent(
			new CustomEvent('chat:start', {
				detail: {
					id: responseMessageId
				}
			})
		);
		await tick();

		try {
			const [res, controller] = await generateOpenAIChatCompletion(
				localStorage.token,
				{
					stream: true,
					model: model.id,
					stream_options:
						(model.info?.meta?.capabilities?.usage ?? false)
							? {
									include_usage: true
								}
							: undefined,
					messages: [
						params?.system || $settings.system || (responseMessage?.userContext ?? null)
							? {
									role: 'system',
									content: `${promptTemplate(
										params?.system ?? $settings?.system ?? '',
										$user.name,
										$settings?.userLocation
											? await getAndUpdateUserLocation(localStorage.token)
											: undefined
									)}${
										(responseMessage?.userContext ?? null)
											? `\n\nUser Context:\n${responseMessage?.userContext ?? ''}`
											: ''
									}`
								}
							: undefined,
						...messages
					]
						.filter((message) => message?.content?.trim())
						.map((message, idx, arr) => ({
							role: message.role,
							...((message.files?.filter((file) => file.type === 'image').length > 0 ?? false) &&
							message.role === 'user'
								? {
										content: [
											{
												type: 'text',
												text:
													arr.length - 1 !== idx
														? message.content
														: (message?.raContent ?? message.content)
											},
											...message.files
												.filter((file) => file.type === 'image')
												.map((file) => ({
													type: 'image_url',
													image_url: {
														url: file.url
													}
												}))
										]
									}
								: {
										content:
											arr.length - 1 !== idx
												? message.content
												: (message?.raContent ?? message.content)
									})
						})),
					seed: params?.seed ?? $settings?.params?.seed ?? undefined,
					stop:
						(params?.stop ?? $settings?.params?.stop ?? undefined)
							? (params?.stop.split(',').map((token) => token.trim()) ?? $settings.params.stop).map(
									(str) => decodeURIComponent(JSON.parse('"' + str.replace(/\"/g, '\\"') + '"'))
								)
							: undefined,
					temperature: params?.temperature ?? $settings?.params?.temperature ?? undefined,
					top_p: params?.top_p ?? $settings?.params?.top_p ?? undefined,
					frequency_penalty:
						params?.frequency_penalty ?? $settings?.params?.frequency_penalty ?? undefined,
					max_tokens: params?.max_tokens ?? $settings?.params?.max_tokens ?? undefined,
					tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
					files: files.length > 0 ? files : undefined,
					session_id: $socket?.id,
					chat_id: $chatId,
					id: responseMessageId
				},
				`${WEBUI_BASE_URL}/api`
			);

			// Wait until history/message have been updated
			await tick();

			scrollToBottom();

			if (res && res.ok && res.body) {
				const textStream = await createOpenAITextStream(res.body, $settings.splitLargeChunks);

				for await (const update of textStream) {
					const { value, done, citations, error, usage } = update;
					if (error) {
						await handleOpenAIError(error, null, model, responseMessage);
						break;
					}
					if (done || stopResponseFlag || _chatId !== $chatId) {
						responseMessage.done = true;
						messages = messages;

						if (stopResponseFlag) {
							controller.abort('User: Stop Response');
						} else {
							const messages = createMessagesList(responseMessageId);

							await chatCompletedHandler(_chatId, model.id, responseMessageId, messages);
						}

						_response = responseMessage.content;

						break;
					}

					if (usage) {
						responseMessage.info = { ...usage, openai: true };
					}

					if (citations) {
						responseMessage.citations = citations;
						// Only remove status if it was initially set
						if (model?.info?.meta?.knowledge ?? false) {
							responseMessage.statusHistory = responseMessage.statusHistory.filter(
								(status) => status.action !== 'knowledge_search'
							);
						}
						continue;
					}

					if (responseMessage.content == '' && value == '\n') {
						continue;
					} else {
						responseMessage.content += value;

						if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
							navigator.vibrate(5);
						}

						const messageContentParts = getMessageContentParts(
							responseMessage.content,
							$config?.audio?.tts?.split_on ?? 'punctuation'
						);
						messageContentParts.pop();

						// dispatch only last sentence and make sure it hasn't been dispatched before
						if (
							messageContentParts.length > 0 &&
							messageContentParts[messageContentParts.length - 1] !== responseMessage.lastSentence
						) {
							responseMessage.lastSentence = messageContentParts[messageContentParts.length - 1];
							eventTarget.dispatchEvent(
								new CustomEvent('chat', {
									detail: {
										id: responseMessageId,
										content: messageContentParts[messageContentParts.length - 1]
									}
								})
							);
						}

						messages = messages;
					}

					if (autoScroll) {
						scrollToBottom();
					}
				}

				if ($settings.notificationEnabled && !document.hasFocus()) {
					const notification = new Notification(`${model.id}`, {
						body: responseMessage.content,
						icon: `${WEBUI_BASE_URL}/static/favicon.png`
					});
				}

				if ($settings.responseAutoCopy) {
					copyToClipboard(responseMessage.content);
				}

				if ($settings.responseAutoPlayback && !$showCallOverlay) {
					await tick();

					document.getElementById(`speak-button-${responseMessage.id}`)?.click();
				}
			} else {
				await handleOpenAIError(null, res, model, responseMessage);
			}
		} catch (error) {
			await handleOpenAIError(error, null, model, responseMessage);
		}

		await saveChatHandler(_chatId);

		messages = messages;

		stopResponseFlag = false;
		await tick();

		let lastMessageContentPart =
			getMessageContentParts(
				responseMessage.content,
				$config?.audio?.tts?.split_on ?? 'punctuation'
			)?.at(-1) ?? '';
		if (lastMessageContentPart) {
			eventTarget.dispatchEvent(
				new CustomEvent('chat', {
					detail: { id: responseMessageId, content: lastMessageContentPart }
				})
			);
		}

		eventTarget.dispatchEvent(
			new CustomEvent('chat:finish', {
				detail: {
					id: responseMessageId,
					content: responseMessage.content
				}
			})
		);

		if (autoScroll) {
			scrollToBottom();
		}

		if (messages.length == 2 && selectedModels[0] === model.id) {
			window.history.replaceState(history.state, '', `/c/${_chatId}`);

			const _title = await generateChatTitle(userPrompt);
			await setChatTitle(_chatId, _title);
		}

		if (!$showCallOverlay && messages.length >= 2 && messages.at(-1).done == true) {
			suggestQuestionsList = await generateChatSuggestQuestions(messages)
			console.log('suggestQuestionsList for openai:', suggestQuestionsList);
		}
		return _response;
	};

	const handleOpenAIError = async (error, res: Response | null, model, responseMessage) => {
		let errorMessage = '';
		let innerError;

		if (error) {
			innerError = error;
		} else if (res !== null) {
			innerError = await res.json();
		}
		console.error(innerError);
		if ('detail' in innerError) {
			toast.error(innerError.detail);
			errorMessage = innerError.detail;
		} else if ('error' in innerError) {
			if ('message' in innerError.error) {
				toast.error(innerError.error.message);
				errorMessage = innerError.error.message;
			} else {
				toast.error(innerError.error);
				errorMessage = innerError.error;
			}
		} else if ('message' in innerError) {
			toast.error(innerError.message);
			errorMessage = innerError.message;
		}

		responseMessage.error = {
			content:
				$i18n.t(`Uh-oh! There was an issue connecting to {{provider}}.`, {
					provider: model.name ?? model.id
				}) +
				'\n' +
				errorMessage
		};
		responseMessage.done = true;

		if (responseMessage.statusHistory) {
			responseMessage.statusHistory = responseMessage.statusHistory.filter(
				(status) => status.action !== 'knowledge_search'
			);
		}

		messages = messages;
	};

	const stopResponse = () => {
		stopResponseFlag = true;
		console.log('stopResponse');
	};

	const regenerateResponse = async (message) => {
		console.log('regenerateResponse');

		if (messages.length != 0) {
			let userMessage = history.messages[message.parentId];
			let userPrompt = userMessage.content;

			if ((userMessage?.models ?? [...selectedModels]).length == 1) {
				// If user message has only one model selected, sendPrompt automatically selects it for regeneration
				await sendPrompt(userPrompt, userMessage.id);
			} else {
				// If there are multiple models selected, use the model of the response message for regeneration
				// e.g. many model chat
				await sendPrompt(userPrompt, userMessage.id, {
					modelId: message.model,
					modelIdx: message.modelIdx
				});
			}
		}
	};

	const continueGeneration = async () => {
		console.log('continueGeneration');
		const _chatId = JSON.parse(JSON.stringify($chatId));

		if (messages.length != 0 && messages.at(-1).done == true) {
			const responseMessage = history.messages[history.currentId];
			responseMessage.done = false;
			await tick();

			const model = $models.filter((m) => m.id === responseMessage.model).at(0);

			if (model) {
				if (model?.owned_by === 'openai') {
					await sendPromptOpenAI(
						model,
						history.messages[responseMessage.parentId].content,
						responseMessage.id,
						_chatId
					);
				} else
					await sendPromptOllama(
						model,
						history.messages[responseMessage.parentId].content,
						responseMessage.id,
						_chatId
					);
			}
		} else {
			toast.error($i18n.t(`Model {{modelId}} not found`, { modelId }));
		}
	};

	const generateChatTitle = async (userPrompt) => {
		if ($settings?.title?.auto ?? true) {
			const title = await generateTitle(
				localStorage.token,
				selectedModels[0],
				userPrompt,
				$chatId
			).catch((error) => {
				console.error(error);
				return 'New Chat';
			});

			return title;
		} else {
			return `${userPrompt}`;
		}
	};

	const generateChatSuggestQuestions = async (messages) => {
		const suggestQuestions = await generateSuggestQuestions(
			localStorage.token,
			selectedModels[0],
			messages,
			$chatId
		).catch((error) => {
			console.error(error);
			return '';
		});
		try {
			return JSON.parse(suggestQuestions);
		} catch (parseError) {
			console.error('Error parsing suggestQuestions:', parseError);
			return [];
		}
	};

	const setChatTitle = async (_chatId, _title) => {
		if (_chatId === $chatId) {
			title = _title;
		}

		if (!$temporaryChatEnabled) {
			chat = await updateChatById(localStorage.token, _chatId, { title: _title });

			currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, $currentChatPage));
		}
	};

	const getWebSearchResults = async (model: string, parentId: string, responseId: string) => {
		const responseMessage = history.messages[responseId];
		const userMessage = history.messages[parentId];

		responseMessage.statusHistory = [
			{
				done: false,
				action: 'web_search',
				description: $i18n.t('Generating search query')
			}
		];
		messages = messages;

		const prompt = userMessage.content;
		let searchQuery = await generateSearchQuery(
			localStorage.token,
			model,
			messages.filter((message) => message?.content?.trim()),
			prompt
		).catch((error) => {
			console.log(error);
			return prompt;
		});

		if (!searchQuery || searchQuery == '') {
			responseMessage.statusHistory.push({
				done: true,
				error: true,
				action: 'web_search',
				description: $i18n.t('No search query generated')
			});
			messages = messages;
			return;
		}

		responseMessage.statusHistory.push({
			done: false,
			action: 'web_search',
			description: $i18n.t(`Searching "{{searchQuery}}"`, { searchQuery })
		});
		messages = messages;

		const results = await runWebSearch(localStorage.token, searchQuery).catch((error) => {
			console.log(error);
			toast.error(error);

			return null;
		});

		if (results) {
			responseMessage.statusHistory.push({
				done: true,
				action: 'web_search',
				description: $i18n.t('Searched {{count}} sites', { count: results.filenames.length }),
				query: searchQuery,
				urls: results.filenames
			});

			if (responseMessage?.files ?? undefined === undefined) {
				responseMessage.files = [];
			}

			responseMessage.files.push({
				collection_name: results.collection_name,
				name: searchQuery,
				type: 'web_search_results',
				urls: results.filenames
			});

			messages = messages;
		} else {
			responseMessage.statusHistory.push({
				done: true,
				error: true,
				action: 'web_search',
				description: 'No search results found'
			});
			messages = messages;
		}
	};

	const getTags = async () => {
		return await getTagsById(localStorage.token, $chatId).catch(async (error) => {
			return [];
		});
	};

	const saveChatHandler = async (_chatId) => {
		if ($chatId == _chatId) {
			if (!$temporaryChatEnabled) {
				chat = await updateChatById(localStorage.token, _chatId, {
					messages: messages,
					history: history,
					models: selectedModels,
					params: params,
					files: chatFiles
				});

				currentChatPage.set(1);
				await chats.set(await getChatList(localStorage.token, $currentChatPage));
			}
		}
	};
	const mergeResponses = async (messageId, responses, _chatId) => {
		console.log('mergeResponses', messageId, responses);
		const message = history.messages[messageId];
		const mergedResponse = {
			status: true,
			content: ''
		};
		message.merged = mergedResponse;
		messages = messages;

		try {
			const [res, controller] = await generateMoACompletion(
				localStorage.token,
				message.model,
				history.messages[message.parentId].content,
				responses
			);

			if (res && res.ok && res.body) {
				const textStream = await createOpenAITextStream(res.body, $settings.splitLargeChunks);
				for await (const update of textStream) {
					const { value, done, citations, error, usage } = update;
					if (error || done) {
						break;
					}

					if (mergedResponse.content == '' && value == '\n') {
						continue;
					} else {
						mergedResponse.content += value;
						messages = messages;
					}

					if (autoScroll) {
						scrollToBottom();
					}
				}

				await saveChatHandler(_chatId);
			} else {
				console.error(res);
			}
		} catch (e) {
			console.error(e);
		}
	};
</script>

<svelte:head>
	<title>
		{title
			? `${title.length > 30 ? `${title.slice(0, 30)}...` : title} | ${$WEBUI_NAME}`
			: `${$WEBUI_NAME}`}
	</title>
</svelte:head>

<audio id="audioElement" src="" style="display: none;" />

<EventConfirmDialog
	bind:show={showEventConfirmation}
	title={eventConfirmationTitle}
	message={eventConfirmationMessage}
	input={eventConfirmationInput}
	inputPlaceholder={eventConfirmationInputPlaceholder}
	inputValue={eventConfirmationInputValue}
	on:confirm={(e) => {
		if (e.detail) {
			eventCallback(e.detail);
		} else {
			eventCallback(true);
		}
	}}
	on:cancel={() => {
		eventCallback(false);
	}}
/>

{#if !chatIdProp || (loaded && chatIdProp)}
	<PullToRefresh>
		<div
			class="h-screen max-h-[100dvh] {$showSidebar
				? 'md:max-w-[calc(100%-260px)]'
				: ''} w-full max-w-full flex flex-col"
		>
			{#if $settings?.backgroundImageUrl ?? null}
				<div
					class="absolute {$showSidebar
						? 'md:max-w-[calc(100%-260px)] md:translate-x-[260px]'
						: ''} top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
					style="background-image: url({$settings.backgroundImageUrl})  "
				/>

				<div
					class="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-white to-white/85 dark:from-gray-900 dark:to-[#171717]/90 z-0"
				/>
			{/if}

			<Navbar
				{title}
				bind:selectedModels
				bind:showModelSelector
				bind:showControls
				shareEnabled={messages.length > 0}
				{chat}
				{initNewChat}
			/>

			{#if $banners.length > 0 && messages.length === 0 && !$chatId && selectedModels.length <= 1}
				<div
					class="absolute top-[4.25rem] w-full {$showSidebar
						? 'md:max-w-[calc(100%-260px)]'
						: ''} {showControls ? 'lg:pr-[24rem]' : ''} z-20"
				>
					<div class=" flex flex-col gap-1 w-full">
						{#each $banners.filter( (b) => (b.dismissible ? !JSON.parse(localStorage.getItem('dismissedBannerIds') ?? '[]').includes(b.id) : true) ) as banner}
							<Banner
								{banner}
								on:dismiss={(e) => {
									const bannerId = e.detail;

									localStorage.setItem(
										'dismissedBannerIds',
										JSON.stringify(
											[
												bannerId,
												...JSON.parse(localStorage.getItem('dismissedBannerIds') ?? '[]')
											].filter((id) => $banners.find((b) => b.id === id))
										)
									);
								}}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex flex-col flex-auto z-10">
				<div
					class=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto h-0 max-w-full z-10 scrollbar-hidden {showControls
						? 'lg:pr-[24rem]'
						: ''}"
					id="messages-container"
					bind:this={messagesContainerElement}
					on:scroll={(e) => {
						autoScroll =
							messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
							messagesContainerElement.clientHeight + 5;
					}}
				>
					<div class=" h-full w-full flex flex-col {chatIdProp ? 'py-4' : 'pt-2 pb-4'}">
						<Messages
							chatId={$chatId}
							{selectedModels}
							{processing}
							bind:history
							bind:messages
							bind:autoScroll
							bind:prompt
							bottomPadding={files.length > 0}
							{sendPrompt}
							{continueGeneration}
							{regenerateResponse}
							{mergeResponses}
							{chatActionHandler}
							{submitPrompt}
							{suggestQuestionsList}
							{getAnswerFromQA}
						/>
					</div>
				</div>

			<div class={showControls ? 'lg:pr-[24rem]' : ''}>
				<MessageInput
					bind:files
					bind:prompt
					bind:autoScroll
					bind:selectedToolIds
					bind:webSearchEnabled
					bind:generateImageEnabled
					bind:atSelectedModel
					availableToolIds={selectedModelIds.reduce((a, e, i, arr) => {
						const model = $models.find((m) => m.id === e);
						if (model?.info?.meta?.toolIds ?? false) {
							return [...new Set([...a, ...model.info.meta.toolIds])];
						}
						return a;
					}, [])}
					transparentBackground={$settings?.backgroundImageUrl ?? false}
					{selectedModels}
					{messages}
					{submitPrompt}
					{stopResponse}
					on:mrStatusChanged = {(e) => {
						mrToMemory = (e.detail == 'wait model response');
					}}
					on:call={() => {
						showControls = true;
					}}
				/>
			</div>
		</div>
	</PullToRefresh>
{/if}

<ChatControls
	models={selectedModelIds.reduce((a, e, i, arr) => {
		const model = $models.find((m) => m.id === e);
		if (model) {
			return [...a, model];
		}
		return a;
	}, [])}
	bind:show={showControls}
	bind:chatFiles
	bind:params
	bind:files
	{submitPrompt}
	{stopResponse}
	modelId={selectedModelIds?.at(0) ?? null}
	chatId={$chatId}
	{eventTarget}
/>
