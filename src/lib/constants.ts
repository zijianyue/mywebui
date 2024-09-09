import { browser, dev } from '$app/environment';
// import { version } from '../../package.json';

export const APP_NAME = 'CPoe';

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
	coe?: number;	// 系数，不指定的都按PRICE_COE
	useExchangeRate?: boolean;		// 需要乘美元汇率，默认不用乘
	disc1?: string;
	disc2?: string;
	disc3?: string;
};

type PriceTable = {
	[modelId: string]: ModelPrice;
};

export const INIT_BALANCE_AMOUNT = 5;
export const PRICE_COE = 2;
export const PIC_PRICE = 0.1;
export const LOWEST_AMOUNT = 0.01;


// 原始价格，我们要乘个系数
// 价格随着供应商的变动而变动
// [1] Tokens: GPT中指文本数据的最小处理单位。一个token可以是一个字、一个词或者一个字符，这取决于所使用的语言和处理方式。例如，在英文中，一个token可能是一个单词，如"apple"；在中文中，一个token可能是一个字符，如"苹"。 1K Tokens = 1000个Token。（根据经验估算：gpt - 4o模型 1000Tokens≈1000 - 1200个中文字符；非gpt - 4o模型1000Tokens≈700 - 800中文字符）
// 多模态模型图片如何计算占用tokens请参考OpenAI官方 https://openai.com/api/pricing 。分辨率越高，tokens占用越多，但最高不会超过1445tokens。
// 以下以1000x150分辨率的图片为例，计算图片占用Tokens数为425。
// 附图
// 仿照 https://chatanywhere.apifox.cn/doc-2694962
export const modelPrices: PriceTable = {
	"weikangai": { input: 0.001, output: 0.002, disc1: "唯康感统智能助手是我司（武汉猿核信息科技有限公司）推出的一款面向小儿感统方面的知识与疑难解答的AI助理对话机器人。", disc2: "", disc3: "" },
	// "weikangai-bak": { input: 0.001, output: 0.002, disc1: "唯康感统智能助手的备份。", disc2: "", disc3: "" },
	"deepseek-chat": { input: 0.001, output: 0.002, disc1: "深度求索V2通用是国产开源的MoE大模型，一个强大、经济、高效的混合专家语言模型，具有以下显著特点和优势‌：", disc2: "高性能与经济性结合 ：尽管性能达到GPT-4级别，但其价格仅为GPT-4-Turbo的百分之一，使得开发者能够低成本获得GPT-4级别的辅助功能。参数与计算效率 ：该模型总共包含2360亿个参数，激活每个token只需要210亿个参数，相比前辈，节省了42.5%训练成本、减少了93.3%的KV缓存，并显著提升了生成吞吐量至5.76倍。多语言支持 ：支持涵盖338种编程语言的128K上下文长度，便于处理多语言编码工作，促进跨国界的互操作性。", disc3: "创新架构 ：采用了MLA（多头部潜在注意力）和MoE架构，分别优化了计算量与推理内存需求，使得模型在效率与经济性之间取得平衡。广泛应用场景 ：在代码生成、改进、问题解答与跨语言开发支持上显示了强大能力，适合各种规模的团队和企业用来提高开发效率与准确性。成本效益 ：对资源有限的开发者，提供了易于负担的API调用方案，使更多用户得以使用这一高性能AI。" },
	"deepseek-coder": { input: 0.001, output: 0.002, disc1: "深度求索V2代码助手是深度求索V2针对代码生成优化的模型。", disc2: "", disc3: "" },
	"gpt-4o-mini": { input: 0.00105, output: 0.0042, disc1: "GPT-4o mini是OpenAI于当地时间2024年7月18日推出迷你AI模型，该模型是GPT-4o的一个分支。", disc2: "作为小模型一度登顶，与GPT-4o满血版并列第一。不仅性能更强，价格也来到了「白菜价」。", disc3: "" },
	"gpt-4o-2024-08-06": { input: 0.0175, output: 0.07, disc1: "gpt-4o-2024-08-06 模型是OpenAI在深度学习和自然语言处理领域的最新成果。", disc2: "支持结构化输出，例如JSON，且取得了满分100%的卓越成绩。", disc3: "" },
	"claude-3-5-sonnet-20240620": { input: 0.012, output: 0.06, disc1: "claude-3-5-sonnet-20240620是由Anthropic发布的新AI模型，属于Claude系列。", disc2: "Claude-3.5-Sonnet对于那些寻求平衡、性价比高且具有强大文本和图像任务能力的用户来说，是一个强有力的竞争者。而GPT-4o则因其卓越的语言处理能力和高级多模态功能，尽管成本更高，仍然是顶级选择。选择哪一个取决于具体的应用需求和预算考虑。", disc3: "" },
	"Qwen/Qwen2-72B-Instruct": { input: 0.00413, output: 0.00413},
	"Qwen/Qwen2-Math-72B-Instruct": { input: 0.00413, output: 0.00413},
	// "meta/llama-3.1-405b-instruct": { input: 0.021, output: 0.021, disc1: "", disc2: "", disc3: "" },
	// "meta-llama/Meta-Llama-3.1-70B-Instruct": { input: 0.00413, output: 0.00413, disc1: "", disc2: "", disc3: "" },
	"meta-llama/Meta-Llama-3.1-405B-Instruct": { input: 0.021, output: 0.021},
	"chatgpt-4o-latest": { input: 0.035, output: 0.105},
	// "gemini-1.5-flash": { input: 0.002, output: 0.006, coe: 1.1, useExchangeRate: true ,disc1: "", disc2: "", disc3: "" }, // 2/6$ 服务不可用
	"gemini-1.5-pro-latest": { input: 0.004, output: 0.012, coe: 1.1, useExchangeRate: true}, // 4/12$
	"deepseek-ai/DeepSeek-V2.5": { input: 0.001, output: 0.002},
	"mattshumer/Reflection-Llama-3.1-70B": { input: 0.00413, output: 0.00413},

	// "microsoft/phi-3.5-moe-instruct": { input: 0.00126, output: 0.00126, disc1: "", disc2: "", disc3: "" },
	// "microsoft/phi-3.5-vision-instruct": { input: 0.00126, output: 0.00126, disc1: "", disc2: "", disc3: "" },
	// "google/gemma-2-27b-it": { input: 0.00126, output: 0.00126, disc1: "", disc2: "", disc3: "" },

};
// export const modelsNeedTranslate = [
// 	"llama-3.1-70b-versatile", "meta/llama-3.1-405b-instruct", "meta-llama/Meta-Llama-3.1-405B-Instruct", "mistralai/mixtral-8x22b-instruct-v0.1", "google/gemma-2-27b-it", "microsoft/phi-3.5-moe-instruct", "microsoft/phi-3.5-vision-instruct"
// ];
export const modelsNeedTranslate = [
	"llama-3.1-70b-versatile", "meta/llama-3.1-405b-instruct", "meta-llama/Meta-Llama-3.1-405B-Instruct", "microsoft/phi-3.5-moe-instruct", "microsoft/phi-3.5-vision-instruct"
];
export const modelsCanOutputChinese = [
	"google/gemma-2-27b-it",
];

// Source: https://kit.svelte.dev/docs/modules#$env-static-public
// This feature, akin to $env/static/private, exclusively incorporates environment variables
// that are prefixed with config.kit.env.publicPrefix (usually set to PUBLIC_).
// Consequently, these variables can be securely exposed to client-side code.
