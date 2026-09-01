#!/bin/bash
# Copy + resize curated real product photos into web assets.
# usage: curate.sh <id> <source-dir> <file1> [file2...]
set -e
BASE="/Users/rinshad/Movies/Online store"
OUT="$BASE/reworn/assets/img/products"
id="$1"; src="$2"; shift 2
i=1
for f in "$@"; do
  dst="$OUT/${id}-${i}.jpg"
  cp "$BASE/$src/$f" "$dst"
  sips -Z 1600 "$dst" --setProperty formatOptions 82 >/dev/null
  i=$((i+1))
done
echo "$id: $((i-1)) photos"
