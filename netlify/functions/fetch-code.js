// Netlify Function: מביא קוד של גרסה מכתובת deploy ב-Netlify ומחזיר אותו עם כותרות CORS.
// שימוש: /.netlify/functions/fetch-code?url=<כתובת הגרסה>
const MAX_BYTES = 5 * 1024 * 1024; // מגבלת התגובה של Netlify Functions היא ~6MB

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

const reply = (statusCode, body, extra = {}) => ({
  statusCode,
  headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  body
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };

  let target;
  try {
    target = new URL((event.queryStringParameters || {}).url);
  } catch (e) {
    return reply(400, 'missing or invalid url');
  }

  // הגנה: רק כתובות https של netlify.app (כדי שזה לא יהפוך לפרוקסי פתוח לכל האינטרנט)
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.netlify.app')) {
    return reply(403, 'only https://*.netlify.app urls are allowed');
  }

  try {
    const res = await fetch(target, { redirect: 'manual' });
    if (!res.ok) return reply(res.status === 404 ? 404 : 502, `upstream status ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return reply(413, 'file too large');
    return reply(200, buf.toString('utf-8'));
  } catch (e) {
    return reply(502, 'fetch failed: ' + e.message);
  }
};
