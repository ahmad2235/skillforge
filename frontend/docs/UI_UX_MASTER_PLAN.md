==============================
SECTION 1 — UX GOALS
==============================
- Clarity: surfaces the next best action per role with unambiguous labels and consistent layouts.
- Focus: minimize simultaneous choices; progressive disclosure for advanced options.
- Progress visibility: always-visible progress cues (roadmap %, task status, project milestones).
- Role-based experience: student, business, and admin each see tailored navigation, metrics, and defaults.
- Low cognitive load: predictable patterns, concise copy, visual hierarchy that privileges primary actions.

==============================
SECTION 2 — USER ROLES & PRIMARY JOURNEYS
==============================
Student
- Main objective: advance through learning roadmaps, pass placement, and get matched to projects.
- Primary pages: /student/dashboard, /student/roadmap, /student/blocks/:id, /student/tasks/:id, /student/placement, /student/projects.
- Critical actions: start/continue tasks, submit solutions, view AI feedback, book/complete placement, apply to projects.
- Success indicators: roadmap completion %, task scores, placement status, project application outcomes.

Business (Employer)
- Main objective: post projects, review candidates, and track assigned student progress.
- Primary pages: /business/projects, /business/projects/:id, /business/candidates/:projectId, /business/monitoring.
- Critical actions: create projects, review ranked candidates, accept/assign, monitor milestones, request re-evaluations.
- Success indicators: time-to-fill, candidate fit score, milestone on-track %, feedback loop closed.

Admin
- Main objective: oversee platform health, user activity, and quality signals.
- Primary pages: /admin/monitoring, /admin/users, /admin/roadmaps, /admin/projects, /admin/reports.
- Critical actions: manage users/roles, audit submissions, configure roadmaps, view platform metrics, resolve flags.
- Success indicators: low error rates, healthy throughput (submissions, placements), SLA adherence, balanced load.

==============================
SECTION 3 — PAGE INVENTORY (ROUTES)
==============================
Auth
- /login
- /register
- /forgot-password

Student
- /student/dashboard
- /student/roadmap
- /student/blocks/:id
- /student/tasks/:id
- /student/placement
- /student/projects
- /student/projects/:id
- /student/profile

Business
- /business/dashboard
- /business/projects
- /business/projects/new
- /business/projects/:id
- /business/candidates/:projectId
- /business/monitoring
- /business/profile

Admin
- /admin/dashboard
- /admin/users
- /admin/users/:id
- /admin/roadmaps
- /admin/projects
- /admin/reports
- /admin/monitoring

==============================
SECTION 4 — DESIGN SYSTEM (FOUNDATION)
==============================
- Typography: base 16px; scale — h1 32/40 semi-bold, h2 24/32 semi-bold, h3 20/28 medium, body 16/24 regular, small 14/20 regular.
- Color system: primary (indigo/600), secondary (slate/600), success (emerald/600), warning (amber/600), error (rose/600), neutrals (slate 50-900). Use Tailwind tokens and shadcn/ui theming.
- Spacing/layout: 4px grid; core spacers 4/8/12/16/24/32/48/64; max content width 1200px where centered; section gutters 24-32px.
- Radius/shadows: radii 4/8/12; shadows subtle for cards, stronger for modals/drawers.
- Mode: light-first; ensure contrast AA; prepare tokens for dark mode toggle later.

==============================
SECTION 5 — CORE UI COMPONENTS
==============================
- Buttons: primary, secondary, ghost, destructive, link; sizes sm/md/lg; loading and icon-leading states (shadcn/ui button base).
- Inputs/forms: text, textarea, select, combobox, date/time, switches, segmented controls; with labels, help, error text; use shadcn/ui form primitives.
- Cards: default, with header/actions, metric/stat tiles.
- Tables: sortable headers, pagination, empty and loading states; compact density option.
- Badges/status: solid/outline; statuses mapped to success/warning/error/info/neutral.
- Modals/drawers: confirm, detail view; focus trap; keyboard close.
- Toasts: success/error/info; time-limited with manual dismiss.
- Skeletons: line, avatar, card skeletons for perceived performance.
- Empty states: role-aware copy, primary action, and secondary help link.

==============================
SECTION 6 — APPLICATION LAYOUT
==============================
- App shell: persistent sidebar and topbar; main content scrolls independently.
- Sidebar: role-based nav groups; collapsible on mobile; highlight active route; include quick actions.
- Topbar: search placeholder, notification placeholder, profile menu (role, settings, logout), light/dark toggle reserved space.
- Main area: page title + actions row, breadcrumbs where nested; standard content max width with optional full-width mode for tables.
- Responsive: sidebar collapses to icon rail then drawer; topbar condenses; tables become cards or enable horizontal scroll.

==============================
SECTION 7 — STEP-BY-STEP UI IMPLEMENTATION PLAN
==============================
Step 1: UI Kit page (/ui-kit)
- Goal: ship a single page showcasing tokens and components from shadcn/ui + Tailwind.
- Pages affected: /ui-kit.
- UX focus: consistency, documented variants, accessibility defaults.

Step 2: AppLayout + Sidebar
- Goal: establish global shell with role-aware navigation and responsive behavior.
- Pages affected: layout wrapper, sidebar/topbar components.
- UX focus: clarity of navigation, quick context switching, mobile drawer parity.

Step 3: Student Dashboard
- Goal: surface roadmap progress, next task, placement status, and project invites.
- Pages affected: /student/dashboard.
- UX focus: prioritization, progress visibility, actionable cards.

Step 4: Roadmap & Tasks
- Goal: readable roadmap tree, block pages, task detail with submissions and AI feedback.
- Pages affected: /student/roadmap, /student/blocks/:id, /student/tasks/:id.
- UX focus: flow continuity, submission clarity, feedback readability.

Step 5: Placement flow UI
- Goal: guide through placement setup, attempt, and results review.
- Pages affected: /student/placement.
- UX focus: step clarity, timing/status indicators, outcome guidance.

Step 6: Projects & Milestones UI
- Goal: present project list/detail with milestone tracking for students and businesses.
- Pages affected: /student/projects, /student/projects/:id, /business/projects, /business/projects/:id.
- UX focus: milestone status, deliverable clarity, communication entry points.

Step 7: Admin dashboards
- Goal: operational views for platform health, users, and content oversight.
- Pages affected: /admin/dashboard, /admin/users, /admin/monitoring.
- UX focus: signal-to-noise, filters, alerting of anomalies.

Step 8: Business dashboards
- Goal: hiring pipeline visibility and candidate evaluation interfaces.
- Pages affected: /business/dashboard, /business/candidates/:projectId, /business/monitoring.
- UX focus: ranking clarity, comparison ease, decision logging.

==============================
SECTION 8 — UX QUALITY CHECKLIST
==============================
- Loading state present and non-blocking.
- Empty state with guidance and primary action.
- Error state with recovery path and retry.
- Success feedback with confirmation and follow-up action.
- Accessibility: labels, focus order, keyboard paths, contrast AA.
- Responsive behavior validated for mobile, tablet, desktop.

==============================
SECTION 9 — RULES & CONSTRAINTS
==============================
- No mixed UI libraries; shadcn/ui as the base with Tailwind tokens.
- No inline styling; use Tailwind classes and component props.
- No business logic inside UI components; keep them presentational.
- Components must be reusable and role-aware via props, not duplication.
- Backend API contracts stay unchanged; adapt UI to existing responses.
