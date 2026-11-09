# Monthly Budget Cards

A GitHub Pages-friendly monthly expense tracker inspired by the cards and light/dark theme of live-score-cards. Sign in with an email and password, set separate monthly budgets for food, groceries, coffee, and movies, and add or delete expenses. Amounts are in USD. Budgets are independent per month; an unset budget is different from a zero budget.

## Required setup

GitHub Pages hosts only static files. Firebase Authentication and Cloud Firestore provide accounts and private, cross-device storage. **The site cannot sign users in or save data until these steps are complete.** Firebase usage is subject to its quotas and pricing.

1. Create a Firebase project and register a web app in the [Firebase console](https://console.firebase.google.com/). Copy its web configuration values into `config.js`. These values are public identifiers, not credentials: never put a service account key or other secret in this repository.
2. In Authentication, enable the **Email/Password** sign-in provider. Under Authentication settings, add the GitHub Pages hostname (for example `ravi-kiran-agarthi.github.io`) to authorized domains. For local testing, add `localhost` if it is not already present.
3. Create a Cloud Firestore database. In its Rules tab, replace the rules with the contents of `firestore.rules` and publish them **before using the app**. The rules restrict each user's records to their authenticated Firebase UID and validate the stored fields. Do not use open/test-mode rules in production.
4. Commit and push `config.js`. In repository Settings → Pages, select **GitHub Actions** as the source. The included workflow deploys pushes to `main`. GitHub Pages availability and visibility depend on the repository's plan and settings; a private repository may need a supported plan or an explicitly public repository.
5. Open the deployed site, create an account, and add a budget and expense. Firebase handles passwords and password reset emails; the app never stores passwords in Firestore.

Data is organized under `users/{uid}/months/{YYYY-MM}` with an `expenses` subcollection. Anyone with access to the Firebase project or sufficiently privileged service credentials can access its data. Account deletion, data export, and currency conversion are not provided.

## Development

Serve this directory over HTTP (for example, `python3 -m http.server 8000`) and open `http://localhost:8000`. Configure Firebase and its authorized domain as above to exercise account and database operations. Run the dependency-free calculation tests with `npm test`.
