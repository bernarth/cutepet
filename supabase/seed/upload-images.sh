#!/usr/bin/env bash
# Uploads the placeholder photos used by supabase/seed.sql to the LOCAL store-images bucket.
# It only talks to 127.0.0.1, so it can never reach the remote project.

set -euo pipefail

api_url="http://127.0.0.1:54321"
images_dir="$(dirname "$0")/images"
secret_key=$(supabase status --output env 2>/dev/null | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')

if [ -z "$secret_key" ]; then
  echo "Local Supabase is not running. Start it with: supabase start"
  exit 1
fi

for image in "$images_dir"/*.png; do
  name=$(basename "$image")
  curl --fail --silent --show-error --output /dev/null \
    -X POST "$api_url/storage/v1/object/store-images/seed/$name" \
    -H "Authorization: Bearer $secret_key" \
    -H "Content-Type: image/png" \
    -H "x-upsert: true" \
    --data-binary "@$image"
  echo "Uploaded seed/$name"
done
