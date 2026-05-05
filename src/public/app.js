const textarea = document.getElementById("feedback");
const charCount = document.getElementById("char-count");
const synthesiseBtn = document.getElementById("synthesise-btn");
const statusBadge = document.getElementById("status-badge");
const outputEmpty = document.getElementById("output-empty");
const outputContent = document.getElementById("output-content");
const fileChips = document.getElementById("file-chips");

// ── Char counter (across all fields) ──
function updateCharCount() {
  const total = buildPrompt().length;
  charCount.textContent = `${total} chars`;
}

document.getElementById("project-name").addEventListener("input", updateCharCount);
document.getElementById("decision").addEventListener("input", updateCharCount);
document.getElementById("priority").addEventListener("input", updateCharCount);
textarea.addEventListener("input", updateCharCount);

// ── Assemble structured prompt ──
function buildPrompt() {
  const project  = document.getElementById("project-name").value.trim();
  const decision = document.getElementById("decision").value.trim();
  const priority = document.getElementById("priority").value.trim();
  const feedback = textarea.value.trim();

  const lines = [];
  if (project)  lines.push(`Project name: ${project}`);
  if (decision) lines.push(`What we are trying to decide: ${decision}`);
  if (priority) lines.push(`Priority focus: ${priority}`);
  if (lines.length && feedback) lines.push("");
  if (feedback) lines.push(`Raw feedback:\n${feedback}`);

  return lines.join("\n");
}

// ── Drag & drop onto textarea ──
textarea.addEventListener("dragover", (e) => {
  e.preventDefault();
  textarea.classList.add("drag-over");
});

textarea.addEventListener("dragleave", () => {
  textarea.classList.remove("drag-over");
});

textarea.addEventListener("drop", (e) => {
  e.preventDefault();
  textarea.classList.remove("drag-over");
  const files = [...e.dataTransfer.files].filter(isTextFile);
  if (files.length) handleFiles(files);
});

// ── File helpers ──
const ACCEPTED = [".txt", ".md", ".vtt", ".srt", ".csv"];

function isTextFile(file) {
  return ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));
}

function handleFiles(fileList) {
  const files = [...fileList].filter(isTextFile);
  if (!files.length) return;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const separator = textarea.value.length > 0 ? "\n\n---\n\n" : "";
      textarea.value += separator + e.target.result.trim();
      updateCharCount();
      addChip(file.name);
    };
    reader.readAsText(file);
  });

  // Reset input so the same file can be re-uploaded
  document.getElementById("file-input").value = "";
}

