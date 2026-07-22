# NexaPay WebApp Demo

A responsive browser-based finance WebApp demo containing:

- Landing Page
- Login and Registration
- Protected Dashboard/Home
- Deposit page
- Withdraw page
- TRS page
- TR page with new-transfer flow
- Editable Profile page
- Light/Dark mode
- Responsive desktop, tablet and mobile layouts

## Run

Option 1: Open `index.html` directly in a modern browser.

Option 2: Serve the folder locally:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Demo Login

- Email: `demo@nexapay.test`
- Password: `Demo@123`

## Important

This is a working front-end prototype. Demo users, sessions and transactions are stored in browser `localStorage`. Before production use, replace this with server-side PHP 8.5 authentication, MySQL, prepared statements, CSRF protection, authorization checks, OTP verification and secure payment APIs.
