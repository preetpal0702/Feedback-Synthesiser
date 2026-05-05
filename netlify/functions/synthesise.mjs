import Anthropic from "@anthropic-ai/sdk";

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

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let feedback;
  try {
    ({ feedback } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!feedback?.trim()) {
    return new Response(JSON.stringify({ error: "Feedback is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key not configured. Add ANTHROPIC_API_KEY in your Netlify environment variables." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));

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
            send(JSON.stringify({ text: event.delta.text }));
          }
        }

        send("[DONE]");
      } catch (err) {
        send(JSON.stringify({ error: err.message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
};

export const config = { path: "/synthesise" };