function addChip(name) {
  const chip = document.createElement("div");
  chip.className = "file-chip";
  chip.dataset.name = name;
  chip.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h5l3 3v6H4V4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M9 4v3h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
    ${name}
    <button onclick="removeChip(this)" title="Remove">✕</button>
  `;
  fileChips.appendChild(chip);
}

function removeChip(btn) {
  btn.closest(".file-chip").remove();
}

function setStatus(state) {
  statusBadge.className = `status-badge ${state}`;
  if (state === "idle") {
    statusBadge.innerHTML = "Ready";
  } else if (state === "running") {
    statusBadge.innerHTML = '<span class="spinner"></span> Synthesising…';
  } else if (state === "error") {
    statusBadge.innerHTML = "Error";
  } else if (state === "done") {
    statusBadge.className = "status-badge idle";
    statusBadge.innerHTML = "Done";
  }
}

function showOutput() {
  document.querySelector("main").classList.add("split");
  outputEmpty.style.display = "none";
  outputContent.style.display = "block";
}

function hideOutput() {
  document.querySelector("main").classList.remove("split");
  outputEmpty.style.display = "flex";
  outputContent.style.display = "none";
}

function renderMarkdown(raw) {
  outputContent.innerHTML = marked.parse(raw);
  injectSlackBlock();
  injectCopyButtons();
  showReportActions();
}

// ── Report actions (download + feedback) ──
function showReportActions() {
  document.getElementById("download-actions").style.display = "flex";
  document.getElementById("report-feedback-bar").classList.add("visible");
}

function hideReportActions() {
  document.getElementById("download-actions").style.display = "none";
  const bar = document.getElementById("report-feedback-bar");
  bar.classList.remove("visible");
  document.getElementById("vote-up").className = "vote-btn";
  document.getElementById("vote-down").className = "vote-btn";
  document.getElementById("report-comment-wrap").style.display = "none";
  document.getElementById("report-comment").value = "";
  const thanks = bar.querySelector(".feedback-thanks");
  if (thanks) thanks.remove();
}

function downloadPDF() {
  window.print();
}

function downloadDOC() {
  const projectName = document.getElementById("project-name").value.trim() || "Synthesis Report";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title></head><body>${outputContent.innerHTML}</body></html>`;
  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

function voteReport(positive) {
  const up   = document.getElementById("vote-up");
  const down = document.getElementById("vote-down");
  const commentWrap = document.getElementById("report-comment-wrap");

  up.className   = positive ? "vote-btn active-up"   : "vote-btn";
  down.className = positive ? "vote-btn"              : "vote-btn active-down";

  commentWrap.style.display = positive ? "none" : "flex";
  if (positive) submitReportFeedback(true);
}

function submitReportFeedback(silent = false) {
  const positive = document.getElementById("vote-up").classList.contains("active-up");
  const comment  = document.getElementById("report-comment").value.trim();

  if (!silent) {
    document.getElementById("report-comment-wrap").style.display = "none";
  }

  const bar = document.getElementById("report-feedback-bar");
  const existing = bar.querySelector(".feedback-thanks");
  if (!existing) {
    const thanks = document.createElement("span");
    thanks.className = "feedback-thanks";
    thanks.textContent = "Thanks for the feedback.";
    bar.appendChild(thanks);
  }
}

function injectSlackBlock() {
  const headings = outputContent.querySelectorAll("h2");
  for (const h2 of headings) {
    if (/slack/i.test(h2.textContent)) {
      let el = h2.nextElementSibling;
      while (el && el.tagName !== "H2") {
        if (el.tagName === "P" || el.tagName === "UL" || el.tagName === "BLOCKQUOTE") {
          const text = el.innerText || el.textContent;
          const block = document.createElement("div");
          block.className = "slack-block";
          block.textContent = text;
          el.replaceWith(block);
          break;
        }
        el = el.nextElementSibling;
      }
      break;
    }
  }
}

function injectCopyButtons() {
  outputContent.querySelectorAll(".slack-block").forEach((block) => {
    if (block.querySelector(".copy-btn")) return;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.onclick = () => {
      navigator.clipboard.writeText(block.textContent.replace("Copy", "").trim()).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 1500);
      });
    };
    block.appendChild(btn);
  });
}

async function synthesise() {
  const feedback = buildPrompt();
  if (!feedback) return;

  synthesiseBtn.disabled = true;
  setStatus("running");
  showOutput();
  outputContent.innerHTML = '<span class="cursor"></span>';

  let raw = "";

  try {
    const response = await fetch("/synthesise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: buildPrompt() }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") break;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            raw += parsed.text;
            outputContent.innerHTML = marked.parse(raw) + '<span class="cursor"></span>';
            const panel = document.querySelector(".panel-output");
            panel.scrollTop = panel.scrollHeight;
          }
        } catch (e) {
          if (e.message !== "Unexpected end of JSON input") throw e;
        }
      }
    }

    renderMarkdown(raw);
    setStatus("done");
  } catch (err) {
    outputContent.innerHTML = `<p style="color:var(--color-status-danger-text)">${err.message}</p>`;
    setStatus("error");
  } finally {
    synthesiseBtn.disabled = false;
  }
}

