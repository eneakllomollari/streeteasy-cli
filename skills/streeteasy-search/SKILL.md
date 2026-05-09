---
name: streeteasy-search
description: Search StreetEasy rental listings in NYC via the local `streeteasy` CLI and score results against the apartment criteria embedded below. Use when the user mentions apartment hunting, StreetEasy, rental search, or finding apartments.
---

# StreetEasy Apartment Search

A starting-point Claude Code skill that drives [`streeteasy-cli`](https://github.com/eneakllomollari/streeteasy-cli). Copy the directory into `.claude/skills/streeteasy-search/` (or wherever your Claude Code installation reads skills from), then edit the **Apartment criteria** and **Grading rubric** sections to match your search.

## Step 0: Load feedback

Read `feedback.log` next to this SKILL.md. If it doesn't exist, that's fine — append to it as you go (Step last). It accumulates corrections, dealbreakers, and presentation rules across sessions.

## Apartment criteria

> Edit this section. The criteria below are an example.

- **Budget:** max $4,500/mo. Value matters more than cheapness.
- **Bedrooms:** 2 (second can be flex / office).
- **Must have:** dishwasher, central AC, good natural light.
- **Strong preference:** in-unit W/D, 2 baths, split-bedroom layout.
- **Nice to have:** outdoor space, doorman, gym, in-building laundry.
- **Don't care:** specific square footage, elevator vs walk-up, prewar vs new.
- **Neighborhoods (priority order):** Williamsburg, Greenpoint, East Williamsburg, Park Slope, Prospect Heights, Long Island City.
- **Pets:** none.

## Prerequisites

The `streeteasy` CLI must be on PATH:

    streeteasy --version

If missing, install per the project README (`curl … install.sh | sh`, requires Node ≥22).

## Running a search

    streeteasy search \
      --area WILLIAMSBURG --area GREENPOINT --area EAST_WILLIAMSBURG \
      --area PARK_SLOPE --area PROSPECT_HEIGHTS --area LONG_ISLAND_CITY \
      --max-price 4500 --beds 2 --all-pages \
      --cache-dir ./data --json

Capture stdout into `{ searchRentals: { totalCount, edges } }`. For each `edge.node.id` without a `./data/listings/<id>.json`:

    streeteasy details <id> --cache-dir ./data --summary

The CLI is cache-first; positional `<id>` (or full URL or `/rental/<id>`) must come before flags.

## Grading rubric

> Edit weights and tokens to match your priorities.

Score each summary. Total = sum of weights for hits.

**Check `summary.amenities ∪ summary.features`** — the StreetEasy API splits unit features (Dishwasher, Central AC, W/D, private outdoor) into `features` while building amenities (Doorman, Gym, Laundry) live in `amenities`. Treat them as a single token bag.

| Check | Weight | How to test |
|---|---|---|
| Dishwasher | 10 | `DISHWASHER` ∈ tokens |
| Central AC | 10 | `CENTRAL_AC` or `CENTRAL_AIR` ∈ tokens |
| W/D in unit | 5 | `WASHER_DRYER` / `WASHER_DRYER_IN_UNIT` / `IN_UNIT_WASHER_DRYER` ∈ tokens |
| 2 baths | 5 | `baths >= 2` |
| Private outdoor | 2 | `PRIVATE_OUTDOOR_SPACE` / `BALCONY` / `TERRACE` / `BACKYARD` / `PATIO` ∈ tokens |
| Doorman / packages | 2 | `DOORMAN` / `FULL_TIME_DOORMAN` / `PART_TIME_DOORMAN` / `VIRTUAL_DOORMAN` ∈ tokens |
| Gym | 2 | `GYM` / `FITNESS_CENTER` / `FITNESS_ROOM` ∈ tokens |
| Laundry access | 2 | W/D in unit (above) OR `LAUNDRY` / `LAUNDRY_IN_BUILDING` ∈ tokens |
| Months free | 3 | `monthsFree > 0` |
| L or G train ≤0.5mi | 4 | any `transitStations` entry with `distance <= 0.5` and `routes` includes `L` or `G` |

Tiers: Great ≥70%, Good 50–69%, Below <50%. Sort within each tier by score then price.

`summary.floor` is `null` for nearly all listings (API rarely populates it) — best-effort.

`summary.area` is the neighborhood when `--cache-dir` was used for the original search; falls back to the borough otherwise.

## Presenting listings

Use `AskUserQuestion` one listing at a time. Include:

- Price, beds/baths, sqft if available, neighborhood
- Full URL (`summary.url` — do not construct)
- What it has / what it's missing from criteria above
- Commute time to your destinations (subway-to-subway, no walking segments)
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
