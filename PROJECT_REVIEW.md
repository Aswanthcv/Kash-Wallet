# Kash-Wallet Project Review

## 1. OVERVIEW

Kash-Wallet is a personal finance tracker for managing wallets and recording income, expenses, and savings received.
Users can register, log in, manage wallets, and review transactions in a dashboard or dedicated transaction page.
The backend is Django REST Framework with JWT authentication and a MySQL database configuration.
The frontend is a React single-page app built with Vite and styled with Tailwind CSS.
The current balance rule is `initial balance + income + saving - expense`.

Tech stack versions found in the project:

- Backend: Django 6.1.3, Django REST Framework 3.18.3, `django-filter` 26.2, SimpleJWT 5.5.1, MySQLclient 2.3.0, Python Decouple 3.8.
- Frontend: React 19.3.1, React DOM 19.3.1, React Router 7.18.5, Axios 1.21.0, Vite 8.3.6, Tailwind CSS through the Vite setup, ESLint 10.14.0.

Folder structure:

```text
backend/
  finance/              Models, serializers, filters, views, migrations
  kashwallet/           Django settings, URLs, ASGI/WSGI entrypoints
  manage.py
frontend/
  src/api/              Axios API client
  src/components/       Reusable UI components
  src/context/          Authentication context
  src/pages/            Login, register, dashboard, wallets, transactions
  src/utils/             Formatting and error helpers
  package.json
```

## 2. CURRENT FEATURES

| Feature | Where it lives | Status |
|---|---|---|
| Register with confirm password | `backend/finance/serializers.py`, `frontend/src/pages/Register.jsx`, `frontend/src/context/AuthContext.jsx` | Working |
| Login | `backend/finance/urls.py` via SimpleJWT, `frontend/src/pages/Login.jsx` | Working |
| Token refresh | `frontend/src/api/axios.js`, `/api/auth/refresh/` in `backend/finance/urls.py` | Working, with edge-case risks |
| Protected routes | `backend/kashwallet/settings.py`, `frontend/src/components/ProtectedRoute.jsx` | Working |
| Wallet add | `backend/finance/views.py`, `backend/finance/serializers.py`, `frontend/src/pages/Wallets.jsx` | Working |
| Wallet rename | Same backend files, `frontend/src/pages/Wallets.jsx` | Working |
| Wallet delete | Same backend files, `frontend/src/pages/Wallets.jsx` | Working; deletes its transactions by cascade |
| Transactions add/edit/delete | `backend/finance/views.py`, `backend/finance/serializers.py`, `frontend/src/components/TransactionForm.jsx`, `frontend/src/pages/Transactions.jsx` | Working |
| Transaction filters | `backend/finance/filters.py`, `frontend/src/pages/Transactions.jsx` | Working; wallet, type, From, and To dates |
| Dashboard summary | `backend/finance/views.py`, `frontend/src/pages/Dashboard.jsx` | Working |
| Dashboard greeting | `backend/finance/views.py` returns `username`, `frontend/src/pages/Dashboard.jsx` | Working |
| Logout confirmation | `frontend/src/components/ConfirmModal.jsx`, `frontend/src/components/Navbar.jsx` | Working |
| Save-and-add-another | `frontend/src/components/TransactionForm.jsx` | Working |
| Responsive transaction table/cards | `frontend/src/pages/Transactions.jsx` | Working |
| Error formatting | `frontend/src/utils/format.js`, `frontend/src/components/ErrorMessage.jsx` | Working but general-purpose |
| Automated tests | `backend/finance/tests.py` | Missing; file contains only the starter comment |

## 3. HOW THE LOGIC WORKS

### Data models and relationships

Django’s built-in `User` owns many `Wallet` records through `Wallet.user` in `backend/finance/models.py`. A `Wallet` has a name, an initial balance, and a creation timestamp.

Each `Transaction` belongs to one wallet through `Transaction.wallet`. It stores a decimal amount, one type (`INCOME`, `EXPENSE`, or `SAVING`), a date/time, an optional note, and `created_at`. Deleting a wallet cascades to its transactions because the foreign key uses `on_delete=models.CASCADE`.

### Balance calculation

The formula is consistently implemented as:

```text
initial balance + income + saving - expense
```