const TEST_SCENARIOS = [
  {
    project: "Onboarding redesign",
    decision: "Whether to ship the revised onboarding flow in Q3 or delay to Q4 pending further research",
    priority: "User confidence and time to first value",
    feedback: `• PM: "Users are confused by the onboarding but the core feature is solid. We need to move fast — competitors are closing in."
• Design lead: "The new flow tested better in concept but we never validated the tooltip approach with real users. I'm nervous about shipping blind."
• Eng lead: "We can't ship the revised flow in Q3. The backend personalisation layer needs 6 more weeks minimum. We could ship a stripped version."
• CEO: "Competitors are eating our lunch. We need to show momentum to the board in October. Delay is not an option."
• Research: "Only 2 of 8 participants completed onboarding in usability testing. The drop-off is at step 3 — the permissions screen. We have a fix ready but it's not been built yet."
• Customer success: "We get 3–5 support tickets a day about onboarding confusion. It's our top complaint by volume."
• Marketing: "We've already promised the new onboarding in our Q3 comms. Walking it back would look bad externally."`,
  },
  {
    project: "Mobile app pricing strategy",
    decision: "Whether to introduce a freemium tier or keep the current paid-only model",
    priority: "Revenue growth without cannibalising existing paid users",
    feedback: `• CFO: "Our MRR growth has flatlined at 2% for three months. We need a new acquisition lever. Freemium worked for every major competitor."
• Product: "Freemium introduces enormous scope complexity. We'd essentially be maintaining two products. The eng cost is real."
• Sales: "Enterprise prospects keep asking for a trial. We're losing deals because people can't evaluate before committing."
• Existing users (survey, n=240): "68% said they would not have paid upfront if freemium had existed when they signed up."
• Growth: "Our conversion rate from trial landing pages is 4.2%. Industry average for freemium-to-paid is 2–5%. The math works if ARPU holds."
• Eng lead: "We can gate features cleanly in 3 weeks. The risk is support volume — free users generate disproportionate tickets based on industry data."
• Investor: "Topline growth matters more than margin at this stage. Take the acquisition hit now."`,
  },
  {
    project: "Design system adoption",
    decision: "Whether to mandate design system usage across all product teams or keep it opt-in",
    priority: "Consistency and long-term velocity without blocking active roadmaps",
    feedback: `• Design director: "We have 4 teams shipping UI independently. The inconsistency is embarrassing. Customers notice. We need a mandate."
• Team A PM: "We're mid-sprint on a major feature. A hard cutover would cost us 2 weeks of rework right now. Bad timing."
• Team B eng: "We actually love the design system. Adoption on our team is 80%. The holdouts are teams that started before it existed."
• Team C PM: "The system doesn't have the components we need for our use case — data tables, complex filters. We'd be blocking ourselves."
• Design system team: "We have a 6-week backlog of component requests. We can't support a mandate without more resourcing."
• CTO: "Inconsistency is tech debt. Every quarter we delay the mandate, the migration gets harder. Just do it."
• UX research: "Users in sessions regularly comment on UI inconsistency across sections. It affects perceived quality."`,
  },
  {
    project: "AI feature launch",
    decision: "Whether to launch the AI summary feature to all users or run a limited beta first",
    priority: "Risk management and gathering quality signal before full rollout",
    feedback: `• PM: "The feature is technically ready. Every week we delay is a week competitors could launch something similar."
• Legal: "We haven't finished the AI disclosure review. Our terms don't currently cover AI-generated content shown to users. This is a blocker."
• Eng: "The model latency is 4–8 seconds per request. At scale that's a cost and UX problem we haven't solved. Beta would help us tune it."
• Design: "The UI handles the loading state fine but we have no error state for when the model returns garbage. That will happen."
• CEO: "The press opportunity around an AI launch is now, not in 6 weeks. I want to be in that narrative."
• Beta users (12 interviewed): "9 of 12 said the summaries were 'mostly useful' but all 12 flagged at least one factual error in their test session."
• Data: "Error rate in internal testing is 11%. We consider anything above 5% a quality risk for customer-facing features."`,
  },
  {
    project: "Remote work policy",
    decision: "Whether to enforce 3 days in-office per week or keep the current fully flexible policy",
    priority: "Team cohesion and talent retention in equal measure",
    feedback: `• CEO: "The energy in the office on the days people come in is great. I want that every day. We built this culture together and I feel it slipping."
• HR: "We ran an engagement survey last month. Flexibility ranked #1 in reasons people stay. Any rollback risks attrition, especially in engineering."
• Eng manager: "My team is fully remote across 3 time zones. An in-office mandate would mean losing 4 of 9 engineers who can't relocate."
• Team lead (London): "Collaboration has genuinely suffered. Async works for execution but we're slower on ambiguous, creative problems."
• Individual contributor (survey, n=180): "61% prefer current flexibility. 22% would actively look for a new job if 3-day mandate introduced."
• Finance: "Our office lease is up for renewal. If we commit to 3 days, we need a larger space — estimated £400k additional annual cost."
• New hire (joined 6 months ago): "I chose this job because of the remote policy. I moved out of London. A mandate changes the deal I signed up for."`,
  },
];

