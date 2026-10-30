#!/usr/bin/env bash
# Turns a drink's Blender renders into web frames + updates the site's frame list.
#   bash blender/scripts/publish_frames.sh sol-de-mango
# In:  blender/renders/<drink>/f_0001.png ... (1080x1350)
# Out: public/frames/<drink>/001.webp ...   (720x900, ~40 KB each)
#      public/stills/<drink>.webp           (finished drink, used for reduced motion)
#      src/data/frames.json                 (tells the site which drinks have frames)
set -euo pipefail
drink="$1"
root="$(cd "$(dirname "$0")/../.." && pwd)"
src="$root/blender/renders/$drink"
out="$root/public/frames/$drink"

count=$(ls "$src"/f_*.png | wc -l)
[ "$count" -ge 160 ] || { echo "only $count frames rendered for $drink; not publishing yet"; exit 1; }

rm -rf "$out" && mkdir -p "$out"
ffmpeg -loglevel error -y -start_number 1 -i "$src/f_%04d.png" \
  -vf "scale=720:900:flags=lanczos" -c:v libwebp -quality 74 -compression_level 6 \
  -start_number 1 "$out/%03d.webp"

# Still for reduced motion / fallback: frame 95 = poured, garnished, facing front.
ffmpeg -loglevel error -y -i "$src/f_0095.png" -vf "scale=720:900:flags=lanczos" \
  -c:v libwebp -quality 82 "$root/public/stills/$drink.webp"

n=$(ls "$out"/*.webp | wc -l)
node -e "
const fs = require('fs'); const p = '$root/src/data/frames.json'.replace(/^\/([a-z])\//, '\$1:/');
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
m['$drink'] = { count: $n, width: 720, height: 900 };
fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('frames.json:', JSON.stringify(m));
"
echo "published $n frames for $drink ($(du -sh "$out" | cut -f1))"
