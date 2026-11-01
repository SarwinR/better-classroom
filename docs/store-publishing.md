# Automated Chrome and Edge publishing

The release workflow can now build a ZIP and submit it to Chrome Web Store, Edge Add-ons, or both. Store review/certification still applies. A successful submission is not a guarantee that users already have the new version.

## One-time configuration

Add the following in this repository's **Settings → Secrets and variables → Actions**. Never put credentials in source files, issue/PR comments or chat.

| Name | Type | Source |
| --- | --- | --- |
| `CHROME_EXTENSION_ID` | Variable | Existing store listing: `maibneeahfkanhakkogkbcakcadjejkl` |
| `CHROME_PUBLISHER_ID` | Variable | Chrome Web Store developer dashboard publisher account |
| `CHROME_CLIENT_ID` | Secret | Google Cloud OAuth client |
| `CHROME_CLIENT_SECRET` | Secret | Same OAuth client |
| `CHROME_REFRESH_TOKEN` | Secret | Offline OAuth authorization from the Google account that owns the listing |
| `EDGE_PRODUCT_ID` | Variable | Partner Center extension overview GUID; **not** the public extension ID |
| `EDGE_CLIENT_ID` | Secret | Partner Center → Microsoft Edge → Publish API |
| `EDGE_API_KEY` | Secret | Same Publish API page, using the current API-key experience |

For Chrome, enable the Chrome Web Store API in your Google Cloud project, configure an OAuth client/consent screen, and obtain a refresh token with `https://www.googleapis.com/auth/chromewebstore` using the owning developer account. Follow the [official setup guide](https://developer.chrome.com/docs/webstore/using-api). Use a durable OAuth configuration; Google's testing-mode OAuth setup can issue short-lived refresh tokens. This implementation uses OAuth refresh credentials, not service-account JSON keys.

For Edge, enable the current Publish API and generate the client ID/API key in [Partner Center](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api). Record the key's expiry and rotate it before then; Microsoft documents a [72-day key lifetime](https://blogs.windows.com/msedgedev/2025/01/08/enhanced-security-for-extensions-with-publish-api-next-steps/). The retired bearer-token flow is not used.

You only need to configure the store(s) you select. The build-only option works without store credentials. Adding credentials enables GitHub Actions to submit updates to the corresponding publisher accounts; review who can modify/run workflows and access repository secrets.

## Build and publish a new version

1. Merge the intended extension changes and this workflow into `main`.
2. Open **Actions → Build extension release → Run workflow** on `main`.
3. Choose the version bump and `stores`: `none` (build only, the default), `chrome`, `edge`, or `both`.
4. The workflow checks selected-store configuration and runs all tests before bumping, building, tagging and creating the GitHub Release. It then uploads that exact release ZIP to the selected stores and submits for review.
5. Check each store job's summary and its dashboard for review/certification and eventual public availability. Chrome retains existing visibility/rollout settings; publishing is blocked on API validation warnings. This workflow does not skip review, change visibility, update listing text, or create new store listings.

Each store has its own concurrency lock. Chrome and Edge jobs run independently: a failure in one does not cancel the other. This is not an atomic two-store release; one store may publish while the other fails or remains in review.

## Retry a failed store without another version bump

Use **Actions → Publish existing release to stores → Run workflow** on `main`. Enter the existing tag (for example `v1.1.9`) and select only the failed store. The workflow accepts stable published GitHub releases whose tag is an ancestor of `main`. It verifies the downloaded ZIP's SHA-256 against GitHub's asset digest and checks its manifest against the tagged manifest/version before any store upload.

Chrome skips a version already published or pending/staged and refuses to overwrite a different version pending review. Edge has no equivalent current-submission query in this implementation: before retrying Edge after a timeout or ambiguous API response, check Partner Center and confirm the earlier request did not already submit it. Operation IDs are recorded in job summaries. Mutating HTTP requests are not automatically retried, and the workflow does not cancel existing submissions. Edge may reject an already-submitted or older package.

The script polls each processing operation for up to ten minutes. A timeout requires checking the provider dashboard; it does not mean that the submission was cancelled. A Chrome result of `PENDING_REVIEW` or an Edge processing success is reported as such, never as proof of public availability.

## Validation and limits

Run `npm ci --ignore-scripts`, `npm test`, and `npm run validate`. Publishing tests use mocked HTTP responses and do not contact either store. The publisher adds no runtime extension dependencies and no new extension permissions. Store credentials are only used by the workflow's publishing/configuration steps. HTTP errors do not print response bodies or credentials, and redirects are refused.

The automation has not been live-tested until the required credentials are configured and an authorized release is submitted. No release or store submission is triggered by opening or merging its PR; all entry points are manual.
