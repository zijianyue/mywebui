import { OPENAI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';

export const getOpenAIConfig = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/config`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = 'Server connection failed';
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateOpenAIConfig = async (token: string = '', enable_openai_api: boolean) => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/config/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({
			enable_openai_api: enable_openai_api
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = 'Server connection failed';
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getOpenAIUrls = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/urls`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = 'Server connection failed';
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res.OPENAI_API_BASE_URLS;
};

export const updateOpenAIUrls = async (token: string = '', urls: string[]) => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/urls/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({
			urls: urls
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = 'Server connection failed';
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res.OPENAI_API_BASE_URLS;
};

export const getOpenAIKeys = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/keys`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = 'Server connection failed';
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res.OPENAI_API_KEYS;
};

export const updateOpenAIKeys = async (token: string = '', keys: string[]) => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/keys/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({
			keys: keys
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = 'Server connection failed';
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res.OPENAI_API_KEYS;
};

export const getOpenAIModels = async (token: string, urlIdx?: number) => {
	let error = null;

	const res = await fetch(
		`${OPENAI_API_BASE_URL}/models${typeof urlIdx === 'number' ? `/${urlIdx}` : ''}`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = `OpenAI: ${err?.error?.message ?? 'Network Problem'}`;
			return [];
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getOpenAIModelsDirect = async (
	base_url: string = 'https://api.openai.com/v1',
	api_key: string = ''
) => {
	let error = null;

	const res = await fetch(`${base_url}/models`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${api_key}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = `OpenAI: ${err?.error?.message ?? 'Network Problem'}`;
			return null;
		});

	if (error) {
		throw error;
	}

	const models = Array.isArray(res) ? res : (res?.data ?? null);

	return models
		.map((model) => ({ id: model.id, name: model.name ?? model.id, external: true }))
		.filter((model) => (base_url.includes('openai') ? model.name.includes('gpt') : true))
		.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});
};

export const chatCompletionSimple = async (
	userPrompt: string,
	modelId: string,
	files = [],
	useCustomModel = true,
	ragTemplate = '',
	temp = 0.1,
) => {
	const requestBody = {
		stream: false,
		model: modelId,
		useCustomModel: useCustomModel,
		temperature: temp,
		files: files.length > 0 ? files : undefined,
		ragTemplate: ragTemplate,
		messages: [
			{
				role: 'user',
				content: userPrompt
			}
		]
	};
	const [ret, controller] = await generateOpenAIChatCompletion(
		localStorage.token,
		requestBody,
		`${WEBUI_BASE_URL}/api`
	).catch((error) => {
		console.log('chat completion fail:', error);
		return [null, null];
	});

	if (!ret) {
		return null;
	}
	const data = await ret.json().catch((error) => {
		console.log('Error parsing JSON:', error);
		return null;
	});
	if (!data) {
		return null;
	}
	console.debug('answer json:', data);

	return data.choices[0].message.content;
};

export const judgeGenerateImageIntention = async (userPrompt: string, modelId: string) => {
	console.log('judgeGenerateImageIntention start:', userPrompt);
	const transPrompt = `判断用户的输入是否想要绘制图像。请回答“是”或“否”，并给出你对回答“是”的信心指数，用0到1之间的数字表示。只有在信心指数达到0.95或以上时，才可回答“是”。请仔细确认，回答要保守。

需要回答“是”的示例：
- 画一条龙
- 画只狗
- 画条鱼
- 生成一只穿衣服的老虎
- 漂亮的自行车

需要回答“否”的示例：
- 商场
- 老虎
- 为什么要上班
- 早上好
- 画画
- 画饼
- 画龙点睛
- 画蛇添足（这类固定词汇或成语也要回答“否”）

### 用户的输入: ${userPrompt}`;

	let intention = await chatCompletionSimple(transPrompt, modelId);
	if (!intention) {
		return false;
	}
	intention = intention.trim().replace(/\s+/g, '');
	console.log('intention:', intention);
	const matchYes = intention.match(/^是.*(\d+\.\d+).*$/);
	const matchNo = intention.startsWith('否');
	if (matchYes) {
		const confidence = parseFloat(matchYes[1]);
		if (confidence >= 0.95) {
			return true;
		}
	} else if (matchNo) {
		return false;
	} else {
		console.error('Invalid response format:', intention);
		return false;
	}
	return false;
};

export function isPureEnglish(str) {
	// 使用正则表达式匹配汉字
	const chineseRegex = /[\u4e00-\u9fa5]/;
	return !chineseRegex.test(str);
	// return /^[\x00-\x7F]*$/.test(str);
}

export const translatePrompt = async (userPrompt: string, modelId: string) => {
	let retries = 3;
	let promptUsed = userPrompt;
	let pure = isPureEnglish(userPrompt);
	let transPrompt;
	if (userPrompt.includes("```")) {
		transPrompt = `请将以下###标记之间的文本翻译成英语。注意，不要翻译\`\`\`...\`\`\`中的代码内容，而是将其原样保留在翻译结果中。只翻译代码外的说明文字。翻译时保持专业、准确，并使用技术写作的语气。请确保说明文字的翻译是纯英文，不包含任何Unicode字符或翻译注释。将原始代码和翻译后的说明文字组合在一起，形成完整的翻译结果。以下是需要翻译的文本：

###
${userPrompt}
###`;
	} else {
		transPrompt = `请将以下文本翻译成英语。翻译时保持专业、准确，并使用技术写作的语气。请确保翻译是纯英文，不包含任何Unicode字符或翻译注释。以下是需要翻译的文本：

###
${userPrompt}
###`;
	}

	if (pure) {
		retries = 0;
	}
	while (retries > 0) {
		promptUsed = await chatCompletionSimple(transPrompt, modelId).catch((e) => {
			console.error('translatePrompt error:', e);
			return null;
		});
		if (!promptUsed) {
			return userPrompt;
		}
		console.debug('promptUsed:', promptUsed);
		break;
		// if (isPureEnglish(promptUsed)) {
		// 	break;
		// } else {
		// 	console.log('not pure english');
		// 	retries--;
		// }
	}

	// if (!pure && !isPureEnglish(promptUsed)) {
	// 	console.log('translate fail at last');
	// 	return userPrompt;
	// }
	return promptUsed;
};

export const generateOpenAIChatCompletion = async (
	token: string = '',
	body: object,
	url: string = OPENAI_API_BASE_URL
): Promise<[Response | null, AbortController]> => {
	const controller = new AbortController();
	let error = null;

	console.log("generateOpenAIChatCompletion body:", body);
	const res = await fetch(`${url}/chat/completions`, {
		signal: controller.signal,
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	}).catch((err) => {
		console.log(err);
		error = err;
		return null;
	});

	if (error) {
		throw error;
	}

	return [res, controller];
};

export const synthesizeOpenAISpeech = async (
	token: string = '',
	speaker: string = 'alloy',
	text: string = '',
	model: string = 'tts-1'
) => {
	let error = null;

	const res = await fetch(`${OPENAI_API_BASE_URL}/audio/speech`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: model,
			input: text,
			voice: speaker
		})
	}).catch((err) => {
		console.log(err);
		error = err;
		return null;
	});

	if (error) {
		throw error;
	}

	return res;
};
