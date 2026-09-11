const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sendEmail = async (config, { to, subject, text, html, idempotencyKey }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to: [to],
      subject,
      text,
      html,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Invitation email failed (${response.status}): ${payload.message || 'Unknown email error'}`);
  return payload;
};

const codeMarkup = (code) => `<div style="margin:24px 0;padding:18px 22px;border:1px solid #d89a2b;border-radius:12px;background:#18201e;color:#fff5dc;font:700 30px/1.2 ui-monospace,monospace;letter-spacing:8px;text-align:center">${escapeHtml(code)}</div>`;

export const sendTesterInvitation = (config, { email, name, code, expiresAt }) => {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const expiry = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(expiresAt));
  const accessUrl = `${config.siteUrl || ''}/?beta=access`;
  return sendEmail(config, {
    to: email,
    subject: 'Your Radio Sharodiya beta invitation',
    idempotencyKey: `beta-invite-${Buffer.from(`${email}:${expiresAt}`).toString('base64url').slice(0, 180)}`,
    text: `${greeting}\n\nYou have been invited to the Radio Sharodiya beta.\n\nAccess code: ${code}\n\nThis code expires ${expiry}. Open ${accessUrl} and enter the same email address with this code.\n\nRadio Sharodiya`,
    html: `<div style="max-width:560px;margin:auto;padding:32px;background:#f3ead6;color:#18201e;font:16px/1.6 Georgia,serif"><p>${escapeHtml(greeting)}</p><h1 style="font-size:30px;line-height:1.1">Your frequency is ready.</h1><p>You have been invited to the Radio Sharodiya beta. Enter this code with the same email address you used to request access.</p>${codeMarkup(code)}<p>This code expires <strong>${escapeHtml(expiry)}</strong>.</p><p><a href="${escapeHtml(accessUrl)}" style="color:#9d3e27">Open Radio Sharodiya</a></p></div>`,
  });
};

export const sendTesterSignInCode = (config, { email, name, code, expiresAt }) => {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const expiry = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(expiresAt));
  const accessUrl = `${config.siteUrl || ''}/?beta=access`;
  return sendEmail(config, {
    to: email,
    subject: 'Your Radio Sharodiya sign-in code',
    idempotencyKey: `beta-returning-${Buffer.from(`${email}:${expiresAt}`).toString('base64url').slice(0, 180)}`,
    text: `${greeting}\n\nUse this code to sign in to the Radio Sharodiya beta on this browser or device.\n\nSign-in code: ${code}\n\nThis code expires at ${expiry}. Open ${accessUrl} and enter this email address with the code.\n\nRadio Sharodiya`,
    html: `<div style="max-width:560px;margin:auto;padding:32px;background:#f3ead6;color:#18201e;font:16px/1.6 Georgia,serif"><p>${escapeHtml(greeting)}</p><h1 style="font-size:30px;line-height:1.1">Return to your frequency.</h1><p>Use this code to sign in to the Radio Sharodiya beta on this browser or device.</p>${codeMarkup(code)}<p>This code expires at <strong>${escapeHtml(expiry)}</strong>.</p><p><a href="${escapeHtml(accessUrl)}" style="color:#9d3e27">Open Radio Sharodiya</a></p><p style="font-size:13px;opacity:.72">If you did not request this code, you can ignore this email.</p></div>`,
  });
};

export const sendAdminAccessCode = (config, { code, expiresAt }) => {
  const expiry = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(expiresAt));
  return sendEmail(config, {
    to: config.adminEmail,
    subject: 'Radio Sharodiya beta desk sign-in code',
    idempotencyKey: `beta-admin-${Buffer.from(expiresAt).toString('base64url')}`,
    text: `Your Radio Sharodiya beta desk code is ${code}. It expires at ${expiry}.`,
    html: `<div style="max-width:520px;margin:auto;padding:32px;background:#f3ead6;color:#18201e;font:16px/1.6 Georgia,serif"><h1 style="font-size:28px">Beta desk sign-in</h1><p>Use this one-time code to open the private Radio Sharodiya beta desk.</p>${codeMarkup(code)}<p>This code expires at ${escapeHtml(expiry)}.</p></div>`,
  });
};

export const sendSignupNotice = (config, { email, name }) => sendEmail(config, {
  to: config.adminEmail,
  subject: 'New Radio Sharodiya beta request',
  idempotencyKey: `beta-request-${Buffer.from(email).toString('base64url').slice(0, 180)}`,
  text: `${name || 'A listener'} requested Radio Sharodiya beta access using ${email}. Open ${config.siteUrl || ''}/beta-admin to review the request.`,
  html: `<div style="max-width:520px;margin:auto;padding:32px;background:#f3ead6;color:#18201e;font:16px/1.6 Georgia,serif"><h1 style="font-size:28px">A new listener is waiting.</h1><p><strong>${escapeHtml(name || 'Unnamed listener')}</strong><br>${escapeHtml(email)}</p><p><a href="${escapeHtml(`${config.siteUrl || ''}/beta-admin`)}" style="color:#9d3e27">Open the beta desk</a></p></div>`,
});
