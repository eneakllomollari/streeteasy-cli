# streeteasy-cli

A small CLI for searching StreetEasy rental listings in NYC. `search`, `details`, and `config`. Optional rotating-proxy support, opt-in disk cache, JSON or human output.

Scope: rental listings on StreetEasy, NYC neighborhoods, JSON output, opt-in cache, optional rotating proxy. No sales listings, no non-NYC markets, no UI.

## Install

Requires **Node.js ≥22** on the host.

```sh
curl -fsSL https://raw.githubusercontent.com/eneakllomollari/streeteasy-cli/main/install.sh | sh
```

Downloads the released JS bundle, verifies its SHA-256, and installs it to `~/.local/bin/streeteasy`. Override with `STREETEASY_VERSION=v0.1.0` (specific tag) or `STREETEASY_INSTALL_DIR=/usr/local/bin`. If `~/.local/bin` is not on `PATH`, the script prints an `export` line to add to your shell config.

### From source

```sh
git clone https://github.com/eneakllomollari/streeteasy-cli.git
cd streeteasy-cli
pnpm install
pnpm build         # produces dist/cli.js
pnpm link --global # makes `streeteasy` available on PATH
```

## Quick start

```sh
# Search Williamsburg 2BR ≤$4500, all pages, write JSON cache
streeteasy search --area WILLIAMSBURG --max-price 4500 --beds 2 \
  --all-pages --cache-dir ./data --json

# Fetch one listing by id (or full URL or /rental/<id>)
streeteasy details 5037855 --cache-dir ./data --summary
streeteasy details https://streeteasy.com/rental/5037855 --summary

# Human-readable card output (no --json)
streeteasy search --area WILLIAMSBURG --beds 2 --per-page 5
```

## Commands

```sh
streeteasy --help
streeteasy search --help
streeteasy details --help
streeteasy config --help
```

The CLI's own help is the authoritative reference.

## Proxy

The CLI supports a single rotating-session HTTP proxy URL. Set it in your shell:

```sh
export STREETEASY_PROXY_URL='http://USER-sessionid-{{rand}}:PASS@proxy.example.com:1234'
streeteasy config set proxy.enabled true
```

`{{rand}}` is substituted with a fresh session ID per invocation. Per-invocation overrides: `--proxy-url <url>` or `--no-proxy`.

Precedence: flag → env (`STREETEASY_PROXY_URL`, `STREETEASY_PROXY_ENABLED`) → `~/.config/streeteasy/config.json` → off.

## Exit codes

`0` success · `1` API/network error · `2` invalid input.

## Development

```sh
pnpm install
pnpm dev <args>        # run via tsx
pnpm build             # bundle to dist/cli.js
pnpm test              # vitest
pnpm preflight         # lint + knip + typecheck + test
```

## Releasing

Push a tag matching `v*` to trigger `.github/workflows/release.yml`, which runs preflight, builds the standalone JS bundle, and creates the GitHub release with `streeteasy` + `SHA256SUMS` attached.

```sh
git tag v1.0.1
git push origin v1.0.1
```

## References

- [`evandcoleman/streeteasy-api`](https://github.com/evandcoleman/streeteasy-api) — GraphQL queries and area codes started from here.
