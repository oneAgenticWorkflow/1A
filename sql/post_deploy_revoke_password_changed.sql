-- Apply ONLY after the updated Arcanam frontend has been deployed and first-login tested.
-- This legacy RPC allows an authenticated user to clear must_change without updating a password.
-- Do not apply while the old frontend is in use: it still calls this RPC.
REVOKE ALL ON FUNCTION public.password_changed() FROM PUBLIC, anon, authenticated;
