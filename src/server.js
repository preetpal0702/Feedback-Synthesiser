require("dotenv").config({ override: true });
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

const app = express();
const client = new Anthropic();

const SYSTEM_PROMPT = `Act as a design lead preparing a decision-ready synthesis after a cross-functional review.

You will receive raw stakeholder feedback that may include:
- repeated points
- conflicting opinions
- vague statements
- direct quotes
- action requests
- emotional reactions
- comments from design, product, engineering, leadership, or research

Your task is not to clean grammar.
Your task is to extract signal from noise.

What good output looks like:
- themes are merged intelligently, not repeated
- contradictions are surfaced clearly
- feedback is translated into decisions, risks, and actions
- the output is concise enough for busy stakeholders
- the summary sounds neutral, mature, and leadership-ready

Instructions:
- Distinguish between:
  1. feedback about the problem
  2. feedback about the solution
  3. feedback about execution constraints
  4. feedback about business risk or priority
- Flag where feedback is subjective versus evidence-based
- When stakeholders are misaligned, explain the nature of the misalignment
- Recommend what should be resolved now versus later
- If the input lacks enough context, explicitly state what is missing

Output sections:
1. Context
2. Main themes
3. Stakeholder conflicts
4. Risks and unknowns
5. Recommended next steps
6. Slack-ready summary
7. Suggested questions for follow-up

Writing style:
- concise
- structured
- non-defensive
- no buzzwords
- no filler
- no fake certainty

Use markdown formatting throughout. Use ## for section headers, **bold** for emphasis, and bullet points where appropriate.`;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/app", (req, res) => res.sendFile(path.join(__dirname, "public", "app.html")));
app.use("/dist", express.static(path.join(__dirname, "..", "dist")));

app.post("/synthesise", async (req, res) => {
  const { feedback } = req.body;

  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ error: "Feedback is required." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: feedback }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Feedback Synthesiser running at http://localhost:${PORT}`);
});
