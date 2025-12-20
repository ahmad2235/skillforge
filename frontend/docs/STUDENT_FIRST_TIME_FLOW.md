==============================
SECTION 1 — ENTRY POINT (After Signup)
==============================
- Landing: redirected to /placement-intro (auto-logged in) with intent=placement preserved.
- Visible: concise welcome, single primary CTA to begin placement, brief reassurance blurb, progress indicator placeholder (0%).
- Hidden: full dashboard, sidebar navigation, project listings—kept back to avoid decision overload.
- No dashboard yet: user has no calibrated level; showing dashboards would create false certainty and choice paralysis.
- Psychological goal: reduce ambiguity, make the next step obvious, convey safety (“we’re just figuring out your starting point”).

==============================
SECTION 2 — PLACEMENT INTRO SCREEN
==============================
- Purpose: set expectations for the short placement and why it matters (to tailor a roadmap, not to judge).
- Key message: “We’ll map your starting level in ~20 minutes so your tasks fit you. This is not a pass/fail test.”
- Primary CTA: “Start Your Placement”.
- Reassurance microcopy: “You can skip anything. Your progress saves automatically.”
- Options: start now (primary), do it later (link back to a minimal home with reminder), exit/log out (secondary link in footer).

==============================
SECTION 3 — PLACEMENT IN-PROGRESS EXPERIENCE
==============================
- Progress: top stepper or percent bar showing sections and estimated remaining time; autosave badge.
- Presentation: one task at a time, clear instructions, sample input/output where relevant, minimal chrome.
- Uncertainty/skip: explicit “Skip for now” button that records “unknown” and moves on; no penalty copy (“Skipping helps us place you accurately.”).
- Stress reduction: calming language, no red error states for wrong attempts, gentle hints available, time guidance but no countdown timer; allow pausing and resuming.

==============================
SECTION 4 — PLACEMENT RESULT SCREEN
==============================
- Presentation: clear level label (e.g., Beginner, Intermediate), domain emphasis (frontend/backend), confidence note (“Confidence: Medium — based on 6 responses”).
- Language: avoids pass/fail; frames as “Starting point identified” and “We’ll adjust as you complete tasks.”
- Success definition here: user sees a tailored starting level and understands next step (assigned roadmap + first task).
- Primary CTA: “View Your Roadmap”. Secondary: “Retake later” (non-blocking).

==============================
SECTION 5 — AUTO-GENERATED ROADMAP
==============================
- Introduction: short explainer banner—“Here’s your personalized path; it updates as you work.”
- Blocks shown: 3–5 immediate blocks unlocked; later blocks visible but dimmed to signal future progression.
- Locked vs assigned: assigned blocks are active with “Start” buttons; locked blocks show the requirement (“Unlocks after Block 2”) with muted styling.
- Progress framing: display small completion chip (e.g., “0/12 tasks done”); emphasize “one step at a time” to prevent overwhelm.

==============================
SECTION 6 — FIRST TASK EXPERIENCE
==============================
- Selection: system auto-selects the first task from the first unlocked block (no manual choice needed).
- Shown: task title, short objective, expected output/example, estimated time, and how it’s evaluated; hidden: long lists of future tasks.
- Confidence cues: “You can’t fail here; we’re calibrating with each attempt.” Include a clear save/submit action and a preview of AI/mentor feedback style.
- CTA: “Start Task” as the sole primary action; secondary “View block overview” link for context.

==============================
SECTION 7 — EMPTY, ERROR & RECOVERY STATES
==============================
- Abandoned placement: when returning, prompt “Pick up where you left off” with resume button; keep partial progress intact.
- Technical failure during placement: apologize, auto-save answers, provide “Retry” and “Contact support” options; reassure no progress lost.
- Roadmap empty/delayed: show holding message “We’re generating your roadmap (takes under a minute). We’ll notify when ready.” Offer refresh and support link.
- Trust maintenance: transparent timestamps (“Last saved 2 min ago”), status badges, and no blame language.

==============================
SECTION 8 — SUCCESS DEFINITION
==============================
- Success for first session: user completes placement OR starts and submits their first assigned task (whichever happens first) and understands their next step.
- Desired emotion: relieved clarity—“I know where I stand and exactly what to do next.”
