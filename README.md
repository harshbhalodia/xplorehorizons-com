# Xplore Horizons Inc.

A light, responsive company website for **https://xplorehorizons.com**. Plain HTML, CSS, and JavaScript; no production dependencies, build step, database, API keys, or server required. GitHub Pages serves the files directly.

## The thinking behind the site

- **Positioning:** "Less friction. More forward." Practical progress rather than vague AI promises.
- **Identity:** an original X/horizon logo, warm-white backgrounds, deep teal, sage, and a restrained orange accent. All illustrations are original local SVGs; no stock photography, external fonts, or video downloads.
- **Six starting points:** tool adoption, AI-enabled workflows, new initiatives, AI economics, aligned consultants, and dependable platforms.
- **Differentiation:** director-led accountability, agent-assisted coordination, hands-on people, and ROTI (return on time invested). ROTI is a jointly defined set of outcome indicators, not a fabricated industry score.
- **Trust:** no invented clients, testimonials, certifications, savings, response guarantees, or market-ranking claims. Around-the-clock agent support is distinguished from contracted human coverage.
- **Conversion:** two clear paths, "Partner with us" and "Join our Workforce." The unconfigured state explicitly says no information was submitted.
- **Performance:** local assets, system fonts, a short reduced-motion-aware entrance animation, and no third-party connections before analytics consent or an external link click.