- Wallet list: `backend/finance/views.py:40` annotates `balance` with `F("initial_balance") + F("income") + F("saving") - F("expense")`.
- Dashboard summary: `backend/finance/views.py:108` applies the same formula to Decimal totals.
- Frontend wallet cards display the server-provided `wallet.balance`; React does not recalculate it.
- Transaction signs: `frontend/src/pages/Transactions.jsx:105-108` and `frontend/src/pages/Dashboard.jsx:109` show Income and Saving with `+`, Expense with `-`.

The formula is consistent in the wallet list, summary, and transaction displays. `total_saved` and the monthly saving figure remain separate aggregates of `SAVING` transactions.

### Authentication flow

The backend exposes JWT endpoints through `backend/finance/urls.py`: register, login, and refresh. Default DRF authentication uses `JWTAuthentication` and default permission is `IsAuthenticated` in `backend/kashwallet/settings.py`.

On login or automatic registration login, `frontend/src/context/AuthContext.jsx` stores the access and refresh tokens in `localStorage`. `frontend/src/api/axios.js` adds the access token to requests. On a 401, it makes one shared refresh request, stores the new access token, and retries the original request. If refresh fails, it clears both tokens and redirects to `/login`.

`frontend/src/components/ProtectedRoute.jsx` checks whether an access token exists and redirects unauthenticated users to `/login`.

### User data isolation

`WalletViewSet.get_queryset()` filters wallets by `user=self.request.user`. `TransactionViewSet.get_queryset()` filters transactions through `wallet__user=self.request.user` and uses `select_related("wallet")`.

`TransactionSerializer.validate_wallet()` also rejects attempts to submit a wallet belonging to another user. This is a useful second layer beyond queryset filtering.

### Summary and timezone handling

`SummaryView` gathers all wallets and the user’s transactions, sums initial balances and transaction types, and returns overall totals plus a `wallet_count`.

For monthly figures, `timezone.localtime()` is used, then the first day of the current month is constructed at midnight. Transactions are filtered from that month start up to the first day of the next month. The configured timezone is `Asia/Kolkata` in `backend/kashwallet/settings.py`.

### Dates

`frontend/src/components/TransactionForm.jsx` converts the browser’s `datetime-local` value with `new Date(form.date).toISOString()` before POST/PATCH. When editing, `localDateTime()` converts the API value back to the local input format.

`frontend/src/utils/format.js` displays API dates with `toLocaleString("en-IN", ...)`. The transaction filter in `frontend/src/pages/Transactions.jsx` converts From to `00:00:00` and To to `23:59:59` before sending ISO `date_from` and `date_to` query parameters.

## 4. WHAT WORKS WELL

- Money is stored as Django `DecimalField`, and the backend uses `Decimal` plus `money()` for formatted output rather than floating-point arithmetic.
- Wallet and transaction querysets enforce per-user ownership at the database-query boundary.
- `select_related("wallet")` avoids an obvious wallet lookup for each transaction row in the transaction endpoint.
- Passwords are passed to Django’s `create_user()`, and Django’s configured password validators are applied during registration.
- The Axios refresh flow shares one refresh request when several requests fail together, reducing refresh races.
- The UI keeps responsive desktop/mobile transaction layouts separate and provides a reusable confirmation modal for logout.

## 5. PROBLEMS AND RISKS

### High

- **JWT tokens are stored in `localStorage`.** Location: `frontend/src/context/AuthContext.jsx` and `frontend/src/api/axios.js`. Any successful XSS can read both access and refresh tokens. Prefer secure, HttpOnly, SameSite cookies for refresh tokens, short-lived access tokens, and CSRF protection appropriate to the cookie design.

- **Deployment host and CORS settings are development-only.** Location: `backend/kashwallet/settings.py:30` and `:57`. `ALLOWED_HOSTS` only allows localhost and CORS only allows `http://localhost:5173`. Production requests will fail or require unsafe edits. Load explicit production hosts/origins from environment variables and keep them separate by environment.

- **No login/register throttling is configured.** Location: `backend/kashwallet/settings.py:59-66`, `backend/finance/urls.py`. Authentication endpoints can be brute-forced or abused. Add DRF throttles or a reverse-proxy/WAF rate limit, especially for login and register.

- **Database availability is not checked by application startup configuration.** Location: `backend/kashwallet/settings.py:96-106`. The app correctly reads MySQL values from environment variables, but deployment must provide them and ensure the database is reachable before serving traffic. Add an explicit deployment health check.

### Medium

