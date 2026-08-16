# Works in Korea?

**Does this Korean website actually work if you don't have a Korean phone number, a Korean
card, or a Korean address?** Nobody publishes that answer with a date on it. So this measures
106 Korean online services every day, from outside Korea, and publishes what it finds.

**→ [worksinkorea.com](https://worksinkorea.com)** · [public JSON API](https://www.worksinkorea.com/api-docs/) · data is [CC BY 4.0](LICENSE-DATA), code is MIT

![Works in Korea?](https://www.worksinkorea.com/og/site.png)

## What came out of it that I did not expect

**1. Obeying robots.txt costs 34% of the dataset — and that is itself the finding.**

The crawler reads robots.txt before every request and does not fetch a disallowed path.
The result is that **36 of 106 services can never be measured this way**, including Coupang,
Baemin, 11st, Melon, CGV and Musinsa.

| why | services |
|---|---|
| robots.txt disallows it | 18 |
| the server refuses the crawler (403/429) | 8 |
| robots.txt itself could not be read from abroad | 10 |

Those 36 are published as a list with the reason, not hidden as gaps. They are also exactly
the services where a first-hand report from a real person is the *only* possible source, which
is why the site has a report form at all.

**2. "Can you open it from abroad" is not a property of a website.**

Nine government and bank sites opened normally from Washington and did not answer at all from
Illinois, on the same day, from the same runner image. Storing one value per service and calling
it the answer was a modelling error, not noise. Results are now recorded per vantage point and
the site shows the split when the answers disagree.

**3. Saying "I don't know" needs a reason, or it reads as neglect.**

Every empty value carries why it is empty — robots.txt, a refused request, an unreachable host,
a certificate that would not verify, or a sign-up page that renders in JavaScript. An unexplained
blank and a deliberate blank look identical, and only one of them is honest.

## How it works

```
GitHub Actions (runners are outside Korea — that is the point, not a bug)
  └─ 6 probes over 106 services, robots.txt checked before every request
       └─ results committed to git as JSON
            └─ "what changed and when" accumulates in the history for free
                 └─ Next.js prerenders the site + a static JSON API
```

No servers, no database, no accounts, no advertising. One serverless function, which exists
only so that reporting something does not require a GitHub account.

Every value carries three things: **when it was measured, how, and how much to trust it**
(machine / checked by hand / reported by a person). Values that cannot be measured by machine —
whether a foreign card clears, whether an SMS code arrives — are never guessed and never
automated, because that would mean putting a real card through a real checkout.

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
| `npm run manual-queue` | write a paste-ready prompt covering everything only a human can check → `docs/queue/all.md` |
| `npm run byhand` | write a fill-in worksheet of what is left for a person → `docs/09-byhand.md` |
| `npm run ingest-manual -- --file=<answers.json\|worksheet.md>` | record hand-checked values (rejects anything without evidence) |

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

## Signal coverage (2026-08-16, 106 services)

| signal | measured | limiting factor |
|---|---|---|
| `app_availability` | 104 | — |
| `overseas_access` | 70 | 36 sites refuse automated checks; **only a foreign vantage point can answer this**, so a human cannot fill it in |
| `i18n_ui` | 70 | same, but a human *can* fill it in |
| `payment_gate` | 68 | checkout usually sits behind a login |
| `support_en` | 19 | help-centre URL unknown for 43 services |
| `signup_phone_auth` | 16 | sign-up forms render in JavaScript or the site blocks us. `find-hints` found **zero** usable URLs |
| `foreign_card` | 1 | community reports only, by design |
| `foreign_phone_sms` | 0 | community reports only, by design |

The three gaps split by who can close them, and the split is strict:

| | who | how |
|---|---|---|
| `overseas_access` | the cron | needs a non-Korean vantage point |
| `i18n_ui` · `signup_phone_auth` · `support_en` | a person | `npm run manual-queue`, then [docs/08-manual-prompt.md](docs/08-manual-prompt.md) |
| `foreign_card` · `foreign_phone_sms` | a reporter | needs a real foreign card or number |

Hand-checked values are stored as `method: manual`, `confidence: manual` and shown as
"checked by hand" with the date. They are **not** re-verified daily, so the date is the
shelf life — that is why they are labelled differently rather than mixed in with the
automated ones.

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
