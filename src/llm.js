export const LANGUAGES = [
  { code: 'ja', label: '日本語', name: 'Japanese' },
  { code: 'en', label: '英語', name: 'English' },
  { code: 'zh-hans', label: '中国語（簡体字）', name: 'Simplified Chinese' },
  { code: 'zh-hant', label: '中国語（繁体字）', name: 'Traditional Chinese' },
  { code: 'ko', label: '韓国語', name: 'Korean' },
  { code: 'fr', label: 'フランス語', name: 'French' },
  { code: 'de', label: 'ドイツ語', name: 'German' },
  { code: 'es', label: 'スペイン語', name: 'Spanish' },
];

// The default translation prompt from the Hy-MT3 model card. The target
// language is written as its full English name, as the card asks.
export function buildPrompt(targetLang, text) {
  const name = LANGUAGES.find((l) => l.code === targetLang)?.name ?? targetLang;
  return `Translate the following text into ${name}. Note that you should only output the translated result without any additional explanation:\n\n${text}`;
}

function headers(settings) {
  const h = { 'Content-Type': 'application/json' };
  if (settings.apiKey) h.Authorization = `Bearer ${settings.apiKey}`;
  return h;
}

async function request(url, init) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(60_000) });
  } catch (e) {
    const reason = e.name === 'TimeoutError' ? '応答がありません（60 秒）' : e.message;
    throw new Error(`${url} に接続できません: ${reason}`);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}

export async function translate(settings, text, { signal } = {}) {
  const body = {
    ...(settings.model ? { model: settings.model } : {}),
    temperature: 0,
    messages: [{ role: 'user', content: buildPrompt(settings.targetLang, text) }],
  };
  const data = await request(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: headers(settings),
    body: JSON.stringify(body),
    signal,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('応答に訳文が含まれていません');
  return content.trim();
}

export async function listModels(settings) {
  const data = await request(`${settings.baseUrl}/models`, { headers: headers(settings) });
  return (data?.data ?? []).map((m) => m.id).filter(Boolean);
}