- **No pagination exists for transactions.** Location: `backend/finance/views.py:56-63`, `frontend/src/pages/Transactions.jsx`. A large transaction history is returned and rendered at once. Enable DRF page-number or limit-offset pagination and add frontend page controls or infinite loading.

- **The transaction filter effect has a hook dependency warning.** Location: `frontend/src/pages/Transactions.jsx:32-37`. `loadTransactions` is defined outside the effect but omitted from dependencies. It currently works because the function is recreated with the component, but it is fragile and can trigger lint warnings. Move the request logic inside the effect or memoize the callback.

- **Frontend field errors are mostly shown as one general message.** Location: `frontend/src/utils/format.js`, `frontend/src/pages/Register.jsx`, and `frontend/src/components/TransactionForm.jsx`. Users may not know which field needs correction. Preserve the API’s field-to-message structure and render errors beside the relevant inputs.

- **The note length differs between UI and backend.** The frontend limits notes to 60 characters in `frontend/src/components/TransactionForm.jsx`, while `Transaction.note` allows 255 characters in `backend/finance/models.py`. Align the limits so API and UI behavior agree.

- **Summary uses several database queries per request.** Location: `backend/finance/views.py:86-104`. This is reasonable at current scale, but totals, month totals, and wallet count could be consolidated or cached later. The current code does not show a serious N+1 issue.

- **Wallet edits and transactions do not have concurrency protection.** Locations: `backend/finance/views.py` and `frontend/src/pages/Wallets.jsx`/`Transactions.jsx`. Two simultaneous edits can overwrite each other, and a wallet balance can change between a display and a later action. Use database transactions and conditional updates where financial audit correctness matters.

- **Date boundary handling depends on browser timezone.** Location: `frontend/src/pages/Transactions.jsx:45-46`. The browser creates local midnight/23:59:59 and converts to UTC, which is usually correct for a user in the configured timezone but can differ for users in another timezone. Decide whether filters are user-local or fixed to the server timezone and document/enforce that choice.

### Low

- **`created_at` is still returned by serializers even though the UI intentionally shows `date`.** Location: `backend/finance/serializers.py`. This is not currently rendered, but returning unused fields increases API surface. Remove it only if clients no longer need it.

- **Historical title migrations remain.** Locations: `backend/finance/migrations/0002_transaction_title.py` and `0003_remove_transaction_title.py`. This is valid migration history, not a runtime bug, but it is leftover feature history that should be explained in project documentation.

- **Vite starter assets and metadata remain.** Locations: `frontend/public/favicon.svg`, `frontend/public/icons.svg`, `frontend/src/assets/hero.png`, and `frontend/index.html`. Review whether each is actually used and remove or replace starter assets during polish.

- **Accessibility can improve.** Several compact forms use placeholders instead of visible labels, notably `frontend/src/pages/Login.jsx`, `Register.jsx`, and `Wallets.jsx`. Add labels and matching `htmlFor`/`id` values, and consider focus management for `ConfirmModal`.

- **The mobile transaction card is functional but dense.** Location: `frontend/src/pages/Transactions.jsx:116-118`. Actions and amounts fit, but longer notes and wallet names could use clearer wrapping and spacing on narrow screens.

- **Full frontend lint has an existing Fast Refresh warning/error.** Location: `frontend/src/context/AuthContext.jsx`, where a hook and a non-component export share the file. Move `useAuth` or adjust the lint structure without changing behavior.

## 6. MISSING TESTS

`backend/finance/tests.py` contains no actual tests. There are also no frontend test files or test scripts in `frontend/package.json`.

The 10 most valuable backend tests are:

1. Register with matching passwords creates a user and never returns password fields.
2. Register with mismatched passwords returns 400 with `confirm_password`.
3. Weak passwords are rejected by Django validators.
4. Duplicate username and duplicate email behavior returns controlled 400 responses.
5. Login returns access and refresh tokens for valid credentials and rejects invalid credentials.
6. Refresh returns a new access token and rejects an invalid/expired refresh token.
7. A user can only list, create, update, and delete their own wallets.
8. A transaction cannot be created using another user’s wallet, including direct serializer validation.
9. Wallet balance and summary balance use `initial + income + saving - expense`, including zero-value aggregate cases.
10. Transaction date filters include the intended From/To boundaries and summary monthly totals use the configured timezone.

## 7. IMPROVEMENTS ROADMAP

### Quick wins — under one hour each

