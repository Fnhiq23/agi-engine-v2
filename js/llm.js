/* AGI Engine v2 — LLM 连接器
 * 原则：用户的 Key 只存在本机浏览器；默认只存 sessionStorage，
 * 用户显式勾选"在此设备记住"才落 localStorage，并提供一键清除。
 */
import { KEYS, loadJSON, saveJSON, maskKey } from './core.js';

export const PRESETS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    style: 'openai',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
  },
  anthropic: {
    label: 'Anthropic（浏览器直连，需开 CORS 头）',
    baseUrl: 'https://api.anthropic.com/v1',
    style: 'anthropic',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
    defaultModel: 'claude-3-5-haiku-latest',
    requiresKey: true,
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    style: 'openai',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini'],
    defaultModel: 'anthropic/claude-3.5-sonnet',
    requiresKey: true,
  },
  stepfun: {
    label: '阶跃星辰',
    baseUrl: 'https://api.stepfun.com/v1',
    style: 'openai',
    models: ['step-3.7-flash', 'step-3.5-turbo'],
    defaultModel: 'step-3.7-flash',
    requiresKey: true,
  },
  ollama: {
    label: '本地模型（Ollama / LM Studio）',
    baseUrl: 'http://localhost:11434/v1',
    style: 'openai',
    models: ['llama3.1', 'qwen2.5', 'mistral'],
    defaultModel: 'llama3.1',
    requiresKey: false,
  },
  custom: {
    label: '自定义（OpenAI 兼容）',
    baseUrl: '',
    style: 'openai',
    models: [],
    defaultModel: '',
    requiresKey: false,
  },
};

const DEFAULT_CFG = {
  provider: 'openai',
  model: PRESETS.openai.defaultModel,
  baseUrl: '',
  persist: false,
};

let cfg = loadJSON(localStorage, KEYS.llmCfg, null) || { ...DEFAULT_CFG };
let usage = loadJSON(localStorage, KEYS.usage, null) || { calls: 0, tokens: 0, lastAt: null };

function readKey() {
  try {
    return sessionStorage.getItem(KEYS.llmKey) || localStorage.getItem(KEYS.llmKey) || '';
  } catch (err) {
    return '';
  }
}

function writeKey(key, persist) {
  try {
    sessionStorage.removeItem(KEYS.llmKey);
    localStorage.removeItem(KEYS.llmKey);
    if (!key) return;
    (persist ? localStorage : sessionStorage).setItem(KEYS.llmKey, key);
  } catch (err) {
    /* 存储不可用时退化为仅内存态 */
    memoryKey = key;
  }
}

let memoryKey = '';

export const LLM = {
  preset(provider) {
    return PRESETS[provider] || PRESETS.custom;
  },

  configure({ provider, apiKey = '', model, baseUrl = '', persist = false }) {
    const preset = this.preset(provider);
    cfg = {
      provider,
      model: model || preset.defaultModel,
      baseUrl: baseUrl || '',
      persist: Boolean(persist),
    };
    writeKey(apiKey.trim(), cfg.persist);
    saveJSON(localStorage, KEYS.llmCfg, cfg);
    return this.status();
  },

  status() {
    const key = readKey() || memoryKey;
    const preset = this.preset(cfg.provider);
    return {
      provider: cfg.provider,
      label: preset.label,
      model: cfg.model || preset.defaultModel,
      baseUrl: cfg.baseUrl || preset.baseUrl,
      style: preset.style,
      requiresKey: preset.requiresKey,
      hasKey: Boolean(key),
      maskedKey: maskKey(key),
      persist: cfg.persist,
      usage: { ...usage },
    };
  },

  clear() {
    writeKey('', false);
    memoryKey = '';
    saveJSON(localStorage, KEYS.llmCfg, cfg);
  },

  async chat(messages, { maxTokens = 1024, temperature = 0.7, timeoutMs = 30000 } = {}) {
    const key = readKey() || memoryKey;
    const preset = this.preset(cfg.provider);
    if (preset.requiresKey && !key) {
      return { error: 'NO_KEY', message: '还没有填入 API Key，请到「设置」里连接你自己的模型。' };
    }
    const baseUrl = (cfg.baseUrl || preset.baseUrl || '').replace(/\/+$/, '');
    if (!baseUrl) return { error: 'NO_ENDPOINT', message: '请填写接口地址（例如 http://localhost:11434/v1）。' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let url = `${baseUrl}/chat/completions`;
      const headers = { 'Content-Type': 'application/json' };
      let body;

      if (preset.style === 'anthropic') {
        url = `${baseUrl}/messages`;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        if (key) headers['x-api-key'] = key;
        body = {
          model: cfg.model,
          max_tokens: maxTokens,
          system: messages.find((m) => m.role === 'system')?.content || '',
          messages: messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        };
      } else {
        if (key) headers.Authorization = `Bearer ${key}`;
        body = {
          model: cfg.model,
          messages,
          max_tokens: maxTokens,
          temperature,
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        const msg = detail?.error?.message || detail?.error || `HTTP ${res.status}`;
        return { error: 'HTTP_ERROR', message: String(msg).slice(0, 300) };
      }

      const data = await res.json();
      const content =
        preset.style === 'anthropic'
          ? (data.content || []).map((p) => p.text || '').join('').trim()
          : (data.choices?.[0]?.message?.content || '').trim();

      if (!content) return { error: 'EMPTY', message: '模型返回了空内容，请换一个模型或稍后重试。' };

      const inputTokens = data.usage?.prompt_tokens || data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || data.usage?.output_tokens || 0;
      usage = {
        calls: usage.calls + 1,
        tokens: usage.tokens + inputTokens + outputTokens,
        lastAt: new Date().toISOString(),
      };
      saveJSON(localStorage, KEYS.usage, usage);

      return { content, usage: { inputTokens, outputTokens } };
    } catch (err) {
      if (err.name === 'AbortError') return { error: 'TIMEOUT', message: '请求超时，请检查网络或本地服务。' };
      return { error: 'NETWORK', message: '网络错误或接口拒绝浏览器跨域请求。' };
    } finally {
      clearTimeout(timer);
    }
  },
};
