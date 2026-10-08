#!/bin/sh
# Rebuilds the code font from an installed IosevkaTermSlab Nerd Font: Latin only,
# no hinting or icon glyphs, so each weight is about 17 KB instead of about 10 MB.
# Usage: scripts/subset-iosevka.sh [font directory, default ~/Library/Fonts]
set -eu
source_dir="${1:-$HOME/Library/Fonts}"
out_dir="$(dirname "$0")/../src/fonts"
for weight in Regular Bold; do
    uvx --from 'fonttools[woff]' pyftsubset "$source_dir/IosevkaTermSlabNerdFont-$weight.ttf" \
        --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2190-2193,U+2212,U+2215,U+2260,U+2264-2265,U+FFFD' \
        --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk' --no-hinting --desubroutinize \
        --flavor=woff2 --output-file="$out_dir/IosevkaTermSlab-$weight.woff2"
done