- Add visible labels and accessible IDs to login, register, wallet, and transaction inputs. This improves keyboard and screen-reader use with low risk.
- Fix the Transactions hook dependency warning. This keeps lint clean and makes data-loading behavior easier to reason about.
- Align note length validation between frontend and backend. This prevents inconsistent accepted input.
- Add a small README section documenting required environment variables, MySQL setup, migration, and frontend build commands.
- Add a basic Django smoke-test module for registration, login, summary, and balance behavior.

### Medium — a few hours

- Add DRF pagination and frontend pagination controls. This keeps response size and rendering time stable as history grows.
- Add login/register throttling and production-ready configurable CORS/allowed hosts. This improves abuse resistance and deployment safety.
- Improve field-level API errors and loading states. Users can correct the exact invalid input instead of reading a combined message.
- Add a transaction confirmation modal for deletes and consistent focus handling for all modals.
- Add API and UI tests for the transaction form, date filters, logout confirmation, and token refresh.

### Bigger features worth adding

- Transfers between wallets: move money without treating the movement as income or expense; useful for real multi-wallet tracking.
- Categories: group transactions such as food, transport, rent, and gifts for reporting.
- Budgets: compare spending against monthly category limits.
- Charts: visualize income, expenses, savings received, and category trends.
- CSV export: let users back up or analyze their data externally.
- Recurring transactions: generate regular salary, rent, or subscription entries.
- PWA/offline support: make the tracker convenient on mobile with installability and resilient network behavior.

## 8. DEPLOYMENT READINESS

- [x] MySQL engine configured in `backend/kashwallet/settings.py`.
- [x] MySQL driver listed in `backend/requirements.txt`.
- [ ] Production DB variables supplied securely at deploy time; do not commit `.env`.
- [ ] Production `ALLOWED_HOSTS` configured.
- [ ] Production `CORS_ALLOWED_ORIGINS` configured.
- [ ] `DEBUG=False` verified in the production environment.
- [ ] Strong production `SECRET_KEY` supplied securely.
- [ ] HTTPS enabled and secure token/cookie strategy chosen.
- [ ] Gunicorn or another production WSGI/ASGI process configured.
- [ ] Static files collected and served; WhiteNoise or a CDN/object store is not configured in the current settings.
- [ ] Database migrations run as part of deployment.
- [ ] Frontend production `npm run build` output deployed and `VITE_API_URL` configured.
- [ ] Reverse proxy, health checks, logs, backups, and monitoring configured.
- [ ] Rate limiting and error tracking configured.

## 9. PORTFOLIO / INTERVIEW NOTES

### Five talking points

1. “I separated wallets and transactions so balances are derived from immutable transaction records rather than manually edited totals.”
2. “I used Decimal fields and backend aggregation so monetary calculations are not performed with JavaScript floating-point values.”
3. “I enforced ownership in both querysets and transaction wallet validation to prevent cross-user data access.”
4. “I implemented JWT access/refresh handling in Axios, including one shared refresh request when concurrent requests receive 401 responses.”
5. “I kept the React UI focused on simple workflows: responsive transaction lists, date filtering, add/edit forms, and confirmation for destructive logout.”

### Five likely questions and model answers

1. **Why calculate balances on the backend?**
   “The backend is the source of truth and uses Decimal aggregation. The React app only formats the returned values, which avoids inconsistent client-side calculations.”

2. **How do you stop one user reading another user’s transactions?**
   “Wallet querysets filter by the authenticated user, transaction querysets filter through the wallet owner, and serializer validation rejects a wallet owned by another user.”

3. **What happens when an access token expires?**
   “The Axios response interceptor sends the refresh token once, stores the new access token, retries the original request, and redirects to login if refresh fails.”

4. **What would you change before production?**
   “I would move refresh tokens out of localStorage into secure HttpOnly cookies, configure production hosts/CORS, add throttling, serve static files properly, and add automated tests and monitoring.”

5. **How would you model transfers between wallets?**
   “I would add a transfer concept linking a source and destination wallet, or create paired ledger entries with a shared transfer ID, so transfers do not inflate income or expense totals.”

## TOP 5 NEXT STEPS

1. Move JWT refresh handling away from `localStorage` and define a secure cookie/CSRF strategy.
2. Add backend tests for authentication, ownership, balance formula, and date filtering.
3. Add pagination and fix the Transactions effect dependency warning.
4. Configure production hosts, CORS, HTTPS, static files, and deployment process.
5. Add accessible labels and align frontend/backend validation limits.
