# Radio Sharodiya beta access

The beta layer is a controlled-access gate around the existing static radio. It does not autoplay or alter catalogue and playback behavior after a tester is authenticated.

## Listener journey

1. A visitor requests access with a name and email address.
2. The request is stored as `pending`; the administrator receives a notification email.
3. The administrator signs in at `/beta-admin` using a one-time code sent only to `BETA_ADMIN_EMAIL`.
4. **Approve & send** creates a new six-digit code, stores only its HMAC hash, expires it after 48 hours, and emails it to the requested address.
5. The tester enters the same email and code. A successful verification activates the tester and sets a signed, HTTP-only, same-site session cookie for 90 days. Each successful tester session check on page load renews the token and cookie for another 90 days, after confirming active status and session version. Existing valid 14-day sessions receive this extension on their next visit.
6. Revoking a tester increments their session version, invalidating existing sessions on the next access check.

Five failed code attempts lock verification for 15 minutes. Administrator codes expire after 15 minutes and administrator sessions after eight hours.

Expired sessions cannot be renewed. Testers whose session has expired, who clear cookies, or who use another browser still need a new invitation code from the administrator. Self-service returning-user login is not implemented.

## Services

- Vercel Functions under `/api/beta` provide the private server boundary.
- Supabase Postgres stores tester state and hashed codes. Browser code never receives the service-role key.
- Resend sends signup notifications, administrator sign-in codes, and tester invitations.

## Setup

1. Create a Supabase project and run `supabase/migrations/20260909_beta_access.sql` in its SQL editor.
2. Create and verify a sending domain in Resend.
3. Add every variable from `.env.example` to the Vercel project. `SUPABASE_URL` may be either the project base URL or the Data API URL ending in `/rest/v1`. Use a current Supabase `sb_secret_...` key for `SUPABASE_SECRET_KEY`; the older `SUPABASE_SERVICE_ROLE_KEY` remains supported only for existing projects. Use a cryptographically random value of at least 32 characters for `BETA_SESSION_SECRET`.
4. Deploy once with `VITE_BETA_GATE_ENABLED=false`. Confirm `/beta-admin` can send an administrator code, list requests, and send an invitation.
5. Set `VITE_BETA_GATE_ENABLED=true` and redeploy to open the gated beta.

The gate is intentionally disabled when the build-time flag is absent or false. This prevents a deployment from locking the owner out before the database and email settings are ready.

When the flag is enabled, the generated service worker activates immediately and reloads controlled windows once so an older cached, ungated shell cannot linger after the beta launch.

## Security boundary

This is a controlled beta rather than DRM. The interface and authenticated session are gated, while static assets and third-party media URLs remain publicly addressable. Secrets, approval actions, and tester records stay server-side. All beta API responses are non-cacheable, and the service worker ignores beta API and administrator routes.
