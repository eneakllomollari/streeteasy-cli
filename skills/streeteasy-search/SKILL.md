---
name: streeteasy-search
description: Search StreetEasy rental listings in NYC via the local `streeteasy` CLI and score results against the user's saved apartment criteria. Use when the user mentions apartment hunting, StreetEasy, rental search, or finding apartments.
---

# StreetEasy Apartment Search

A Claude Code skill that drives [`streeteasy-cli`](https://github.com/eneakllomollari/streeteasy-cli). Copy the directory into `.claude/skills/streeteasy-search/` (or wherever your Claude Code installation reads skills from). Personal search criteria live in `criteria.md` next to this file — it is gitignored and created on first run.

## Step 0: Load criteria and feedback

1. Read `criteria.md` next to this SKILL.md. It is the source of truth for budget, neighborhoods, must-haves, rubric weights, and commute destinations.
2. If `criteria.md` is missing (first run), interview the user with `AskUserQuestion` and write their answers to `criteria.md` in the format below **before** searching. Cover:
   - Max monthly budget (and whether value matters more than cheapness)
   - Bedrooms and baths (flex/office acceptable?)
   - Must-haves vs strong preferences vs nice-to-haves vs don't-cares
   - Neighborhoods in priority order (map each to a CLI `--area` token)
   - Pets
   - Commute destinations and acceptable times
   - Subway lines that matter and max walking distance to them
3. Read `feedback.log` next to this SKILL.md. If it doesn't exist, that's fine — append to it as you go (Step last). It accumulates corrections, dealbreakers, and presentation rules across sessions.

If the user later corrects a criterion mid-session, update `criteria.md` immediately.

## criteria.md format

    # Apartment criteria

    - **Budget:** max $X,XXX/mo
    - **Bedrooms:** N
    - **Baths:** N
    - **Must have:** ...
    - **Strong preference:** ...
    - **Nice to have:** ...
    - **Don't care:** ...
    - **Neighborhoods (priority order):** ... (with `--area` tokens)
    - **Pets:** ...
    - **Commute destinations:** ...
    - **Subway:** lines ..., max X mi walk

    # Grading rubric

    | Check | Weight |
    |---|---|
    | <check name from the token reference below> | N |

## Prerequisites

The `streeteasy` CLI must be on PATH:

    streeteasy --version

If missing, install per the project README (`curl … install.sh | sh`, requires Node ≥22).

## Running a search

Build the command from `criteria.md`:

    streeteasy search \
      --area <AREA_1> --area <AREA_2> ... \
      --max-price <BUDGET> --beds <BEDS> --all-pages \
      --cache-dir ./data --json

Capture stdout into `{ searchRentals: { totalCount, edges } }`. For each `edge.node.id` without a `./data/listings/<id>.json`:

    streeteasy details <id> --cache-dir ./data --summary

The CLI is cache-first; positional `<id>` (or full URL or `/rental/<id>`) must come before flags.

## Grading

Score each summary against the rubric in `criteria.md`. Total = sum of weights for hits.

**Check `summary.amenities ∪ summary.features`** — the StreetEasy API splits unit features (Dishwasher, Central AC, W/D, private outdoor) into `features` while building amenities (Doorman, Gym, Laundry) live in `amenities`. Treat them as a single token bag.

Token reference for common checks:

| Check | How to test |
|---|---|
| Dishwasher | `DISHWASHER` ∈ tokens |
| Central AC | `CENTRAL_AC` or `CENTRAL_AIR` ∈ tokens |
| W/D in unit | `WASHER_DRYER` / `WASHER_DRYER_IN_UNIT` / `IN_UNIT_WASHER_DRYER` ∈ tokens |
| N baths | `baths >= N` |
| Private outdoor | `PRIVATE_OUTDOOR_SPACE` / `BALCONY` / `TERRACE` / `BACKYARD` / `PATIO` ∈ tokens |
| Doorman / packages | `DOORMAN` / `FULL_TIME_DOORMAN` / `PART_TIME_DOORMAN` / `VIRTUAL_DOORMAN` ∈ tokens |
| Gym | `GYM` / `FITNESS_CENTER` / `FITNESS_ROOM` ∈ tokens |
| Laundry access | W/D in unit (above) OR `LAUNDRY` / `LAUNDRY_IN_BUILDING` ∈ tokens |
| Months free | `monthsFree > 0` |
| Train ≤ X mi | any `transitStations` entry with `distance <= X` and `routes` includes a line from `criteria.md` |

Tiers: Great ≥70%, Good 50–69%, Below <50%. Sort within each tier by score then price.

`summary.floor` is `null` for nearly all listings (API rarely populates it) — best-effort.

`summary.area` is the neighborhood when `--cache-dir` was used for the original search; falls back to the borough otherwise.

## Presenting listings

Use `AskUserQuestion` one listing at a time. Include:

- Price, beds/baths, sqft if available, neighborhood
- Full URL (`summary.url` — do not construct)
- What it has / what it's missing from the criteria
- Commute time to the destinations in `criteria.md` (subway-to-subway, no walking segments)
- Floor (`summary.floor`) if present
- Days on market (`summary.daysOnMarket`)
- Available date (`summary.availableAt`)

Always fetch full details before presenting — never punt uncached listings.

## On rate-limit (CLI exits non-zero with HTTP 403 on stderr)

The CLI fails fast. On the second 403 in a single invocation, stderr also prints `rotation exhausted`. Two paths:

1. **Proxy configured:** put the URL in shell config:

       export STREETEASY_PROXY_URL='http://...{{rand}}...@host:port'

   Then `streeteasy config set proxy.enabled true` and re-run.

2. **No proxy:** wait 30+ minutes; retries during a ban extend it.

## Step last: Collect feedback

Append new learnings to `feedback.log` (next to this SKILL.md). Each entry: `## YYYY-MM-DD: title` heading + the specific lesson. Capture:

- Presentation format corrections
- Location preferences
- Dealbreakers from photo review
- Commute thresholds
- Value judgments
- Any correction the user makes to your approach

Criteria changes (budget, neighborhoods, weights) go to `criteria.md` instead.
