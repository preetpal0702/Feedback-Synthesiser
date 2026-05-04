# Feedback Synthesiser

Paste messy stakeholder feedback — get clean themes, conflicts, and an action plan ready to share.

---

## What it does

Cross-functional feedback is noisy. Different stakeholders highlight different things, contradict each other, and speak at different levels of specificity. This tool takes that raw input and turns it into a structured, decision-ready report in seconds.

The output covers seven sections:

1. **Context** — what this feedback is about
2. **Main themes** — signal extracted from the noise
3. **Stakeholder conflicts** — where people disagree and why
4. **Risks and unknowns** — what's missing or unvalidated
5. **Recommended next steps** — what to resolve now vs. later
6. **Slack-ready summary** — one-click copy to share with your team
7. **Suggested follow-up questions** — what to ask next

---

## Features

**Input**
- Structured template: project name, decision context, priority focus, and raw feedback
- Toggle "Keep it simple" to collapse to a single input field
- Upload transcripts directly (`.txt`, `.md`, `.vtt`, `.srt`, `.csv`)
- Drag and drop files onto the feedback textarea
- Run test data button — loads a sample scenario and streams a mock report instantly, no API credits used

**Output**
- Streams in real time as the report generates
- Slide-in animation — the output panel eases in from the right when synthesis starts
- Download report as PDF (via print dialog) or DOC (`.docx`)
- Rate the report (Useful / Needs work) with an optional comment

**App**
- Landing page with product overview and CTA
- Give feedback button in the header — opens a modal with type chips (Bug, Suggestion, Praise, Other)
- Frosted glass sticky header
- Satoshi font, plum/taupe colour scheme built on a full design token system

---

## Getting started

### Prerequisites

- Node.js 18+
- An Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

### Install

```bash
git clone https://github.com/preetpal0702/Feedback-Synthesiser.git
cd Feedback-Synthesiser
npm install
```

### Configure

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_api_key_here
```

### Run

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
├── src/
│   ├── server.js          # Express server, AI streaming endpoint
│   └── public/
│       ├── index.html     # Landing page
│       ├── app.html       # App — layout, styles, all components
│       └── app.js         # Client-side logic — streaming, upload, download, modals
├── tokens/                # Design token source files (Style Dictionary)
│   ├── color/
│   │   ├── base.json      # Raw palette
│   │   ├── background.json
│   │   ├── border.json
│   │   ├── text.json
│   │   ├── action.json
│   │   ├── accent.json
│   │   └── status.json
│   ├── component/
│   │   └── hero.json
│   ├── font.json
│   └── size.json
├── dist/
│   └── variables.css      # Generated CSS custom properties
├── config.json            # Style Dictionary build config
└── .env                   # API key (not committed)
```

---

## Design tokens

Tokens are managed with [Style Dictionary](https://amzn.github.io/style-dictionary). The source files in `tokens/` follow a three-layer hierarchy:

```
base palette → semantic aliases → component tokens
```

To regenerate `dist/variables.css` after editing tokens:

```bash
npx style-dictionary build --config config.json
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Server | Node.js + Express 5 |
| Streaming | Server-Sent Events (SSE) |
| Frontend | Vanilla JS, no framework |
| Markdown | Marked.js |
| DOC export | html-docx-js |
| Tokens | Style Dictionary |
| Dev server | Nodemon |
