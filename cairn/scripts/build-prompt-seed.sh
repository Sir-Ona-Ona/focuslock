#!/usr/bin/env bash
# Lifts the six skill bodies into method seed data, verbatim except that names
# are replaced by placeholders the assembler fills per household, and gendered
# pronouns referring to those placeholders are neutralised.
set -euo pipefail
SRC="${1:-/root/.claude/skills/synced}"
OUT="lib/method/seed/prompts"
declare -A MAP=(
  [life-plan]=interview
  [life-review]=review
  [strategy-meeting]=session
  [decision-brief]=brief
  [plan-advisor]=advisor
  [life-timeline]=timeline
)
for skill in "${!MAP[@]}"; do
  key="${MAP[$skill]}"
  awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2{print}' "$SRC/$skill/SKILL.md" \
  | sed -E \
      -e 's/\bOna\x27s\b/{{principal_a}}\x27s/g' \
      -e 's/\bLeroo\x27s\b/{{principal_b}}\x27s/g' \
      -e 's/\bOna\b/{{principal_a}}/g' \
      -e 's/\bLeroo\b/{{principal_b}}/g' \
      -e 's/\bhis partner\b/their partner/g' \
      -e 's/\bhis\b/their/g' -e 's/\bHis\b/Their/g' \
      -e 's/\bhers\b/theirs/g' \
      -e 's/\bher\b/their/g' -e 's/\bHer\b/Their/g' \
      -e 's/\bhe\b/they/g' -e 's/\bshe\b/they/g' \
      -e 's/\bHe\b/They/g' -e 's/\bShe\b/They/g' \
      -e 's/\bhimself\b/themselves/g' -e 's/\bherself\b/themselves/g' \
      -e 's/\bhim\b/them/g' \
  > "$OUT/$key.md"
  echo "$key.md <- $skill"
done
