# OneA Pathway Portal

A private case workspace with an advisor (admin) view and a candidate view.

- Advisors control every step. Candidates see and update only their own case.
- Hosting: static site on GitHub Pages. Data and sign-in: Supabase.
- Database setup: run the files in `supabase/migrations` in order.
- Site settings: `web/config.js` holds the public project URL and public key.
