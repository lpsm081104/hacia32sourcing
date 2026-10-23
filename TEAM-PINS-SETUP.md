# Connect shared “Reached out” pins

School searching works without this setup. Shared pins require a Supabase project. Pins are private to signed-in team members. This feature marks a school as already contacted; it does not send outreach.

1. Create a free project at https://supabase.com/dashboard. Keep the database password private.
2. Open the project's **SQL Editor**, create a query, paste the contents of [supabase/team-pins.sql](supabase/team-pins.sql), and run it. This creates the tables and access policies. Run this before connecting the site.
3. Under **Authentication → Users**, create a user for each teammate, including yourself. Use the dashboard's create-user option with a confirmed email and password. Share each initial password privately with its owner, never in the repository or this chat. The site has no public signup. You may also disable new-user signups in the project's authentication settings.
4. Copy each user's UUID from Authentication → Users. In **Table Editor → team_members**, insert a row with that UUID in `user_id`. Creating an auth account alone does not grant access. Only the project owner should manage this table; do not weaken the access policies.
5. Find the project URL and **publishable** key in the project's Connect dialog or API settings. A legacy **anon** key also works. These two values are intended for browser use with row-level security. Never use a **secret** or **service_role** key.
6. Edit `team-config.mjs`: put the project URL in `url` and the publishable key in `publishableKey`. Commit the file to `main`; GitHub Pages redeploys it. The URL must be `https://<project-ref>.supabase.co`.
7. Open the website, select **Team pins**, and sign in with your team account. Search a city and select **Mark reached out** on a school. A pin means someone on the team has contacted that school. Selecting it again asks for confirmation before removing it.
8. In a second browser or device, sign in as another team member and check that the same school is pinned. Select **Refresh pins** to see updates immediately; the page also refreshes once per minute while visible. Confirm that a user without a membership row cannot access pins. Do this before claiming the shared feature is ready.

Sessions are held in memory and expire when the page reloads or closes; sign in again then. Passwords are submitted only to your Supabase project and are never saved by the app. If the service cannot load the complete pin list, it disables pin changes and shows an error rather than treating schools as uncontacted. An unpinned school means no shared pin is recorded, not proof that nobody has contacted it. Pins apply to the particular OpenStreetMap object; separately mapped objects for the same campus may have different pins.

The browser needs HTTPS access to the project's hostname. The cloud workspace's network settings must also allow that hostname to run live integration checks here. The current onboarding draft does not include an unknown future project hostname.
