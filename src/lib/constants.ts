import { browser, dev } from '$app/environment';
// import { version } from '../../package.json';

export const APP_NAME = 'Wei Kang AI';

export const WEBUI_HOSTNAME = browser ? (dev ? `${location.hostname}:5657` : ``) : '';
export const WEBUI_BASE_URL = browser ? (dev ? `http://${WEBUI_HOSTNAME}` : ``) : ``;
export const WEBUI_API_BASE_URL = `${WEBUI_BASE_URL}/api/v1`;

export const OLLAMA_API_BASE_URL = `${WEBUI_BASE_URL}/ollama`;
export const OPENAI_API_BASE_URL = `${WEBUI_BASE_URL}/openai`;
export const AUDIO_API_BASE_URL = `${WEBUI_BASE_URL}/audio/api/v1`;
export const IMAGES_API_BASE_URL = `${WEBUI_BASE_URL}/images/api/v1`;
export const RAG_API_BASE_URL = `${WEBUI_BASE_URL}/rag/api/v1`;

export const WEBUI_VERSION = APP_VERSION;
export const WEBUI_BUILD_HASH = APP_BUILD_HASH;
export const REQUIRED_OLLAMA_VERSION = '0.1.16';

export const SUPPORTED_FILE_TYPE = [
	'application/epub+zip',
	'application/pdf',
	'text/plain',
	'text/csv',
	'text/xml',
	'text/html',
	'text/x-python',
	'text/css',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/octet-stream',
	'application/x-javascript',
	'text/markdown',
	'audio/mpeg',
	'audio/wav'
];

export const SUPPORTED_FILE_EXTENSIONS = [
	'md',
	'rst',
	'go',
	'py',
	'java',
	'sh',
	'bat',
	'ps1',
	'cmd',
	'js',
	'ts',
	'css',
	'cpp',
	'hpp',
	'h',
	'c',
	'cs',
	'htm',
	'html',
	'sql',
	'log',
	'ini',
	'pl',
	'pm',
	'r',
	'dart',
	'dockerfile',
	'env',
	'php',
	'hs',
	'hsc',
	'lua',
	'nginxconf',
	'conf',
	'm',
	'mm',
	'plsql',
	'perl',
	'rb',
	'rs',
	'db2',
	'scala',
	'bash',
	'swift',
	'vue',
	'svelte',
	'doc',
	'docx',
	'pdf',
	'csv',
	'txt',
	'xls',
	'xlsx',
	'pptx',
	'ppt',
	'msg'
];

type ModelPrice = {
	input: number;  // 输入价格（元/千token）
	output: number; // 输出价格（元/千token）
};

type PriceTable = {
	[modelId: string]: ModelPrice;
};

export const INIT_BALANCE_AMOUNT = 5;
export const PRICE_COE = 1.5;

// 原始价格，我们要乘个系数
// 价格随着供应商的变动而变动
// [1] Tokens: GPT中指文本数据的最小处理单位。一个token可以是一个字、一个词或者一个字符，这取决于所使用的语言和处理方式。例如，在英文中，一个token可能是一个单词，如"apple"；在中文中，一个token可能是一个字符，如"苹"。 1K Tokens = 1000个Token。（根据经验估算：gpt - 4o模型 1000Tokens≈1000 - 1200个中文字符；非gpt - 4o模型1000Tokens≈700 - 800中文字符）
// 多模态模型图片如何计算占用tokens请参考OpenAI官方 https://openai.com/api/pricing 。分辨率越高，tokens占用越多，但最高不会超过1445tokens。
// 以下以1000x150分辨率的图片为例，计算图片占用Tokens数为425。
// 附图
// 仿照 https://chatanywhere.apifox.cn/doc-2694962
export const modelPrices: PriceTable = {
	"weikangai": { input: 0.001, output: 0.002 },
	"weikangai-bak": { input: 0.001, output: 0.002 },
	"deepseek-chat": { input: 0.001, output: 0.002},
	"gpt-4o-2024-08-06": { input: 0.0175, output: 0.07 },
	"THUDM/glm-4-9b-chat": { input: 0, output: 0 },
	"Qwen/Qwen2-7B-Instruct": { input: 0, output: 0 },
	"claude-3-5-sonnet-20240620": { input: 0.012, output: 0.06 }

};

// Source: https://kit.svelte.dev/docs/modules#$env-static-public
// This feature, akin to $env/static/private, exclusively incorporates environment variables
// that are prefixed with config.kit.env.publicPrefix (usually set to PUBLIC_).
// Consequently, these variables can be securely exposed to client-side code.
