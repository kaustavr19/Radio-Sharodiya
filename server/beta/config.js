const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required beta environment variable: ${name}`);
  return value;
};

export const getBetaConfig = () => {
  const sessionSecret = required('BETA_SESSION_SECRET');
  if (sessionSecret.length < 32) throw new Error('BETA_SESSION_SECRET must contain at least 32 characters');

  return {
    adminEmail: required('BETA_ADMIN_EMAIL').toLowerCase(),
    fromEmail: required('BETA_FROM_EMAIL'),
    replyTo: process.env.BETA_REPLY_TO?.trim() || undefined,
    resendApiKey: required('RESEND_API_KEY'),
    sessionSecret,
    siteUrl: process.env.BETA_SITE_URL?.trim().replace(/\/$/, '') || '',
    supabaseKey: process.env.SUPABASE_SECRET_KEY?.trim() || required('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseUrl: required('SUPABASE_URL').replace(/\/$/, ''),
  };
};
