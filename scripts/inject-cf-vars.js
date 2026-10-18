const fs = require('fs');
const path = require('path');

const wranglerPath = path.join(__dirname, '..', 'wrangler.jsonc');

if (fs.existsSync(wranglerPath)) {
  try {
    let content = fs.readFileSync(wranglerPath, 'utf8');
    const json = JSON.parse(content);

    json.vars = json.vars || {};

    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (dbUrl) {
      json.vars.DATABASE_URL = dbUrl;
      console.log('✅ [inject-cf-vars] Injected DATABASE_URL into wrangler.jsonc');
    } else {
      console.log('ℹ️ [inject-cf-vars] No DATABASE_URL in build env, keeping existing config');
    }

    if (directUrl) {
      json.vars.DIRECT_URL = directUrl;
      console.log('✅ [inject-cf-vars] Injected DIRECT_URL into wrangler.jsonc');
    }

    if (googleClientId) {
      json.vars.NEXT_PUBLIC_GOOGLE_CLIENT_ID = googleClientId;
    }

    fs.writeFileSync(wranglerPath, JSON.stringify(json, null, 2), 'utf8');
    console.log('🚀 [inject-cf-vars] Successfully updated wrangler.jsonc for deployment');
  } catch (err) {
    console.error('⚠️ [inject-cf-vars] Error injecting vars into wrangler.jsonc:', err);
  }
}
