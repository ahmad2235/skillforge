<p align="center"><strong>SkillForge Backend</strong></p>

### Quick start
- Copy env: `cp .env.example .env` then set DB creds.
- Install: `composer install` and `npm install` (optional for assets).
- Generate key: `php artisan key:generate`.
- Migrate & seed: `php artisan migrate --seed`.

### Tests (MySQL-backed)
- Create database `skillforge_test`.
- Ensure `.env.testing` or your environment has test creds (defaults in phpunit.xml: mysql on 127.0.0.1, db `skillforge_test`, user `root`, empty password).
- Run: `php artisan test` (or `composer test`).

### API Docs (Scribe)
- Generate: `php artisan scribe:generate` (or `composer docs`).
- Output lives in `public/docs`; open `public/docs/index.html`.

### Notifications (feature-flagged)
- Flags in `config/skillforge.php` under `notifications`.
- Default is off. Turn on per-event flags to send mail stubs (placement results, task evaluation complete, project assignment invitation).

### Soft deletes
- Enabled for projects, tasks, roadmap blocks, and portfolios (deleted_at added). Business delete now soft-deletes.

### Modules (high level)
- Identity (auth), Learning (roadmaps/tasks), Assessment (placement), Projects (business + milestones), Gamification (portfolio), AI (logging hooks).
