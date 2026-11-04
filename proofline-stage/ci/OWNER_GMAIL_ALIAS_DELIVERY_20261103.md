# Owner-controlled test mailbox routing — November 3, 2026

**Routing verified with the user's connected Gmail inbox. Supabase signup NOT performed.**

- Collector alias: `djcollins4528+proofline-collector-test@gmail.com`.
- Reviewer alias: `djcollins4528+proofline-reviewer-test@gmail.com`.
- Separate benign delivery-check messages were sent from the connected Gmail account; Gmail search returned each message addressed to its corresponding alias.
- Email delivery is **not** proof of two distinct Supabase Auth accounts or validated sessions.
- No new mailbox or domain subscription was required.
- Pure reusable policy `proofline-stage/ci/test_mailbox_policy.mjs` ensures different role-tagged addresses with the same owner base, explicitly supplied `PROOFLINE_OWNER_EMAIL`, and guards unrelated addresses.
- The signup, enrollment, and live-auth scripts on `main` still accept only prefix-style addresses; **the alias policy is not yet integrated** and should not be used to claim signup readiness. Repository authorization guard blocked credential-script edits. We did not bypass it.
- No user passwords or Supabase credentials were created, changed, or stored.
- Protected test infrastructure remains sealed; no customer intake or payments enabled.

Before actual account creation, safely integrate owner aliases into both signup and enrollment validation through an approved code-review/editing workflow, then execute the official signup with independently stored strong passwords, confirm both aliases via Gmail, enroll distinct subjects, and run the already implemented live Auth acceptance.
