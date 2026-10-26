import { NextResponse } from 'next/server';
import { translate } from '../../../lib/translators';

const DAILY_LIMIT = Number(process.env.DAILY_CHAR_LIMIT || 20000);
const MAX_REQUEST = 5000;
const usage = new Map(); // in-memory; resets on restart (fine for an MVP)

export async function POST(req) {
  const { text, source = 'auto', target } = await req.json().catch(() => ({}));
  if (!text || !target) return NextResponse.json({ error: 'Text and target language are required.' }, { status: 400 });
  if (text.length > MAX_REQUEST) return NextResponse.json({ error: 'Text chunk is too long.' }, { status: 413 });

  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = `${ip}:${new Date().toISOString().slice(0, 10)}`;
  if (usage.size > 5000) usage.clear();
  const used = usage.get(key) || 0;
  if (used + text.length > DAILY_LIMIT)
    return NextResponse.json({ error: 'Daily free limit reached. Please try again tomorrow.' }, { status: 429 });

  try {
    const translated = await translate(text, source, target);
    usage.set(key, used + text.length);
    return NextResponse.json({ translated });
  } catch (e) {
    return NextResponse.json({ error: 'Translation service is not available right now.' }, { status: 502 });
  }
}
