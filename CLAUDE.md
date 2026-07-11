# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Django app where authenticated users build personal "start pages" — a page contains
ordered **Sections**, each holding up to 10 ordered **Links**. Users edit their page
inline (drag-drop reorder, long-press to open edit modals) and pick a global color theme.
Google OAuth login via allauth. Dockerised with Postgres + Redis + nginx + Tailwind.

## Commands

Development runs Django on the host (SQLite + in-memory cache), and needs the Tailwind
watcher running in a **separate terminal** because CSS is compiled from
`theme/static_src/src/styles.css`:

```
# Terminal 1 — Tailwind watcher (rebuilds theme/static on change)
python manage.py tailwind install   # first time only
python manage.py tailwind start

# Terminal 2 — dev server
python manage.py runserver
```

- Migrate: `python manage.py migrate`
- Single test: `python manage.py test startpages.tests.ClassName.test_method` (note:
  `startpages/tests.py` is currently an empty stub)
- Build CSS once (no watcher): `python manage.py tailwind build`
- Trigger the daily summary email manually: `python manage.py send_daily_mail`
- On Windows, npm is hardcoded at `C:\Program Files\nodejs\npm.cmd` (`custom.py`); the
  Tailwind commands fail if npm isn't there.

Docker (Postgres + Redis + nginx, served on `NGINX_PORT`):
```
docker compose build && docker compose up -d          # dev
docker compose -f docker-compose.yml build --no-cache && docker compose -f docker-compose.yml up -d   # prod
```
`entrypoint.sh` auto-runs `migrate`, `tailwind build`, and `collectstatic` on container
start — you do not run those manually against the container.

## Environment detection

`RUNNING_IN_DOCKER` (env var) is the master switch that flips the whole runtime, set in
`docker-compose.yml`:
- **In Docker** → Postgres, Redis cache, WhiteNoise off (nginx serves static),
  `SECURE_PROXY_SSL_HEADER` trusted. `SSL_TLS=True` additionally forces HTTPS redirect + secure cookies.
- **Not in Docker** (host dev) → SQLite (`db.sqlite3`), LocMem cache, `django_browser_reload` + WhiteNoise-nostatic enabled via `DEBUG`.

Copy `.env.example` → `.env` before anything. Settings read env vars with fallbacks, so a
missing `.env` silently uses insecure dev defaults (including a baked-in `SECRET_KEY`).

## Architecture

**Settings** are split across `project/settings/*.py` and re-exported by
`project/settings/__init__.py` (`base`, `db`, `security`, `static_media`, `custom`, `email`).
Edit the specific module, not a monolith. `custom.py` builds `INSTALLED_APPS`/`MIDDLEWARE`
and conditionally inserts dev-only apps when `DEBUG`.

**Two request surfaces in the `startpages` app:**
- `views.py` — full-page, form-POST, redirect-with-`messages` flows (profile, page CRUD,
  import/export, social connections).
- `api.py` — JSON endpoints under `/api/` consumed by the frontend JS for inline editing
  (reorder sections/links, add/edit/delete, theme switch). These read `json.loads(request.body)`
  and return `JsonResponse`.

**URL ordering matters** (`startpages/urls.py`): the catch-all `<str:username>/` and
`<str:username>/<slug:slug>/` routes are declared **last**, after all `profile/` and `api/`
paths, so specific routes win. Add new fixed paths *above* these.

**Ownership scoping is the security model.** Every API/view query filters by the current
user (`page__user=request.user`, `section__page__user=request.user`, etc.) rather than
trusting IDs from the client. Preserve this pattern on any new endpoint — never look up a
Section/Link by bare `id`.

**Business rules enforced in code, not the schema:**
- Max **10 links per section** — checked in `api.add_link` and `api.update_link_order`.
- Exactly one default StartPage per user — `StartPage.save()` unsets other defaults when
  `is_default=True`; `delete_startpage` promotes another page when the default is deleted.
- `StartPage.slug` is auto-derived from `title` via `slugify` in `save()` (not user-editable).

**Import/export** lives in `services.py` (`StartPageService`) as JSON — the on-disk format
(title → sections → links with `order`/`color`) is the contract; keep export/import symmetric.

## Theming system

Themes are `ColorScheme` rows (child of the singleton `GlobalSettings`) whose `css_variables`
JSONField maps Tailwind CSS custom properties (e.g. `--color-primary-500`) to **oklch** values.
A user's `Profile.theme` FK selects one; the frontend applies the variables client-side.
`ColorScheme.preview_colors` uses `coloraide` to convert oklch → hex for admin/UI swatches.

- `theme/color_schemes/*.json` are **reference palettes** (Cyan/Green/Indigo… × light/dark).
  They are *not* auto-loaded — ColorSchemes are created in the Django admin (inline under
  GlobalSettings); paste JSON contents into `css_variables`.
- The base Tailwind palette (compiled default) lives in `theme/static_src/src/styles.css`
  under `@theme`. Per-user themes override these variables at runtime.

## Singletons, signals, side effects

- **`GlobalSettings`** is a forced singleton (`pk=1`, deletion blocked) cached under the
  `global_settings` cache key. Read it via `GlobalSettings.load()`, never `.objects.get()`.
  It gates NTFY notifications and the daily mail.
- **User `post_save` signals** (`models.py`): auto-create a `Profile`, and fire an **NTFY
  push** on new registration. `project/ntfy.py` POSTs to a self-hosted ntfy server
  (`NTFY_BASE_URL`/`NTFY_TOPIC` env vars); it fails silently if unconfigured or disabled.
- **Daily email** (`management/commands/send_daily_mail.py`) summarizes yesterday's
  registrations. In Docker a dedicated `cron` service (`cron.sh`) schedules it at
  `DAILY_MAIL_TIME` (HH:MM); on the host you run the command manually.

## Frontend

Vanilla ES modules under `static/js/` (no build step, no framework):
`startpage_app.js` is the entry point for the editable start page; `modules/api.js`,
`modules/ui.js`, `modules/drag-drop.js` handle the fetch calls, DOM, and reordering.
Interaction model: long-press / click enters edit mode and opens modals that call the JSON
`/api/` endpoints. `profile.js` drives the profile/theme-picker page.

Templates live in top-level `templates/` (project-wide `DIRS`), organized as
`account/` + `socialaccount/` (allauth overrides), `startpages/pages/`,
`startpages/email/`, and shared `components/` / `modules/`.
