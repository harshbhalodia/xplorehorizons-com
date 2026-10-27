# Set up on-site enquiries

Visitors fill in a branded form on xplorehorizons.com. They do not leave the page or sign into Google. This script records their submission in the two supplied Google Forms and linked Google Sheets, then returns a confirmation to the website.

**The script is prepared, not already deployed.** Running these steps requires the Google account that can edit both Forms.

## 1. Create your Apps Script project in Edge

1. Open [Google Apps Script](https://script.google.com/home/start) in your signed-in Edge browser.
2. Choose **New project**. Name it **Xplore Horizons - Enquiry service**.
3. Open this repository's [Code.gs](Code.gs), copy its entire contents, and replace the default `Code.gs` contents in the browser.
4. Save the project. Keep the default V8 JavaScript runtime.
5. From the function dropdown, select **setupXploreForms**, then **Run**.
6. Review and authorize your own script to manage the intended Forms and create/access response spreadsheets. Do not share your password, verification code, or tokens. If Workspace policy blocks the permissions or anonymous deployment, stop and ask your administrator rather than making response files public.

The script targets only these form IDs:

| Website path | Existing form |
| --- | --- |
| Partner with us | `1bCjbc7Z2lcjaiRRaXjgUBdAe69IQag_U1k_ZOgdyg5I` |
| Join our Workforce | `1fzI4Wg4-xm86QiqFd4vFjTIie7PMXLS2LONrnuQR0FE` |

It sets the titles, questions, choices, required fields, privacy description, and response destinations. It disables response summaries and response editing, avoids account-verified email collection, and enables responses.

It creates:

- **XH - Partnership enquiries**
- **XH - Workforce interest**

Each spreadsheet has a **Website delivery** tab for delivery references, request fingerprints, and confirmation status. Google adds its response tab for the form answers.

The execution log prints both spreadsheet URLs. **Save these URLs privately.** You do not need to put Sheet or form editor links in the public website configuration.

Setup is rerunnable in the **same script project**: saved Script Properties preserve IDs and question mappings, avoiding duplicate Sheets/questions. Do not clear those properties, duplicate the script project, or rerun from another account. Setup stops rather than overwriting existing responses, unexpected questions, or a changed response destination. It only removes an untouched, empty/default question in a new form.

## 2. Review privacy and permissions

For both Forms and both Sheets:

- Keep editor access limited to you and specifically authorized people.
- Check **Share > General access** on the Sheets; keep it **Restricted**. Do not publish the spreadsheets or share response summaries publicly.
- Responder access to a Form is not permission to view its answers. Review these separately.
- Use multifactor authentication on the owner account.
- The public contact is **harshkumar.bhalodia@gmail.com**.
- Initial enquiries and their delivery records are retained **12 months after the last enquiry interaction**, subject to separate relationship/legal requirements.
- Implement a periodic manual retention review. Track follow-up dates separately from the delivery tab; its timestamp is not a last-interaction tracker.
- Delete expired records from the Form, its response Sheet, and the delivery tab. Deleting one copy does not delete the others.

The script does not automatically enforce retention or remove existing collaborators. Confirm that the actual settings and working practices match [the privacy notice](../privacy.html).

## 3. Deploy the service

1. In Apps Script, choose **Deploy > New deployment**.
2. Select the gear/type menu, then **Web app**.
3. Description: **Xplore Horizons enquiry service v1**.
4. **Execute as:** Me (the account that owns/edits the Forms and Sheets).
5. **Who has access:** Anyone. This is the submission endpoint's access, **not public access to your Sheets**.
6. Click **Deploy** and complete any owner authorization.
7. Copy the **Web app URL**, ending in `/exec`.

The URL looks like:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Do not copy the `/dev` test URL, script editor URL, deployment ID alone, or a Forms responder link.

Open the `/exec` URL in a signed-out/private browser window. It should show:

```json
{"service":"xh-enquiries","version":"2026-10-27","ready":true}
```

If it asks you to sign in or shows `ready: false`, fix access/setup before connecting the website.

## 4. Connect the website

Paste the public `/exec` URL into [assets/config.js](../assets/config.js):

```javascript
enquiryEndpoint: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec",
enquiryPrivacyVersion: "2026-10-27",
```

The privacy version must match `XH.version` in [Code.gs](Code.gs). The endpoint is intentionally public, not a secret. No API key belongs in the static website.

The site validates the endpoint format. A missing or invalid endpoint disables sending and provides an email alternative rather than pretending to collect enquiries.

## 5. Verify the actual integration before launch

1. Open the site over HTTP locally or HTTPS on production, not `file://`.
2. In a private browser session, submit a clearly labelled test partnership enquiry. Use an email address you control and non-sensitive test text.
3. Confirm that the site stays on its own page and shows a success receipt with an enquiry reference.
4. In the partnership Form, find the response. In its linked Sheet, confirm both the answer row and the `confirmed` delivery row. The automatically linked response tab may update shortly after the Form itself.
5. Repeat with the workforce form and its separate Sheet.
6. Check that you never see the other path's answers in the wrong Sheet.
7. Test a network failure without inventing a second enquiry. The website must say delivery is unconfirmed, not successful.
8. Delete your test entries from Forms, response Sheets, and delivery tabs after verification. Do not leave a pending browser retry open after manually deleting its tracking record.

**Mocks passing is not live verification.** Apps Script permissions, quotas, browser cross-origin response behavior, deployment versions, and Form-to-Sheet linking must be checked using your deployment.

## How confirmed delivery works

- The browser sends a simple `application/x-www-form-urlencoded` POST containing one JSON `payload`. There are no personal details in a query string.
- No authorization header or JSON content-type is added, avoiding an unsupported preflight request.
- Apps Script ContentService redirects its response through Google's content host. The browser follows the redirect and must be allowed to read the JSON response.
- The server validates names, email, field types/lengths, allowed choices, consent, privacy version, and an empty honeypot. It rejects unknown fields and neutralizes spreadsheet formula prefixes in text responses.
- A script lock serializes writes. A private delivery record is written before submitting the Form.
- Success is returned only after Google supplies a Form response ID and the delivery record is confirmed.
- A network error or unreadable/mismatched reply never produces a success message. The current-page draft and reference remain available for a retry.
- A retry with the same reference and payload returns the existing confirmation rather than creating another response.
- If a run was interrupted, the server looks for the corresponding Form response. If found, it reconciles the delivery record. If not found, it returns `pending` and **does not risk a second write**.
- A confirmed response may appear in its automatically linked Sheet after a short synchronization delay. The confirmation means the Form recorded the enquiry, not that a human read it.

Do not replace this with `mode: "no-cors"`, a hidden iframe, or a timer that assumes success. Those approaches cannot provide a trustworthy confirmation.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Sign-in prompt on `/exec` | Deploy as **Me**, access **Anyone**; check Workspace policy |
| `ready: false` | Run `setupXploreForms` successfully in this same project |
| Unexpected questions/responses during setup | Stop and inspect the two intended Forms; do not delete real responses to get past the guard |
| CORS, HTML instead of JSON, or a failed fetch | Verify the `/exec` URL and anonymous access. Redeploy the intended version. Keep the site's uncertain-delivery message; don't add a false-success fallback |
| No response Sheet tab yet | Verify the Form's linked destination and make one controlled test submission |
| `busy` | Retry in a moment; that attempt did not acquire the write lock |
| `pending` or repeated unconfirmed delivery | Find the reference in **Website delivery** and in Form responses; inspect Apps Script Executions |
| `conflict` | The reference was reused with different data. Investigate rather than forcing a new reference |
| Questions, destinations, or choice values were edited | Keep the site markup, validation schema, and stored item mappings aligned; don't delete/recreate mapped questions |

For a pending request, verify whether a Form response already exists. If it does, retrying with the original payload lets the script reconcile it. If it does not, contact the sender and handle the enquiry manually; don't automatically delete the pending guard and resubmit. This deliberately favors avoiding duplicates over pretending to guarantee exactly-once delivery across separate Google services.

The endpoint is anonymous. A honeypot and validation deter basic junk; they are not authentication or a hardened anti-abuse system. Google quotas and outages still apply. Monitor execution failures and submission volume. If abuse or traffic grows, introduce a properly verified anti-bot service or a managed API with rate limiting before relying on this for higher-volume intake.

## Updating the deployed code

After changing [Code.gs](Code.gs), paste the change into the same project, save, then choose **Deploy > Manage deployments > Edit > New version > Deploy**. Updating the editor alone does not update an existing versioned web app. Preserve the deployment URL, Script Properties, and delivery tab schema.

For a changed privacy notice, update the date/version in the website config, backend, and notice together; redeploy the backend and test before publishing the frontend.

References: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [ContentService responses and redirects](https://developers.google.com/apps-script/guides/content), [Form responses](https://developers.google.com/apps-script/reference/forms/form-response), and [Form response destinations](https://support.google.com/docs/answer/2917686?hl=en).
