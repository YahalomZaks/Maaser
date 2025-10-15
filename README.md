# maasroti

A multilingual Next.js application for tracking income and donations in accordance with the maaser (tithing) practice. The platform combines onboarding flows, dashboards, activity logging, and Better Auth powered authentication.

## Getting Started

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy the environment template (create `.env.local`) and provide the required values:

   ```env
   # Required by Better Auth
   BETTER_AUTH_SECRET=replace-with-random-secret
   DATABASE_URL=postgresql://user:password@localhost:5432/maaser

   # Google OAuth (server-side)
   GOOGLE_CLIENT_ID=933193308421-7jap8aqsdon02np36j6dt60dlkk8qrl1.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=replace-with-google-client-secret

   # Google OAuth (client-side)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=933193308421-7jap8aqsdon02np36j6dt60dlkk8qrl1.apps.googleusercontent.com

   # Optional: public app URL used by auth-client fallbacks
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Generate the Prisma client:

   ```powershell
   npx prisma generate
   ```

4. Run the development server:
   ```powershell
   npm run dev
   ```

## Google Sign-In Flow

- The backend is configured via Better Auth to request the `openid`, `profile`, and `email` scopes so that the full name and email are stored when a user signs in with Google. First-time sign-ins automatically create a user account.
- The `SocialLogin` component renders a Google button only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is provided, and it displays translated feedback during the flow.
- After a successful login (or sign-up) the user is redirected to `/dashboard`.

## Internationalisation

All user-facing strings are managed with `next-intl` (`/locales/en.json` and `/locales/he.json`). New strings for the Google workflow have been added under the `auth.social` namespace to keep Hebrew and English in sync.

## Testing the Flow

After configuring the environment variables:

1. Start the dev server (`npm run dev`).
2. Navigate to `/signin` or `/signup`.
3. Use "Continue with Google" to authenticate. New Google users will be created automatically; returning users sign straight in.

If the button is not visible, double-check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is defined before rebuilding the app.