const MOCK_RESPONSE = `## Context

This synthesis covers cross-functional feedback on the onboarding redesign. Input spans product, design, engineering, research, customer success, and marketing — collected across sprint reviews and async threads. The decision is time-sensitive given a Q3 board presentation and competitive pressure.

## Main themes

**Onboarding has a confirmed, fixable problem**
Research data is unambiguous: 75% drop-off at step 3 (permissions screen). This is not subjective — it has a root cause and a ready fix. The debate is not whether to fix it, but when and how completely.

**There is no agreed definition of "ship"**
PM and CEO are treating this as a binary ship/delay decision. Engineering is offering a third path (stripped version). These are not being compared on equal terms, which is causing misalignment.

**Marketing has created external pressure that is now driving internal decisions**
The Q3 comms commitment is being cited as a reason to ship. This is a constraint the team created for themselves, not an external forcing function.

**Customer success data reinforces urgency but is being underweighted**
3–5 support tickets per day about onboarding is a quantified ongoing cost. It is not being factored into the delay calculus.

## Stakeholder conflicts

**Speed vs. quality (CEO / PM vs. Design / Research)**
CEO and PM want to ship now for competitive and board reasons. Design and research want validation before launch. Neither side has acknowledged the other's constraint.

**What "ship in Q3" actually means (PM vs. Engineering)**
PM assumes full revised flow. Engineering says that's impossible — backend needs 6 more weeks. A stripped version is on the table but has not been formally evaluated.

**Who owns the timeline (Marketing vs. Product)**
Marketing made an external commitment without engineering sign-off. This is a process failure that is now being treated as a product requirement.

## Risks and unknowns

- **Shipping without fixing step 3** will likely maintain current drop-off rates. The fix exists but is unbuilt.
- **The stripped version** has not been defined. What is in it? Does it move the needle on the research findings?
- **Competitive pressure** is asserted but not evidenced. What specifically are competitors shipping?
- **Backend timeline** — is the 6-week estimate firm, or is there a reduced scope that ships faster?

## Recommended next steps

1. **Define "stripped version" in 48 hours.** Engineering and PM should produce a written scope. Does it include the step 3 fix? That determines whether it's worth shipping.
2. **Resolve the backend constraint.** Can the permissions fix ship independently of the full backend work? If yes, this changes the calculus significantly.
3. **Decouple the board narrative from the product decision.** The CEO needs a Q3 story — but that story could be "we identified the problem and shipped a validated fix" rather than "we shipped everything."
4. **Do not ship without the step 3 fix.** Shipping a redesign that still loses 75% of users at the same point is worse than the status quo — it signals the redesign failed.

## Slack-ready summary

Onboarding redesign: we have a confirmed drop-off at step 3 (75%, research-validated) with a fix ready but unbuilt. Full revised flow cannot ship in Q3 — backend needs 6 more weeks. A stripped version is possible but undefined. Recommend: scope the stripped version in 48h, confirm whether the step 3 fix is included, and reframe the Q3 board story around a targeted, validated fix rather than a full redesign launch.

## Suggested questions for follow-up

- Can the step 3 permissions fix be built and shipped independently, without the full backend work?
- What is the exact scope of the "stripped version" Engineering is proposing?
- What specifically are competitors shipping that is driving the urgency — is this validated or perceived?
- Who approved the Q3 external comms commitment, and what is the cost of correcting it?
- What does Customer Success estimate as the support cost reduction if step 3 is fixed?`;

