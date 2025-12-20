==============================
SCREEN 1 — Placement Intro
==============================
- Screen purpose: orient the new student, set expectation for a short placement, and move them to start.
- Layout (top to bottom):
  - Header: minimal logo + text breadcrumb “Placement intro”; no nav links.
  - Content area: left-aligned message block with headline, short explainer, and bullet reassurance; right side optional illustration placeholder or empty space on mobile it stacks.
  - CTA placement: primary button centered beneath message; secondary “Do it later” as plain text link below.
  - Reassurance placement: small text under CTA (“You can skip any question; progress saves automatically.”).
  - Hidden: sidebar, global dashboard nav, notifications; search omitted to reduce choice.
- Primary CTA: Start Your Placement.
- Secondary actions: Do it later (returns to minimal home with reminder), Logout link in footer.
- Critical UX notes: plain language, no timers shown here; stress reduction via “not a test” copy; single focal action.

==============================
SCREEN 2 — Placement In Progress
==============================
- Screen purpose: guide through placement tasks with clarity and low pressure.
- Layout (top to bottom):
  - Progress indicator: top bar with percent/stepper and estimated remaining time; autosave badge near it.
  - Task/question area: center column with task title, concise instructions, sample input/output; expandable hints.
  - Controls: bottom row within viewport—Primary “Next” (or “Submit & Next”), Secondary “Skip for now”; Back/Exit minimized to text link.
  - Autosave indicator: subtle inline badge near task header (“Saved just now”).
- Primary CTA: Next (or Submit & Next when needed).
- Secondary actions: Skip for now, Save & exit link (returns to resume state), Back.
- Critical UX notes: single task per view, no countdown timer; friendly microcopy on skip; avoid red error states—use neutral guidance.

==============================
SCREEN 3 — Placement Results
==============================
- Screen purpose: show starting level without pass/fail framing and direct to roadmap.
- Layout (top to bottom):
  - Result summary: headline with level (e.g., “Your starting point: Intermediate”) and domain badge.
  - Confidence framing: small note under summary (“Confidence: Medium — based on 6 responses”).
  - Next-step explanation: short paragraph explaining roadmap generation and that levels adjust over time.
  - CTA area: primary button prominent; secondary “Retake later” as text link.
- Primary CTA: View Your Roadmap.
- Secondary actions: Retake later (non-blocking), Contact support link in footer.
- Critical UX notes: avoid “pass/fail”; reinforce adjustability; keep celebratory but calm tone.

==============================
SCREEN 4 — Roadmap (First View)
==============================
- Screen purpose: present personalized blocks and guide to the first task without overwhelm.
- Layout (top to bottom):
  - Banner: short explainer “Your personalized roadmap; updates as you work.”
  - Roadmap overview: compact summary chip (e.g., “0/12 tasks”) and domain/level tag.
  - Blocks list: vertical cards; top 3–5 are unlocked with “Start” buttons; future blocks dimmed.
  - Assigned vs locked: assigned blocks show active CTA; locked blocks show requirement text (“Unlocks after Block 2”) with muted styling.
  - CTA to continue: at end of first unlocked block card—primary “Start Task 1”.
- Primary CTA: Start Task 1 (from the first unlocked block).
- Secondary actions: View block overview; Expand future blocks (peek only).
- Critical UX notes: progressive disclosure; minimize metrics; reassure “one step at a time.”

==============================
SCREEN 5 — First Task
==============================
- Screen purpose: let the student begin the first meaningful action with confidence.
- Layout (top to bottom):
  - Task header: title, block reference, estimated time.
  - Objective and context: short paragraph; expected output/example; evaluation note.
  - Input/answer area: code/editor area or text box with submit action inline; hints collapsible.
  - Submission CTA: primary “Submit” or “Save & Submit”; secondary “Save draft” (if supported) as text.
  - Feedback expectation cues: line under CTA (“You’ll see feedback in seconds; you can retry.”).
- Primary CTA: Submit (or Save & Submit).
- Secondary actions: Save draft (if available), Back to block overview.
- Critical UX notes: keep surrounding chrome minimal; remind “You can’t fail here; this calibrates your path.”

==============================
GLOBAL NOTES
==============================
- Navigation rules: sidebar and full nav remain hidden until after placement results; appears on roadmap and task screens in compact form.
- Consistent UI patterns: single primary CTA per screen, text-link secondary actions, breadcrumbs minimal; autosave badge reused across placement and tasks.
- Accessibility: focus states obvious; keyboard navigation for controls; aria labels on buttons, progress indicators, and skip actions; readable contrast.
- Mobile: stacked layout, sticky CTA bar at bottom for primary/secondary actions; progress bar stays visible; collapsible sections for hints and context.
