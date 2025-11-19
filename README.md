# Excel Chatbot Frontend

A Next.js UI that lets users upload Excel workbooks, ask natural-language questions, and receive concise answers powered by OpenAI.

## Features

- Excel ingestion via [`app/api/workbooks/route.js`](app/api/workbooks/route.js)
- Query workflow backed by [`lib/workbooksStore.saveWorkbook`](lib/workbooksStore.js) and [`lib/workbooksStore.getWorkbook`](lib/workbooksStore.js)
- AI filter planning and summarization handled in [`app/api/workbooks/[id]/query/route.js`](app/api/workbooks/%5Bid%5D/query/route.js)
- Chat-style interface implemented by [`app/page.js`](app/page.js), [`app/components/FileUpload.js`](app/components/FileUpload.js), and [`app/components/ChatBox.js`](app/components/ChatBox.js)

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind-ready styling pipeline
- OpenAI Responses & Chat Completions APIs
- XLSX parsing for workbook ingestion

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Ensure OPENAI_API_KEY is set (already present in development)
   ```

3. **Run the dev server**

   ```bash
   npm run dev
   ```

4. **Open the app**
   Visit `http://localhost:3000`, upload an `.xlsx` file, then chat with the bot.

## API Overview

- `POST /api/workbooks`
  - Multipart upload (`file`) → returns workbook metadata and ID.
- `POST /api/workbooks/:id/query`
  - JSON body `{ "query": "..." }`
  - Returns structured matches plus a short `summary`.

## Frontend Flow

1. [`FileUpload`](app/components/FileUpload.js) posts the workbook and updates state.
2. [`ChatBox`](app/components/ChatBox.js) captures user prompts.
3. [`Home.handleQuery`](app/page.js) calls the query API and appends bot responses.

## Project Structure

<details>
<summary>Click to expand</summary>

```
frontend/
├─ app/
│  ├─ api/
│  │  └─ workbooks/
│  │     ├─ [id]/query/
│  │     │  └─ route.js
│  │     └─ route.js
│  ├─ components/
│  │  ├─ ChatBox.js
│  │  └─ FileUpload.js
│  ├─ layout.js
│  └─ page.js
├─ lib/
│  └─ workbooksStore.js
├─ public/
├─ .env
├─ package.json
└─ README.md
```

</details>

## Testing Tips

- Restart `npm run dev` after adding new API files so Next.js picks them up.
- Inspect browser network tab to confirm `workbookId` propagation.
- Use meaningful sample queries to validate AI-driven summaries.

## Deployment Notes

- Set `OPENAI_API_KEY` securely in production.
- Consider persisting workbooks beyond in-memory storage if scaling is required.
