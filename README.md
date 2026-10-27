# Xplore Horizons Inc.

A light, responsive company website for **https://xplorehorizons.com**. GitHub Pages serves plain HTML, CSS, and JavaScript without a build step or runtime dependencies. Native on-site enquiries use an owner-deployed Google Apps Script backend; no credentials are embedded in the website.

## The thinking behind the site

- **Positioning:** "Less friction. More forward." Practical progress rather than vague AI promises.
- **Identity:** an original X/horizon logo, warm-white backgrounds, deep teal, sage, and orange. Local illustrations and system fonts; no stock photography, external fonts, or video downloads.
- **Six starting points:** tool adoption, AI-enabled workflows, new initiatives, AI economics, aligned consultants, and dependable platforms.
- **Differentiation:** director-led accountability, agent-assisted coordination, hands-on people, and ROTI (return on time invested), not a fabricated industry score.
- **Trust:** no invented clients, testimonials, certifications, savings, response guarantees, or market-ranking claims.
- **Conversion:** branded on-site forms for "Partner with us" and "Join our Workforce." No provider-branded iframe, external form redirect, or unverified success message.

The supplied [Loonie](https://loonie.ai) and [LocalAgents](https://localagents.ai) sites informed the outcome-first messaging. This company site has its own identity and does not claim ownership of those products.

## Preview and test

With Node.js 20 or newer:

```powershell
npm run dev
```

Open **http://127.0.0.1:4173**. The preview binds only to your machine; stop it with Ctrl+C. No install is needed for the preview.

For automated validation:

```powershell
npm ci
npx playwright install chromium
npm run check
npm test
```

Tests cover backend setup and validation, duplicate prevention and interrupted writes, native form success/error/retry flows, matching field schemas, responsive widths from 320 to 1440 pixels, navigation, no-JavaScript email fallback, analytics consent, reduced motion, and automated WCAG AA checks. Tests simulate Google services; they do not create live submissions or send analytics data.

There is no application build. Test dependencies are development-only.

## Connect the native enquiry forms

Follow the **[Google setup and deployment guide](google-apps-script/README.md)**. In your signed-in Edge browser:

1. Create a standalone project at [Google Apps Script](https://script.google.com/home/start).
2. Copy [google-apps-script/Code.gs](google-apps-script/Code.gs) into its `Code.gs` editor.
3. Run `setupXploreForms` and authorize your own script. It configures the two supplied Forms and creates two separate response spreadsheets.
4. Review access on both Forms and Sheets; keep response records private.
5. Deploy as a web app, **Execute as: Me**, **Who has access: Anyone**.
6. Paste the deployed `/exec` URL into [assets/config.js](assets/config.js):

```javascript
enquiryEndpoint: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
enquiryPrivacyVersion: "2026-10-27",
```

The URL is a public endpoint, not an API key. Do not paste form editor URLs, Sheet URLs, passwords, or OAuth credentials. A blank/invalid endpoint keeps sending disabled and displays the contact email.

Visitors remain on the website. The backend uses Forms and Sheets, disclosed in the privacy notice rather than branded into the form interface. A simple cross-origin POST must return readable JSON with the matching request reference before the site shows success. No `no-cors`, hidden-iframe, or timer-based success fallback is used.

The owner must verify a real browser submission and its record in **each** Form and linked Sheet after deployment. Automated tests cannot verify Google account permissions, actual CORS behavior, or deployment settings.

## Google Analytics 4

Configured in [assets/config.js](assets/config.js):

| Setting | Value |
| --- | --- |
| Stream name | Xplore Horizons Inc. Site |
| Stream URL | https://xplorehorizons.com |
| Stream ID | 16210405156 |
| Measurement ID | G-53C3364357 |

The measurement ID is a public identifier, not a secret.

- Analytics is off until accepted and does not load with JavaScript disabled.
- Only `xplorehorizons.com` and `www.xplorehorizons.com` load the tag. Local and `github.io` previews are excluded.
- Preferences are saved locally and can be changed in the footer. Denying after acceptance removes accessible first-party GA cookies and reloads the page to unload Google's runtime; previously received data is not deleted.
- Events: `page_view`, `contact_form_open`, and `contact_form_submit`. Form events contain only `audience: partner` or `audience: workforce`.
- Submission events fire only after confirmed recording. Unconnected forms, validation failures, and uncertain delivery do not count as submissions. Answers and enquiry references are not sent to Analytics.
- Advertising signals and personalization are disabled. Page URLs exclude queries and fragments; referrers are suppressed.

### GA admin setup

1. Confirm the correct web stream.
2. Under **Admin > Data streams > Xplore Horizons Inc. Site**, turn **Enhanced measurement OFF**, particularly automatic form interactions and history-based page tracking. The repository cannot change remote GA settings.
3. Review Signals, advertising links, access permissions, sharing, and retention.
4. On production, accept analytics and verify a page view in **Realtime**. Verify the form events after connecting the backend; allow processing time.
5. Optionally mark `contact_form_submit` as a key event. It means an enquiry was recorded, not that it became a qualified lead, placement, or contract.

The [privacy page](privacy.html) includes the owner's contact email and agreed 12-month initial-enquiry retention period. Reviewing and deleting records is an owner-operated process, not an automatic cleanup job. Consent alone is not a guarantee of legal compliance.

## Publish on GitHub Pages

1. Review, commit, and push the intended files to `main` in `harshbhalodia/xplorehorizons-com`. Do not add `node_modules`, test reports, or form responses.
2. Open **Settings > Pages**.
3. Choose **Deploy from a branch**, **main**, **/ (root)**.
4. [`.nojekyll`](.nojekyll) disables Jekyll; no Actions build is needed.
5. [CNAME](CNAME) contains `xplorehorizons.com`; confirm that custom domain in Pages settings.
6. Configure DNS and enable **Enforce HTTPS** after certificate issuance.

### DNS

Use the [current GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). GitHub lists these apex A records:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | harshbhalodia.github.io |

If supported, use an apex ALIAS/ANAME targeting `harshbhalodia.github.io` instead, following GitHub's instructions. Do not include a repository path in DNS. Preserve unrelated mail/TXT records, avoid wildcard DNS, and verify domain ownership in GitHub account settings.

```powershell
Resolve-DnsName xplorehorizons.com -Type A
Resolve-DnsName www.xplorehorizons.com -Type CNAME
```

For project-URL-only hosting, remove [CNAME](CNAME), clear the custom-domain setting, and update canonical URLs, social metadata, [robots.txt](robots.txt), [sitemap.xml](sitemap.xml), and the Analytics host allowlist. Relative site assets/navigation support repository subpaths.

## Editing

| File | Purpose |
| --- | --- |
| [index.html](index.html) | Home page and native form markup |
| [assets/styles.css](assets/styles.css) | Brand, responsive layout, form UI, reduced motion, and print styles |
| [assets/config.js](assets/config.js) | Enquiry endpoint, privacy version, and Analytics settings |
| [assets/site.js](assets/site.js) | Navigation, service explorer, consent, and analytics |
| [assets/forms.js](assets/forms.js) | Native validation, confirmed delivery, retry state, and dialogs |
| [google-apps-script/Code.gs](google-apps-script/Code.gs) | Owner-run form/Sheet setup and submission backend |
| [assets/logo.svg](assets/logo.svg) / [assets/favicon.svg](assets/favicon.svg) | Original X/horizon mark |
| [assets/horizon.svg](assets/horizon.svg) | Platform-pathway illustration |
| [assets/social-card.svg](assets/social-card.svg) / [assets/social-card.png](assets/social-card.png) | Editable artwork and 1200 x 630 social preview |
| [privacy.html](privacy.html) | Privacy notice |

After editing the social SVG, run `npm run render:social` with test dependencies and Chromium installed. Rendering uses local assets.

## Launch checklist

- [ ] Owner approves service claims, director/agent model, and public wording.
- [ ] Setup script configures the intended two Forms and separate Sheets.
- [ ] Response records stay private; contact and retention practices match the notice.
- [ ] Apps Script executes as the owner and accepts anonymous requests.
- [ ] The `/exec` endpoint is configured.
- [ ] Real submissions from both site forms are confirmed and appear in the correct Forms and Sheets.
- [ ] GA property settings and enhanced measurement are reviewed.
- [ ] `npm run check` and `npm test` pass.
- [ ] Domain, HTTPS, social sharing, and production GA receipt are verified.

This repository does not provision agents or a live support service. Running/authorizing/deploying the Google backend and changing Google account, DNS, or GA settings remain explicit owner actions.
