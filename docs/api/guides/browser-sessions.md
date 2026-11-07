## Browser sessions and first request

Both web and phone/PWA use same-origin `/api/v1` with the same accounts. Start with `GET /api/v1/auth/session`; a guest receives `member: null`, an environment and a CSRF token. Keep the token in memory. Session cookies stay HttpOnly. `POST /auth/sign-in` rotates the session and CSRF token; use the returned/current bootstrap token for subsequent writes. Never put credentials into query strings, logs, generated examples or persistent frontend storage.

```js
const bootstrap = await fetch('/api/v1/auth/session', {
  credentials: 'same-origin', cache: 'no-store'
}).then(response => response.json());
// Sign in explicitly with user-entered values. Do not embed credentials.
const response = await fetch('/api/v1/auth/sign-in', {
  method: 'POST', credentials: 'same-origin',
  headers: {'Content-Type': 'application/json', 'X-CSRFToken': bootstrap.csrf_token},
  body: JSON.stringify({email: enteredEmail, password: enteredPassword})
});
if (!response.ok) throw new Error('Sign-in was not accepted');
const session = await response.json();
```

For cURL use a local cookie jar and a locally extracted current token; placeholders below deliberately do not contain reusable credentials:

```sh
curl --cookie-jar session.cookies https://YOUR_HOST/api/v1/auth/session
curl --cookie session.cookies --cookie-jar session.cookies \
  --header 'Content-Type: application/json' \
  --header 'X-CSRFToken: CURRENT_BOOTSTRAP_TOKEN' \
  --data @local-user-entered-sign-in.json https://YOUR_HOST/api/v1/auth/sign-in
```

Python clients use a persistent cookie jar and the same CSRF protocol:

```python
import requests
session = requests.Session()
bootstrap = session.get(f'{origin}/api/v1/auth/session').json()
result = session.post(f'{origin}/api/v1/auth/sign-in',
    headers={'X-CSRFToken': bootstrap['csrf_token']},
    json={'email': entered_email, 'password': entered_password})
result.raise_for_status()
csrf = result.json()['csrf_token']
```

Sign-out clears the server session and client private cache. Expiry, account switches and app resume must refetch identity before displaying private records; reject old in-flight responses. Public contact submission is not verified email ownership. Recovery-email challenges and password-reset links are single-use, time-bounded, explicit POSTs; the link token belongs in the URL fragment and is removed from the displayed URL. No bearer/API-key login is provided by these routes.
