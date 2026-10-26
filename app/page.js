'use client';
import { useState } from 'react';
import { LANGS, RTL } from '../lib/langs';

const CHUNK = 3000;

function splitText(text) {
  const parts = [];
  let cur = '';
  for (let line of text.split('\n')) {
    while (line.length > CHUNK) {
      if (cur) { parts.push(cur); cur = ''; }
      parts.push(line.slice(0, CHUNK));
      line = line.slice(CHUNK);
    }
    if (cur && (cur + '\n' + line).length > CHUNK) { parts.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  }
  if (cur) parts.push(cur);
  return parts.filter((p) => p.trim());
}

async function extractText(file, ocrCode, onStatus) {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) {
    const Tesseract = await import('tesseract.js');
    const { data } = await Tesseract.recognize(file, ocrCode, {
      logger: (m) => m.status === 'recognizing text' && onStatus(`Reading image… ${Math.round(m.progress * 100)}%`),
    });
    return data.text;
  }
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      onStatus(`Reading PDF page ${i} of ${pdf.numPages}…`);
      const content = await (await pdf.getPage(i)).getTextContent();
      out += content.items.map((it) => it.str).join(' ') + '\n\n';
    }
    return out;
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (name.endsWith('.txt')) return file.text();
  throw new Error('Unsupported file. Use an image, PDF, DOCX or TXT file.');
}

export default function Home() {
  const [source, setSource] = useState('auto');
  const [target, setTarget] = useState('ur');
  const [original, setOriginal] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setResult(''); setBusy(true); setStatus('Reading file…');
    try {
      const ocr = LANGS.find((l) => l.code === source)?.ocr || 'eng';
      setOriginal((await extractText(file, ocr, setStatus)).trim());
      setStatus('Text ready. Check it, then press Translate.');
    } catch (err) {
      setError(err.message || 'Could not read this file.');
      setStatus('');
    }
    setBusy(false);
    e.target.value = '';
  }

  async function onTranslate() {
    setError(''); setResult(''); setBusy(true);
    try {
      const parts = splitText(original);
      let out = [];
      for (let i = 0; i < parts.length; i++) {
        setStatus(`Translating part ${i + 1} of ${parts.length}…`);
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: parts[i], source, target }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Translation failed.');
        out.push(data.translated);
      }
      setResult(out.join('\n'));
      setStatus('Done.');
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
    setBusy(false);
  }

  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([result], { type: 'text/plain;charset=utf-8' }));
    a.download = `translation-${target}.txt`;
    a.click();
  }

  return (
    <main>
      <h1>Translate documents and images, free</h1>
      <p className="sub">Upload a PDF, Word file, text file or photo. No sign-up needed.</p>

      <label className="drop">
        <strong>Choose a file</strong>
        <small>Image (JPG, PNG), PDF, DOCX or TXT. Files are read in your browser.</small>
        <input type="file" hidden accept="image/*,.pdf,.docx,.txt" onChange={onFile} disabled={busy} />
      </label>

      <div className="row">
        <label>Language of the file
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="auto">Detect automatically</option>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
        <label>Translate into
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
        <button onClick={onTranslate} disabled={busy || !original.trim()}>Translate</button>
      </div>

      <p className="status" role="status">{status}</p>
      {error && <p className="status error" role="alert">{error}</p>}

      <div className="cols">
        <div>
          <h2>Original text</h2>
          <textarea value={original} onChange={(e) => setOriginal(e.target.value)}
            placeholder="Type or paste text here, or upload a file above." />
        </div>
        <div>
          <h2>Translation</h2>
          <textarea value={result} readOnly dir={RTL.includes(target) ? 'rtl' : 'ltr'} />
          <div className="actions">
            <button className="alt" disabled={!result} onClick={() => navigator.clipboard.writeText(result)}>Copy</button>
            <button className="alt" disabled={!result} onClick={download}>Download .txt</button>
          </div>
        </div>
      </div>
    </main>
  );
}
