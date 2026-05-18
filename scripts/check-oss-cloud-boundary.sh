#!/usr/bin/env bash
# check-oss-cloud-boundary.sh
# Verifies that OSS packages (@veska/*) do not statically import @veska-cloud/* packages.
# Dynamic imports (await import(...)) are permitted and are excluded from this check.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking OSS/cloud boundary..."

OSS_SRC_DIRS=(
  "packages/core/src"
  "packages/sdk/src"
  "packages/cli/src"
  "packages/ui/src"
  "apps/admin/src"
  "apps/api/src"
  "apps/marketing/src"
  "apps/marketplace/src"
)

VIOLATIONS=()

for rel_dir in "${OSS_SRC_DIRS[@]}"; do
  dir="$REPO_ROOT/$rel_dir"
  if [ -d "$dir" ]; then
    # Find static imports of @veska-cloud/* — exclude lines with dynamic imports (await import)
    matches=$(grep -rn --include="*.ts" --include="*.tsx" "from '@veska-cloud/" "$dir" \
      | grep -v "await import" || true)
    if [ -n "$matches" ]; then
      while IFS= read -r line; do
        VIOLATIONS+=("$line")
      done <<< "$matches"
    fi
  fi
done

if [ "${#VIOLATIONS[@]}" -gt 0 ]; then
  echo ""
  echo "ERROR: OSS packages must not statically import @veska-cloud/* packages."
  echo ""
  echo "Violations found:"
  for v in "${VIOLATIONS[@]}"; do
    echo "  $v"
  done
  echo ""
  exit 1
fi

echo "✓ OSS/cloud boundary clean."
exit 0
