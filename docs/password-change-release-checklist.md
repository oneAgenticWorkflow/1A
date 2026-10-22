# Arcanam mandatory-password-change release checklist

Scope: `oneAgenticWorkflow/1A` only. Do not use production customer credentials or change another project's resources.

## Already completed
- Production migration `sync_mandatory_password_change_on_auth_password_update` installed on Arcanam Supabase project `jguporywgqhldyephwtu`.
- The trigger runs only when `auth.users.encrypted_password` actually changes.
- The frontend branch no longer calls `password_changed()` and no longer accepts a `changed` gate override.

## Pre-release
1. Run `node --check web/src/main.js`.
2. Run `node --test tests/password-change.test.cjs`.
3. In a staging environment, create a disposable candidate account with `profiles.must_change=true` and a temporary password. Verify its candidate case assignment.
4. Sign in and confirm the change-password screen appears and the dashboard is inaccessible.
5. Test a password shorter than eight characters and a mismatch: neither should proceed.
6. Test an Auth password-update error: dashboard remains inaccessible.
7. Enter a valid new password. Confirm `profiles.must_change=false` **only after** Supabase Auth changes the password; verify dashboard routing.
8. Sign out and sign in with the new password. Confirm the dashboard loads and the old password fails.
9. For a second disposable account, attempt the legacy RPC without updating its password. Until the RPC is revoked, this is a known bypass. Do not interpret frontend gating as server-side authorization.
10. Verify staff/admin and candidate login, including cross-case RLS isolation, on staging.

## Release order
1. Ensure the frontend hosting platform deploys the reviewed `main` branch and that rollback is available.
2. Merge the tested frontend PR; verify the deployed browser bundle no longer invokes `password_changed()`.
3. Re-run the disposable-account first-login tests against the deployed frontend.
4. Only **after** the new frontend is live, apply the follow-up database migration:
   `REVOKE ALL ON FUNCTION public.password_changed() FROM PUBLIC, anon, authenticated;`
   Optionally drop the function after confirming no other server-side consumers exist.
5. Confirm an authenticated client cannot execute `password_changed()`; confirm legitimate first-login still works.
6. Enable leaked-password protection in the Arcanam Supabase Auth dashboard if available on the plan.
7. Recheck Supabase security and performance advisors.

## Rollback
- Before RPC revocation: roll back frontend to the previous release if needed; the old flow still works.
- After RPC revocation: rolling back the frontend requires restoring the compatible RPC or deploying the new frontend again; avoid restoring the insecure RPC except as an emergency, time-limited measure.
- The database trigger should remain enabled unless it causes an independently verified Auth problem.

## Production safety
Do not run write-based RLS tests against live user cases. Use staging or disposable accounts. Never log or export password hashes.
