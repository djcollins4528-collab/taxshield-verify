# TaxShield Verify public website
Static-only prelaunch information website. No live payments or personal-data intake.

## Render static site settings
- Service name: taxshield-verify
- Build command: `echo 'Static site ready'`
- Publish directory: `.`
- Branch: `main`
- Auto deploy: yes

Upload the three site files (`index.html`, `privacy.html`, `robots.txt`) to a new dedicated GitHub repository; then link that repo at Render > New > Static Site. The included render.yaml is a suggested blueprint and is not required when using the dashboard.