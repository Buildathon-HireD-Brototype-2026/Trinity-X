import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Server-side email dispatcher plugin (Node.js runtime)
function serverEmailApiPlugin() {
  const emailLogs = [];

  function formatEmailHtml({ subject, body, to, from, orderId, type }) {
    const escaped = (body || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

    const accentColor = type === 'accepted' ? '#16a34a' : '#dc2626';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { border-bottom: 2px solid ${accentColor}; padding-bottom: 12px; margin-bottom: 16px; }
    .header h2 { margin: 0; color: #0f172a; font-size: 18px; }
    .body { font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>${subject}</h2>
    </div>
    <div class="body">
      ${escaped}
    </div>
    <div class="footer">
      Sent by HireD Operations (${from}) • Order Reference #ORD-${orderId}
    </div>
  </div>
</body>
</html>`;
  }

  return {
    name: 'server-email-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url && req.url.includes('/api/v1/admin/orders/') && req.url.includes('/send-decision-email')) {
          let bodyData = '';
          req.on('data', (chunk) => { bodyData += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyData || '{}');
              const { orderId, type, to, from, subject, body, simulateFailure } = payload;

              // Validate recipient
              if (!to || !to.trim()) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  success: false,
                  emailSent: false,
                  error: 'Company email missing, add it before sending'
                }));
              }

              // Check failure simulation
              const isSimulatedFail = simulateFailure === true || req.headers['x-simulate-email-failure'] === 'true';
              if (isSimulatedFail) {
                const failLog = {
                  order_id: Number(orderId),
                  type: type || 'accepted',
                  to,
                  from: from || process.env.ADMIN_EMAIL || 'admin@hired.com',
                  subject: subject || 'Order Update',
                  body: body || '',
                  status: 'failed',
                  error: 'SMTP gateway timeout',
                  sent_at: new Date().toISOString()
                };
                emailLogs.unshift(failLog);
                console.warn(`[server-email] Simulated email dispatch failure for Order #${orderId} to ${to}`);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  success: true,
                  emailSent: false,
                  error: 'Status updated, but email failed to send',
                  log: failLog
                }));
              }

              // Clean HTML formatting with plain text fallback (preserving line breaks)
              const htmlBody = formatEmailHtml({ subject, body, to, from, orderId, type });

              const logEntry = {
                order_id: Number(orderId),
                type: type || 'accepted',
                to,
                from: from || process.env.ADMIN_EMAIL || 'admin@hired.com',
                subject,
                body,
                html: htmlBody,
                status: 'sent',
                error: null,
                sent_at: new Date().toISOString()
              };

              emailLogs.unshift(logEntry);
              console.log(`[server-email] Dispatched ${type.toUpperCase()} email to ${to} (from: ${logEntry.from})`);
              console.log(`[server-email] Subject: "${subject}"`);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                success: true,
                emailSent: true,
                log: logEntry
              }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                success: false,
                emailSent: false,
                error: err.message
              }));
            }
          });
          return;
        }

        // Endpoint to fetch email logs
        if (req.method === 'GET' && req.url && req.url === '/api/v1/admin/orders/email-logs') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, data: emailLogs }));
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serverEmailApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    headers: {
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    port: 3000,
    headers: {
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});
