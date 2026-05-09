#!/usr/bin/env sh
# streeteasy-cli install script.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/eneakllomollari/streeteasy-cli/main/install.sh | sh
#
# Requires Node.js >=22 on the host.
#
# Optional env vars:
#   STREETEASY_VERSION       Specific tag (default: latest release)
#   STREETEASY_INSTALL_DIR   Install prefix (default: ~/.local/bin)

set -eu

REPO="eneakllomollari/streeteasy-cli"
INSTALL_DIR="${STREETEASY_INSTALL_DIR:-${HOME}/.local/bin}"

# Verify Node >=22.
if ! command -v node >/dev/null 2>&1; then
  printf 'error: node is not on PATH. Install Node.js >=22 first (e.g. via nvm, fnm, asdf, or https://nodejs.org).\n' >&2
  exit 1
fi
node_major=$(node -p 'process.versions.node.split(".")[0]')
if [ "${node_major}" -lt 22 ]; then
  printf 'error: node %s detected; streeteasy requires >=22.\n' "$(node -v)" >&2
  exit 1
fi

# Resolve version.
version="${STREETEASY_VERSION:-}"
if [ -z "${version}" ]; then
  version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' \
    | head -1)
  if [ -z "${version}" ]; then
    printf 'error: could not determine latest version\n' >&2
    exit 1
  fi
fi

asset="streeteasy"
url="https://github.com/${REPO}/releases/download/${version}/${asset}"
sums_url="https://github.com/${REPO}/releases/download/${version}/SHA256SUMS"

printf 'streeteasy %s\n' "${version}"
printf '  node:     %s\n' "$(node -v)"
printf '  download: %s\n' "${url}"
printf '  install:  %s/streeteasy\n' "${INSTALL_DIR}"

mkdir -p "${INSTALL_DIR}"
tmpdir=$(mktemp -d)
trap 'rm -rf "${tmpdir}"' EXIT INT TERM

if ! curl -fsSL "${url}" -o "${tmpdir}/${asset}"; then
  printf 'error: download failed for %s in %s\n' "${asset}" "${version}" >&2
  exit 1
fi
curl -fsSL "${sums_url}" -o "${tmpdir}/SHA256SUMS" || {
  printf 'warning: no SHA256SUMS published; skipping checksum verification\n' >&2
}

if [ -f "${tmpdir}/SHA256SUMS" ]; then
  expected=$(grep " ${asset}$" "${tmpdir}/SHA256SUMS" | awk '{print $1}')
  if [ -z "${expected}" ]; then
    printf 'warning: %s missing from SHA256SUMS\n' "${asset}" >&2
  else
    actual=$(shasum -a 256 "${tmpdir}/${asset}" | awk '{print $1}')
    if [ "${expected}" != "${actual}" ]; then
      printf 'error: checksum mismatch\n  expected: %s\n  actual:   %s\n' "${expected}" "${actual}" >&2
      exit 1
    fi
    printf '  checksum: ok\n'
  fi
fi

chmod +x "${tmpdir}/${asset}"
mv "${tmpdir}/${asset}" "${INSTALL_DIR}/streeteasy"

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    printf '\nNote: %s is not on your PATH.\n' "${INSTALL_DIR}"
    printf 'Add this to your shell config (~/.zshrc, ~/.bashrc, etc.):\n'
    printf '  export PATH="%s:$PATH"\n' "${INSTALL_DIR}"
    ;;
esac

printf '\nInstalled. Try: streeteasy --help\n'
