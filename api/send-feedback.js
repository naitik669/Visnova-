import { createClient } from '@supabase/supabase-js';

const DEFAULT_TO_EMAIL = 'naitik.business69@gmail.com';
const allowedTypes = new Set(['feedback', 'bug', 'feature_request', 'general']);
const allowedPriorities = new Set(['low', 'normal', 'high', 'urgent']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function sanitizeText(value, maxLength = 2000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return sanitizeText(value, 5000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSupabaseClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

function buildEmail(report, userEmail) {
  const reportType = allowedTypes.has(report.type) ? report.type : 'feedback';
  const priority = allowedPriorities.has(report.priority) ? report.priority : 'normal';
  const title = sanitizeText(report.title, 120) || 'Untitled report';
  const message = sanitizeText(report.message, 3000);
  const pageUrl = sanitizeText(report.page_url, 500);
  const userAgent = sanitizeText(report.user_agent, 500);
  const route = sanitizeText(report.metadata?.route, 300);
  const viewport = report.metadata?.viewport
    ? `${Number(report.metadata.viewport.width) || 0}x${Number(report.metadata.viewport.height) || 0}`
    : '';

  const subject = `[VisNova ${reportType}] ${title}`;
  const text = [
    `Type: ${reportType}`,
    `Priority: ${priority}`,
    `User: ${userEmail || report.user_id || 'unknown'}`,
    `Report ID: ${report.id}`,
    title ? `Title: ${title}` : '',
    '',
    message,
    '',
    pageUrl ? `Page: ${pageUrl}` : '',
    route ? `Route: ${route}` : '',
    viewport ? `Viewport: ${viewport}` : '',
    userAgent ? `User agent: ${userAgent}` : '',
    `Created: ${report.created_at || new Date().toISOString()}`
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #2f2333; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">VisNova ${escapeHtml(reportType)} report</h2>
      <p><strong>Priority:</strong> ${escapeHtml(priority)}</p>
      <p><strong>User:</strong> ${escapeHtml(userEmail || report.user_id || 'unknown')}</p>
      <p><strong>Report ID:</strong> ${escapeHtml(report.id)}</p>
      <p><strong>Title:</strong> ${escapeHtml(title)}</p>
      <div style="white-space: pre-wrap; background: #f6eff8; border: 1px solid #eadceb; border-radius: 12px; padding: 14px;">${escapeHtml(message)}</div>
      ${pageUrl ? `<p><strong>Page:</strong> <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a></p>` : ''}
      ${route ? `<p><strong>Route:</strong> ${escapeHtml(route)}</p>` : ''}
      ${viewport ? `<p><strong>Viewport:</strong> ${escapeHtml(viewport)}</p>` : ''}
      ${userAgent ? `<p><strong>User agent:</strong> ${escapeHtml(userAgent)}</p>` : ''}
      <p><strong>Created:</strong> ${escapeHtml(report.created_at || new Date().toISOString())}</p>
    </div>
  `;

  return { subject, text, html };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
  const toEmail = process.env.FEEDBACK_TO_EMAIL || DEFAULT_TO_EMAIL;

  if (!resendKey || !fromEmail) {
    return json(res, 503, { error: 'Feedback email delivery is not configured.' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) return json(res, 401, { error: 'Login required' });

  const supabase = getSupabaseClient(accessToken);
  if (!supabase) return json(res, 500, { error: 'Supabase is not configured.' });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) return json(res, 401, { error: 'Login required' });

  let body = req.body || {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body || '{}');
    } catch {
      return json(res, 400, { error: 'Invalid JSON body' });
    }
  }
  const reportId = sanitizeText(body.reportId, 80);
  if (!reportId) return json(res, 400, { error: 'Report ID is required' });

  const { data: report, error: reportError } = await supabase
    .from('feedback_reports')
    .select('id,user_id,type,title,message,page_url,user_agent,priority,metadata,created_at')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    console.error('Feedback email report lookup failed:', reportError);
    return json(res, 404, { error: 'Report not found' });
  }

  const email = buildEmail(report, userData.user.email);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: email.subject,
      text: email.text,
      html: email.html,
      reply_to: userData.user.email || undefined
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Feedback email send failed:', result);
    return json(res, 502, { error: 'Could not send feedback email' });
  }

  return json(res, 200, { ok: true });
}
