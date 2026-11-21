const fs = require('fs');
const path = require('path');

const wranglerPath = path.join(__dirname, '..', 'wrangler.jsonc');

if (fs.existsSync(wranglerPath)) {
  try {
    const content = fs.readFileSync(wranglerPath, 'utf8');
    const json = JSON.parse(content);

    json.vars = json.vars || {};

    // Never write DATABASE_URL or DIRECT_URL into git-tracked wrangler.jsonc.
    // Remove any previously injected DB credentials if present.
    delete json.vars.DATABASE_URL;
    delete json.vars.DIRECT_URL;

    if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
      console.log(
        'ℹ️ [inject-cf-vars] Skipping DB credentials in wrangler.jsonc — configure secrets securely via `wrangler secret put DATABASE_URL` and `wrangler secret put DIRECT_URL`.'
      );
    }

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      json.vars.NEXT_PUBLIC_GOOGLE_CLIENT_ID = googleClientId;
      console.log('✅ [inject-cf-vars] Updated NEXT_PUBLIC_GOOGLE_CLIENT_ID in wrangler.jsonc');
    }

    fs.writeFileSync(wranglerPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log('🚀 [inject-cf-vars] Updated wrangler.jsonc safely');
  } catch (err) {
    console.error('⚠️ [inject-cf-vars] Error updating wrangler.jsonc:', err);
  }
}
