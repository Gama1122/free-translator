# Free Translator (MVP)

Upload an image, PDF, DOCX or TXT and translate it. Text is extracted in the browser
(Tesseract.js, pdf.js, mammoth); only the text goes to the translation service.

## Run locally
1. Install Node.js 18+.
2. `npm install`
3. Copy `.env.example` to `.env.local` (default uses MyMemory, no key needed)
4. `npm run dev` and open http://localhost:3000

## Deploy on Vercel
Push this folder to GitHub, import it on vercel.com. Add any variables from `.env.example`
under Settings > Environment Variables. Never commit `.env.local`.

## Switch translation service
Set `TRANSLATOR=azure` (plus `AZURE_TRANSLATOR_KEY`, `AZURE_TRANSLATOR_REGION`) or
`TRANSLATOR=libretranslate` (plus `LIBRETRANSLATE_URL`).

## Known limits
- Scanned PDFs (pages that are pictures) are not read yet; upload them as images instead.
- Output is plain text; the original layout is not kept.
- Daily limit is per IP and stored in memory (resets on restart).
- MyMemory has a small free daily quota and lower quality than Azure.
