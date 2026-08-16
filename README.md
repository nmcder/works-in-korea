# Works in Korea?

**[worksinkorea.com](https://worksinkorea.com)**

Checks 106 Korean online services every day from outside Korea and publishes what it finds:
whether the site opens, what languages it offers, and whether signing up requires a Korean
phone number. Every value carries the time it was taken and how.

한국 온라인 서비스 106개를 매일 한국 밖에서 확인해 공개합니다. 접속 여부, 제공 언어,
가입 시 한국 휴대폰 필요 여부. 모든 값에 측정 시각과 방법이 붙습니다.

Code is MIT. Data is [CC BY 4.0](LICENSE-DATA).

---

## Repository layout

```
src/probes/       6 automated checks
src/lib/          robots.txt, rate limiting, browser, signal helpers
data/seeds/       the service list (the only file you edit by hand)
data/services/    results, committed daily by the bot
data/signatures/  detection patterns for identity verification and payment providers
schema/           the data contract; CI rejects anything that breaks it
site/             the public site (Next.js, prerendered + one API route)
.github/workflows daily-probe (cron), validate (PR checks), report-poll (community reports)
```

## Commands

| | |
|---|---|
| `npm run probe` | run one measurement pass (~8 min for all 106) |
| `npm run validate` | check data against the schema |
| `npm run seed` | sync `data/seeds` into `data/services` after editing the list |
| `npm run hints` | regenerate [docs/05-hints-todo.md](docs/05-hints-todo.md) |
| `npm run find-hints` | look for missing sign-up URLs, help pages and app IDs |
| `npm run ingest -- --reapply` | re-aggregate stored community reports |
| `cd site && npm run icons` | download app icons for any service that does not have one yet |

Partial runs: `npm run probe -- --only=coupang,toss` or `--limit=5 --dry-run`.

Site: `cd site && npm install && npm run dev`.

Run `npm run icons` after adding a service or fixing an app ID; it skips anything
already downloaded (`--force` to refetch everything). Icons are committed, so the
build never touches the network. A service that fails there usually has a wrong app
ID rather than no icon — that is how two false `app_availability` values were found
(see [D-23](docs/03-decisions.md)).

## Adding or fixing a service

Edit [`data/seeds/services.seed.json`](data/seeds/services.seed.json), run `npm run seed`, commit.

`npm run find-hints` fills most of this in for you. It never guesses: a sign-up URL is
only written after the page has been opened and found to contain a real form, and an app ID
only when the service links to the store itself or the bundle ID matches exactly. Anything
weaker lands in [docs/06-hint-candidates.md](docs/06-hint-candidates.md) for a human to pick.
Add `--apply` to write the confirmed ones into the seed.

It cannot search the App Store by name — Apple's robots.txt disallows `/search*` while
allowing `/lookup?`, and this project obeys robots.txt. Services that also block our crawler
therefore need their app IDs entered by hand.

`hints` improve accuracy and are optional:

| hint | what it unlocks |
|---|---|
| `signup_url` | identity-verification detection (highest impact) |
| `support_url` | English support detection |
| `ios_app_id` / `android_package` | app store listings |
| `checkout_url` | payment provider detection on public pages |

Leave a hint blank if you are unsure. A blank stays honest; a wrong URL publishes a wrong fact.

---

## Crawling rules, enforced in code

[CLAUDE.md](CLAUDE.md) rule 4, implemented rather than promised. Do not add bypasses.

- **robots.txt is checked before every request.** Disallowed means no request at all
  ([`src/lib/robots.ts`](src/lib/robots.ts)).
- **One pass per day**, minimum 2s between requests to the same host
  ([`src/lib/limiter.ts`](src/lib/limiter.ts)).
- **The User-Agent carries the site URL and a contact address** ([`src/config.ts`](src/config.ts)),
  so any operator who sees us can find out who we are and ask us to stop.
- **No payment is ever submitted.** Only public page source is read.
- **No account creation, no login.** The browser wrapper exposes no way to type or click
  ([`src/lib/browser.ts`](src/lib/browser.ts)).

Two documented exceptions live in `src/config.ts` (`ROBOTS_EXEMPT_PREFIXES`,
`HOST_DELAY_OVERRIDES`) and are published on the site's `/method` page.

## Signal coverage (2026-08-15, 106 services)

| signal | measured | limiting factor |
|---|---|---|
| `overseas_access` | 75 | 31 sites refuse automated checks |
| `i18n_ui` | 75 | same |
| `payment_gate` | 75 | checkout usually sits behind a login, so 11 detect a provider |
| `app_availability` | 20 | app IDs missing from the seed list |
| `signup_phone_auth` | 23 | sign-up URLs missing from the seed list |
| `support_en` | 1 | `ANTHROPIC_API_KEY` not set |
| `foreign_card` | 0 | community reports only, by design |
| `foreign_phone_sms` | 0 | community reports only, by design |

Run `npm run hints` for the prioritised list of what to fill in.

---

## GitHub Actions setup

Settings → Secrets and variables → Actions:

| type | name | purpose |
|---|---|---|
| Variable | `REPORTS_REPO` | public reports repo, e.g. `nmcder/works-in-korea-reports` |
| Secret | `ANTHROPIC_API_KEY` | enables `support_en` classification (optional) |
| Secret | `REPORTS_TOKEN` | lets the site open issues for reporters — set it in **Vercel** too |
| Variable | `WIK_PROJECT_URL` / `WIK_CONTACT` | override the User-Agent defaults. **Leave unset unless you mean it** |

Usage: one pass is ~8 minutes, about 250 minutes a month, 12% of the free tier.

An unset Actions variable arrives as an **empty string**, not undefined, so `??` will not fall
back to the default. `src/config.ts` treats empty as unset and refuses to start if the resulting
User-Agent has no URL or no contact address — a crawler without identification is the one thing
this project promises never to be.

### LLM cost control

Support pages rarely change, so a page whose content hash matches the previous run is not sent
to the model again; the earlier verdict is kept and `measured_at` still updates. Digits are
stripped before hashing so daily counters do not trigger re-classification.

With `claude-sonnet-5`: about ₩3,000 for the first full pass, then roughly ₩10,000/month.
Without the cache it would exceed ₩150,000/month. Force a full re-run with `WIK_LLM_FORCE=1`.

---

## Community reports

Two signals cannot be automated, and 40 services refuse automated checks, so those come from
people who tried. The form lives on the site so nobody needs a GitHub account; the issues it
opens live in a separate public repo.

```
form on the site      no GitHub account, no email address
  → /api/report       screens for personal data, then opens the issue for them
  → report-poll       daily, after the measurement cron
  → npm run ingest    screens again, structures, aggregates
  → pull request      a human approves before anything ships
```

Personal data is blocked three ways: the form has no field for it, free text is pattern-checked
before the report leaves the page and again before anything is written to disk, and blank issues
are disabled. Conflicting
reports are recorded as `conflicting` rather than resolved, because a foreign card genuinely can
work with one issuer and fail with another.

## Deployment

The Vercel project's **Root Directory must be `site`**. Everything else is zero-config.
The report endpoint (`/api/report`) is a serverless function, so Vercel has to see the Next
app root; the old root-level `vercel.json` workaround cannot do that.

Pages are still prerendered at build time and served from the CDN. A function runs once per
submitted report, and the public JSON API stays a folder of static files.

The daily cron commits to `data/`, which triggers a Vercel rebuild. No manual step.

**Never enable "skip deployments when there are no changes to the root directory".** The cron
only ever touches `data/`, which sits outside `site/`, so Vercel would decide nothing changed
and skip the deploy. The cron would keep going green every night while the site quietly froze
on yesterday — and freshness is the whole product. `site/vercel.json` pins `ignoreCommand` to
`exit 1` (0 skips, 1 builds) so this holds even if someone flips the dashboard setting.

## Site conventions

Read [D-12 and D-15](docs/03-decisions.md) before changing the UI.

- **Two languages ship in the HTML; CSS shows one.** Default English, Korean on click.
  Use `<T en="..." ko="..." />` for strings, `<Only lang="en">` for long prose.
- **Korean text needs `word-break: keep-all`**, or 신분증 splits across lines.
- **Unmeasured values are dashed and grey, with the reason next to them.** Never a blank cell.
- **Colour marks whether a barrier was observed, not whether a service is good.** Never colour alone.

## Documentation

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | project rules and current state |
| [docs/01-market-research.md](docs/01-market-research.md) | why this problem, with sources |
| [docs/02-product-spec.md](docs/02-product-spec.md) | data model and probe specifications |
| [docs/03-decisions.md](docs/03-decisions.md) | decision log, D-1 to D-21 |
| [docs/04-roadmap.md](docs/04-roadmap.md) | 4-week plan and division of work |