function runTestData() {
  const scenario = TEST_SCENARIOS[Math.floor(Math.random() * TEST_SCENARIOS.length)];
  const isSimple = document.getElementById("simple-toggle").checked;

  if (!isSimple) {
    document.getElementById("project-name").value = scenario.project;
    document.getElementById("decision").value = scenario.decision;
    document.getElementById("priority").value = scenario.priority;
  }

  textarea.value = scenario.feedback;
  fileChips.innerHTML = "";
  updateCharCount();
  mockSynthesise();
}

async function mockSynthesise() {
  synthesiseBtn.disabled = true;
  setStatus("running");
  showOutput();
  outputContent.innerHTML = '<span class="cursor"></span>';

  let rendered = "";
  const words = MOCK_RESPONSE.split(" ");

  for (const word of words) {
    await new Promise(r => setTimeout(r, 18));
    rendered += (rendered ? " " : "") + word;
    outputContent.innerHTML = marked.parse(rendered) + '<span class="cursor"></span>';
    const panel = document.querySelector(".panel-output");
    panel.scrollTop = panel.scrollHeight;
  }

  renderMarkdown(MOCK_RESPONSE);
  setStatus("done");
  synthesiseBtn.disabled = false;
}

// ── Feedback modal ──
function openFeedbackModal() {
  document.getElementById("feedback-modal").classList.add("open");
  document.getElementById("modal-feedback").focus();
}

function closeFeedbackModal() {
  const overlay = document.getElementById("feedback-modal");
  overlay.classList.remove("open");
  setTimeout(() => {
    document.getElementById("modal-body").innerHTML = `
      <div class="field">
        <label class="field-label">What kind of feedback?</label>
        <div class="feedback-types">
          <button class="type-chip active" onclick="selectType(this)">Bug</button>
          <button class="type-chip" onclick="selectType(this)">Suggestion</button>
          <button class="type-chip" onclick="selectType(this)">Praise</button>
          <button class="type-chip" onclick="selectType(this)">Other</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="modal-feedback">Your feedback</label>
        <textarea id="modal-feedback" placeholder="Tell us what's on your mind…"></textarea>
      </div>`;
    document.getElementById("modal-footer").style.display = "";
  }, 200);
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById("feedback-modal")) closeFeedbackModal();
}

function selectType(btn) {
  btn.closest(".feedback-types").querySelectorAll(".type-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
}

function submitFeedback() {
  const text = document.getElementById("modal-feedback").value.trim();
  if (!text) { document.getElementById("modal-feedback").focus(); return; }

  const type = document.querySelector(".type-chip.active")?.textContent ?? "Other";

  document.getElementById("modal-body").innerHTML = `
    <div class="modal-thanks">
      <span class="thanks-icon">🙏</span>
      <strong>Thanks for the feedback!</strong>
      <p>We read everything and use it to improve the tool.</p>
    </div>`;
  document.getElementById("modal-footer").style.display = "none";
  setTimeout(closeFeedbackModal, 2000);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeFeedbackModal();
});

function toggleSimpleMode(isSimple) {
  const templateFields = document.getElementById("template-fields");
  const panelTitle = document.getElementById("panel-title");
  const feedbackLabel = document.getElementById("feedback-label");

  if (isSimple) {
    templateFields.style.display = "none";
    panelTitle.textContent = "Raw Feedback";
    feedbackLabel.style.display = "none";
  } else {
    templateFields.style.display = "flex";
    panelTitle.textContent = "Feedback Template";
    feedbackLabel.style.display = "";
  }
  updateCharCount();
}

// ── Vibe Mode ──
let vibeCtx = null;
let vibeScheduler = null;
let vibeNextBeat = 0;
let vibeTick = 0;
const VIBE_BPM = 128;
const VIBE_STEP = 60 / VIBE_BPM / 4; // 16th note duration

