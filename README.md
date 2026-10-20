# OneA Pathway Portal

A private workflow application, fully outside Claude's website.

* **Admins** (you and anyone you add) run everything: create candidates, move cases forward, review forms, run the Claude analysis steps, add ad-hoc tasks, request documents.
* **Candidates** sign in by emailed link, see **only their own case**, fill in forms, upload documents and send messages. They **cannot** advance a case, change a task, or see scores, red flags or other candidates. This is enforced by database rules (Postgres row level security), not just by hiding buttons.
* Onboarding a candidate creates the whole workflow: 49 tasks across 9 stages. Steps unlock automatically as earlier ones finish; the two gates (FOE lock, attorney approval) wait for an admin.

Screening aid only, not legal advice.

## What you need (all free tiers are enough to start)
1. A [Supabase](https://supabase.com) account (database, login, private file storage)
2. This repository on GitHub (it hosts the website for free with GitHub Pages)
3. An Anthropic API key, only if you want the Claude analysis steps

## One-time setup (about 20 minutes)

### 1. Create the database
1. Supabase → **New project**. Choose a region near you and save the database password.
2. **SQL Editor → New query**, paste all of `supabase/migrations/001_schema.sql`, click **Run**.
3. **Authentication → Providers → Email**: keep it on. Turn **off** "Confirm email" only if sign-in emails are slow; the one-time link already proves the address.
4. **Authentication → URL Configuration**: set **Site URL** to your website address (step 3 below) and add it under **Redirect URLs**.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

### 2. Put your keys in the website
Edit `web/config.js` and paste the two values. The anon key is designed to be public; the database rules protect the data.

### 3. Publish the website
1. Push this repo to GitHub.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` (or run the "Deploy website" workflow). Your site appears at `https://<you>.github.io/<repo>/`.
   To use your own domain, add it under Settings → Pages and point a CNAME record to `<you>.github.io`.

### 4. Make yourself the first admin
1. Open your website, enter your email, click the emailed link once (this creates your account).
2. Supabase → **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
   ```
3. Reload the site. You now see the admin screens. To add another admin, repeat step 4 for their email.

### 5. Turn on the Claude steps (optional)
```bash
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy claude
```
Only admins can call this function. Optional secrets: `CLAUDE_MODEL_COMPLEX`, `CLAUDE_MODEL_DEFAULT`.

## Day-to-day
1. **New candidate** → name and email. The workflow is created and the welcome-call task is open.
2. **Copy invite message** on the case page, send it to the candidate. They sign in with that email.
3. Work the **Tasks** tab (list, board, timeline). Review each submitted form; mark it reviewed to unlock the next step.
4. **Documents** tab: request documents; candidates upload into private storage; you open them with a short-lived link.
5. Use **View as candidate** to see exactly what they see.

## Access rules (tested)
`tests/run_sql_tests.sh` applies the migration to a throwaway Postgres and checks that a candidate cannot read other cases, read their own scorecard, complete or create tasks, mark a form submitted or reviewed, edit after submitting, or upload into another case's folder; and that an uninvited account sees nothing. Run it after any change to the SQL.

## Known limits
* Advisor-only fields inside a form (for example the verified journal on an article idea) and Claude's article screening scores are stored with the form answers. The candidate screen hides them, but a technically skilled candidate calling the API directly could read them. Keep private judgments in the admin notes, or ask for these to be moved to an admin-only table.
* Candidate sign-in emails come from Supabase's built-in mailer, which is rate limited. For many candidates, add your own SMTP provider in Supabase → Authentication → SMTP.
* Deleting a case removes its tasks, answers, notes, document records and files.
* No automatic emails to candidates yet; use the invite message and your normal email.
