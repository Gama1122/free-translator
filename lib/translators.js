// Translation providers live here. To add Google/DeepL later, add a function and a case.
// Default is MyMemory: free, no card, no key needed.
export async function translate(text, source, target) {
  const provider = (process.env.TRANSLATOR || 'mymemory').toLowerCase();
  if (provider === 'azure') return azure(text, source, target);
  if (provider === 'libretranslate') return libre(text, source, target);
  return myMemory(text, source, target);
}

// ---- MyMemory (max ~500 bytes per request, so we split into small pieces) ----
const MAX_BYTES = 450;

function pieces(line) {
  const sentences = line.split(/(?<=[.!?۔。])\s+/);
  const out = [];
  let cur = '';
  const push = () => { if (cur) { out.push(cur); cur = ''; } };
  for (let s of sentences) {
    while (Buffer.byteLength(s) > MAX_BYTES) { // very long sentence: cut by characters
      push();
      out.push(s.slice(0, 120));
      s = s.slice(120);
    }
    const joined = cur ? cur + ' ' + s : s;
    if (Buffer.byteLength(joined) > MAX_BYTES) { push(); cur = s; } else cur = joined;
  }
  push();
  return out;
}

async function myMemory(text, source, target) {
  const fix = (c) => (c === 'zh' ? 'zh-CN' : c);
  const pair = `${source === 'auto' ? 'Autodetect' : fix(source)}|${fix(target)}`;
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    if (!line.trim()) { result.push(''); continue; }
    const translated = [];
    for (const piece of pieces(line)) {
      const params = new URLSearchParams({ q: piece, langpair: pair });
      if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL);
      const res = await fetch(`https://api.mymemory.translated.net/get?${params}`);
      if (!res.ok) throw new Error(`MyMemory error ${res.status}`);
      const data = await res.json();
      if (Number(data.responseStatus) !== 200) throw new Error('MyMemory limit or error');
      translated.push(data.responseData.translatedText);
    }
    result.push(translated.join(' '));
  }
  return result.join('\n');
}

// ---- LibreTranslate ----
async function libre(text, source, target) {
  const base = (process.env.LIBRETRANSLATE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const res = await fetch(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text, source, target, format: 'text',
      api_key: process.env.LIBRETRANSLATE_API_KEY || undefined,
    }),
  });
  if (!res.ok) throw new Error(`LibreTranslate error ${res.status}`);
  return (await res.json()).translatedText;
}

// ---- Azure Translator ----
async function azure(text, source, target) {
  const fix = (c) => (c === 'zh' ? 'zh-Hans' : c);
  const params = new URLSearchParams({ 'api-version': '3.0', to: fix(target) });
  if (source !== 'auto') params.set('from', fix(source));
  const res = await fetch(`https://api.cognitive.microsofttranslator.com/translate?${params}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': process.env.AZURE_TRANSLATOR_REGION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ Text: text }]),
  });
  if (!res.ok) throw new Error(`Azure error ${res.status}`);
  return (await res.json())[0].translations[0].text;
}
