#!/usr/bin/env bash
# check-oss-cloud-boundary.sh
# Verifies that core packages do not statically import feature packages
# (@veska/ai, @veska/notifications, @veska/rate-limit, @veska/storage).
# Dynamic imports (await import(...)) are permitted and excluded from this check.
# See ARCHITECTURE.md for the rationale and allowed patterns.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking modularity boundary..."

# Only core packages are checked — apps and feature packages may import feature packages freely
CORE_DIRS=(
  "packages/core/src"
  "packages/sdk/src"
  "packages/cli/src"
  "packages/ui/src"
)

# Feature packages that must not be statically imported in core
FEATURE_PACKAGES=(
  "@veska/ai"
  "@veska/notifications"
  "@veska/rate-limit"
  "@veska/storage"
)

VIOLATIONS=()

for rel_dir in "${CORE_DIRS[@]}"; do
  dir="$REPO_ROOT/$rel_dir"
  if [ -d "$dir" ]; then
    for pkg in "${FEATURE_PACKAGES[@]}"; do
      matches=$(grep -rn --include="*.ts" --include="*.tsx" "from '${pkg}" "$dir" \
        | grep -v "await import" || true)
      if [ -n "$matches" ]; then
        while IFS= read -r line; do
          VIOLATIONS+=("$line")
        done <<< "$matches"
      fi
    done
  fi
done

if [ "${#VIOLATIONS[@]}" -gt 0 ]; then
  echo ""
  echo "ERROR: Core packages must not statically import feature packages."
  echo "Use dynamic import with a fallback instead (see ARCHITECTURE.md)."
  echo ""
  echo "Violations found:"
  for v in "${VIOLATIONS[@]}"; do
    echo "  $v"
  done
  echo ""
  exit 1
fi

echo "✓ Modularity boundary clean."
exit 0