function vibeKick(t) {
  const osc = vibeCtx.createOscillator();
  const env = vibeCtx.createGain();
  osc.connect(env); env.connect(vibeCtx.destination);
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.45);
  env.gain.setValueAtTime(1, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.start(t); osc.stop(t + 0.45);
}

function vibeHat(t, open = false) {
  const buf = vibeCtx.createBuffer(1, vibeCtx.sampleRate * 0.08, vibeCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = vibeCtx.createBufferSource();
  src.buffer = buf;
  const hp = vibeCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000;
  const env = vibeCtx.createGain();
  const dur = open ? 0.12 : 0.04;
  env.gain.setValueAtTime(open ? 0.25 : 0.18, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(hp); hp.connect(env); env.connect(vibeCtx.destination);
  src.start(t); src.stop(t + dur);
}

function vibeBass(t, freq) {
  const osc = vibeCtx.createOscillator();
  osc.type = 'sawtooth';
  const lp = vibeCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 400;
  const env = vibeCtx.createGain();
  osc.connect(lp); lp.connect(env); env.connect(vibeCtx.destination);
  osc.frequency.setValueAtTime(freq, t);
  env.gain.setValueAtTime(0.35, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.start(t); osc.stop(t + 0.25);
}

function vibePad(t, freqs) {
  freqs.forEach(freq => {
    const osc = vibeCtx.createOscillator();
    osc.type = 'sine';
    const env = vibeCtx.createGain();
    osc.connect(env); env.connect(vibeCtx.destination);
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.start(t); osc.stop(t + 0.95);
  });
}

const BASS_NOTES = [55, 0, 0, 55, 0, 0, 62, 0, 55, 0, 0, 55, 0, 0, 49, 0];
const PAD_CHORDS = [[220, 277, 330], null, null, null, [196, 247, 294], null, null, null];

function vibeSchedule() {
  while (vibeNextBeat < vibeCtx.currentTime + 0.12) {
    const step16 = vibeTick % 16;
    const step8  = vibeTick % 8;

    if (step16 % 4 === 0) vibeKick(vibeNextBeat);
    if (step16 % 2 === 0) vibeHat(vibeNextBeat, step16 % 4 === 2);
    if (BASS_NOTES[step16]) vibeBass(vibeNextBeat, BASS_NOTES[step16]);
    if (PAD_CHORDS[step8]) vibePad(vibeNextBeat, PAD_CHORDS[step8]);

    vibeNextBeat += VIBE_STEP;
    vibeTick++;
  }
}

function startVibeAudio() {
  vibeCtx = new (window.AudioContext || window.webkitAudioContext)();
  vibeCtx.resume().then(() => {
    vibeNextBeat = vibeCtx.currentTime + 0.1;
    vibeTick = 0;
    vibeScheduler = setInterval(vibeSchedule, 25);
  });
}

function stopVibeAudio() {
  clearInterval(vibeScheduler);
  vibeScheduler = null;
  if (vibeCtx) { vibeCtx.close(); vibeCtx = null; }
}

function toggleVibeMode(on) {
  document.body.classList.toggle('vibe-mode', on);
  document.getElementById('disco-overlay').classList.toggle('active', on);
  localStorage.setItem('vibeMode', on ? '1' : '0');
  if (on) startVibeAudio(); else stopVibeAudio();
}

// Restore vibe state on page load
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('vibeMode') === '1') {
    const toggle = document.getElementById('vibe-toggle');
    toggle.checked = true;
    toggleVibeMode(true);
  }
});

function clearAll() {
  document.getElementById("project-name").value = "";
  document.getElementById("decision").value = "";
  document.getElementById("priority").value = "";
  textarea.value = "";
  charCount.textContent = "0 chars";
  fileChips.innerHTML = "";
  document.getElementById("file-input").value = "";
  hideOutput();
  hideReportActions();
  outputContent.innerHTML = "";
  setStatus("idle");
}