The two supplied sites, [Loonie](https://loonie.ai) and [LocalAgents](https://localagents.ai), informed the practical, outcome-first messaging. This company site has its own visual identity; it does not claim ownership of those products.

## Preview and test

With Node.js 20 or newer:

```powershell
npm run dev
```

Open **http://127.0.0.1:4173**. The preview server binds only to your local machine. Press Ctrl+C to stop it. No install is needed for the preview.

For automated tests:

```powershell
npm ci
npx playwright install chromium
npm run check
npm test
```

Tests cover responsive widths from 320 to 1440 pixels, assets and anchors, service tabs and keyboard controls, mobile navigation, placeholders, configured and invalid form links, no-JavaScript behavior, FAQs, consent storage, production-only analytics, analytics withdrawal, reduced motion, and automated WCAG AA checks. Analytics tests stub Google requests: they send no analytics data.

There is no application build to run. Test dependencies are development-only.

## Connect the two Google Forms

The only link settings you need are in [assets/config.js](assets/config.js):

```javascript
partnerFormUrl: "",
workforceFormUrl: "",
```

Replace each empty string with your **published responder URL**. Supported formats:

```javascript
partnerFormUrl: "https://docs.google.com/forms/d/e/YOUR_PARTNER_FORM_ID/viewform",
workforceFormUrl: "https://forms.gle/YOUR_WORKFORCE_SHORT_LINK",
```

The values above illustrate the format; they are not real forms. Do not paste a Google Sheets URL, a form editor `/edit` URL, a secret, or a service-account key. The configuration is public. The site validates the URL format, but you must test the form's permissions and actual availability.

Every corresponding button updates from this one file. Connected forms open in a new tab with an accessible announcement. Blank links show a coming-soon dialog. Invalid links log a configuration error and show an unavailable message rather than sending visitors somewhere unexpected.

### 1. Create "Partner with Xplore Horizons"

1. Open [Google Forms](https://forms.google.com) with a company-controlled account and choose **Blank form**.
2. Title: **Partner with Xplore Horizons Inc.**
3. Description: "Tell us what you want to move forward. Share only high-level information, not credentials or confidential project material."
4. Suggested questions:

| Question | Type | Required? |
| --- | --- | --- |
| Your name | Short answer | Yes |
| Work email | Short answer with email validation | Yes |
| Company / organization | Short answer | Yes |
| I'm interested as a... | Multiple choice: Client, Delivery partner, Other | Yes |
| What can we help with? | Checkboxes: New tool, AI workflows, New project, AI costs, Consulting team, Platform reliability, Other | Yes |
| What outcome are you working toward? | Paragraph | Yes |
| Current environment | Checkboxes: Cloud, On-premises, Hybrid, Not sure | No |
| Desired timing | Multiple choice: Exploring, This quarter, Defined deadline | No |
| Budget range or commercial context | Short answer | No |
| Anything else useful for a first conversation? | Paragraph | No |
| Permission to respond | Required checkbox with the consent text below | Yes |

Suggested permission text: "I agree that Xplore Horizons Inc. may use these details to respond to this enquiry. I have read the privacy notice."

Include the website's [privacy notice](https://xplorehorizons.com/privacy.html), a real monitored privacy contact, the purpose of collection, who has access, and your chosen retention period in the form description. Have the owner review the wording and operational process before launch; this starter website is not legal advice.

### 2. Create "Join the Xplore Horizons Workforce"

Create a separate form titled **Join the Xplore Horizons Workforce**.

| Question | Type | Required? |
| --- | --- | --- |
| Your name | Short answer | Yes |
| Email | Short answer with email validation | Yes |
| Country / region and time zone | Short answer | Yes |
| Type of opportunity | Multiple choice: Employee, Independent contractor, Either | Yes |
| Areas of strength | Checkboxes: AI/ML, Automation, Cloud, On-premises, Platform engineering, Security, Observability, Solution design, Other | Yes |
| A problem you enjoyed solving | Paragraph | Yes |
| Availability | Short answer | No |
| LinkedIn / portfolio / GitHub URL | Short answer | No |
| What would you like to learn or build next? | Paragraph | No |
| Permission to respond | Required checkbox with purpose-specific permission text | Yes |

Keep this a low-friction expression of interest. Do not request government IDs, birth dates, banking details, confidential code, or previous employers' documents. Avoid file uploads initially: they can require a Google sign-in. If recruiting later requires resumes or additional information, establish an appropriate retention and access process first.

### 3. Configure privacy, access, and confirmation

For **each** form:

1. Under **Settings**, avoid **Limit to 1 response** if you want visitors to respond without a Google sign-in.
2. If you collect emails using Google's built-in setting, use responder input rather than verified-account collection when public, sign-in-free access is intended. Do not also ask for the same email twice.
3. Keep **View results summary** OFF. Public response summaries can expose applicants' or clients' answers.
4. Do not enable quizzes, public response access, or unnecessary uploads.
5. Set an honest confirmation message, for example: "Thank you. Your enquiry has been recorded. We will review it and contact you when we have a relevant next step." Do not imply instant human support or a guaranteed job.
6. Restrict editor access to the directors or designated people who actually need it. Enable account multifactor authentication.

### 4. Send responses to Google Sheets

1. Open the form's **Responses** tab.
2. Click the green **Link to Sheets** icon (or use the response destination menu).
3. Choose **Create a new spreadsheet**, such as `XH - Partnership enquiries` or `XH - Workforce interest`.
4. Keep the spreadsheet private. **Do not publish it to the web** or turn on "Anyone with the link" access.
5. In the Responses menu, optionally enable email notifications for new responses.
6. Review access on **both the form and the spreadsheet**. Permission changes do not necessarily synchronize.
7. Set a recurring review/deletion process. Deleting a response in Forms does not automatically delete its separate copy in Sheets.

### 5. Publish, copy, and verify

1. Click **Publish**, then manage responder access. Choose **Anyone with the link** for a public enquiry form, if your Workspace policy permits it.
2. Copy the published responder link. You may use Google's **Shorten URL** option.
3. Put the links into [assets/config.js](assets/config.js).
4. Open each link in a private/incognito window while signed out. Confirm the right people can respond and that no editor or response access is exposed.
5. Submit a clearly labelled test enquiry and verify it arrives in the correct private spreadsheet.
6. Test all site buttons and remove the test response from Forms and Sheets separately.

Google's current instructions: [Publish and share forms](https://support.google.com/docs/answer/2839588?hl=en) and [Choose where to save responses](https://support.google.com/docs/answer/2917686?hl=en).

## Google Analytics 4

Configured in [assets/config.js](assets/config.js):

| Setting | Value |
| --- | --- |
| Stream name | Xplore Horizons Inc. Site |
| Stream URL | https://xplorehorizons.com |
| Stream ID | 16210405156 |
| Measurement ID | G-53C3364357 |

The measurement ID, not the numeric stream ID, is used by the browser tag. It is a public identifier, not a credential.

- Analytics is **off until accepted** and does not load with JavaScript disabled.
- Only `xplorehorizons.com` and `www.xplorehorizons.com` load the tag. Local previews and the `github.io` address are excluded.
- Preferences are stored locally and shared between pages on the same origin. They can be changed from the footer.
- Denying after acceptance removes accessible first-party `_ga` cookies and reloads the page to unload the Google runtime. Previously received data is not deleted.
- Tracked events: `page_view` and `contact_form_open`, with the latter's `audience` set to `partner` or `workforce`.
- No custom event is sent for a coming-soon placeholder. The website cannot know whether an external Google Form was submitted, so a click is **not** a submitted lead.
- Advertising signals and personalization are disabled. Page URLs exclude query strings and fragments; referrers are suppressed.

### GA admin setup before launch

1. Confirm the above web stream exists in the correct GA property.
2. Under **Admin > Data streams > Xplore Horizons Inc. Site**, turn **Enhanced measurement OFF** for the intended minimal collection. In particular, do not enable automatic form interaction or history-based page tracking. These are remote property settings the repository cannot change.
3. Review Google Signals, data sharing, retention, access permissions, and any advertising links. Align them with your actual privacy notice and obligations.
4. Visit production, accept analytics, and verify a page view in **Realtime**. Test a configured CTA if you want to verify `contact_form_open`; expect processing delays.
5. Do not promise a form-submission conversion without a separate, privacy-reviewed integration.

The included [privacy page](privacy.html) describes this implementation. Before accepting enquiries, ensure each form has a real contact and retention details and update the notice to reflect actual practices. Cookie consent alone is not a guarantee of legal compliance.

## Publish on GitHub Pages

1. Review the site and commit/push the intended files to `main` in `harshbhalodia/xplorehorizons-com`. Do not add `node_modules`, local test reports, or form responses.
2. In the repository, open **Settings > Pages**.
3. Choose **Deploy from a branch**, then **main** and **/ (root)**. Save.
4. The [`.nojekyll`](.nojekyll) file disables Jekyll processing; no GitHub Actions build is required.
5. The [CNAME](CNAME) file contains `xplorehorizons.com`. Confirm the same custom domain in Pages settings.
6. Configure DNS and enable **Enforce HTTPS** after GitHub issues the certificate.

### DNS for xplorehorizons.com

Prefer the [current GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). At the time these instructions were prepared, GitHub lists the following apex A records:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | harshbhalodia.github.io |

Alternatively, if your provider supports apex ALIAS/ANAME records, follow GitHub's instructions to target `harshbhalodia.github.io`. Do not include a repository path in a DNS record. Preserve unrelated mail/TXT records, avoid wildcard DNS, and verify domain ownership through GitHub's account settings.

In PowerShell you can inspect propagation with:

```powershell
Resolve-DnsName xplorehorizons.com -Type A
Resolve-DnsName www.xplorehorizons.com -Type CNAME
```

To host only at the project URL instead, remove [CNAME](CNAME) and clear the Pages custom-domain setting. Relative navigation/assets work under a repository subpath, but update canonical URLs, Open Graph metadata, [robots.txt](robots.txt), [sitemap.xml](sitemap.xml), and the Analytics hostname allowlist to match the intended production address.

## Editing the site

| File | Purpose |
| --- | --- |
| [index.html](index.html) | Home page content, services, FAQs, and CTAs |
| [assets/styles.css](assets/styles.css) | Colors, layouts, responsive rules, reduced motion, print styles |
| [assets/config.js](assets/config.js) | Google Forms URLs and Analytics settings |
| [assets/site.js](assets/site.js) | Progressive enhancement, navigation, service explorer, consent, and CTAs |
| [assets/logo.svg](assets/logo.svg) / [assets/favicon.svg](assets/favicon.svg) | Original X/horizon mark |
| [assets/horizon.svg](assets/horizon.svg) | Original platform-pathway hero illustration |
| [assets/social-card.svg](assets/social-card.svg) | Editable social-sharing artwork |
| [assets/social-card.png](assets/social-card.png) | Browser-compatible 1200 x 630 social preview |
| [privacy.html](privacy.html) | Website privacy notice |

After editing the social artwork, run `npm run render:social` with test dependencies and Chromium installed to regenerate the PNG. Rendering uses local assets only.

## Launch checklist

- [ ] Company owner approves the service scope, director/agent model, and public wording.
- [ ] Both Forms are published and tested while signed out.
- [ ] Each form identifies a real privacy contact, purpose, retention, and access process.
- [ ] Sheets and Forms response access stay private.
- [ ] The two URLs are set in [assets/config.js](assets/config.js).
- [ ] GA enhanced measurement and privacy-related property settings are reviewed.
- [ ] `npm run check` and `npm test` pass.
- [ ] Domain DNS, GitHub Pages, HTTPS, and social-sharing preview work on production.
- [ ] Actual GA receipt and actual form-to-sheet submissions are verified by the owner.

This repository does not provision agents, connect a live support service, create Google Forms, or make DNS/GA account changes. Those remain explicit operational steps.
