# PythonAnywhere deployment

The project can run on PythonAnywhere with SQLite. SQLite is suitable for a
small site, but concurrent writes can be a bottleneck; plan a move to a
managed database if traffic or write concurrency grows. Back up the database
and uploaded media separately.

## Configure production settings

Set these environment variables in the PythonAnywhere WSGI configuration file
before calling `get_wsgi_application()`:

```python
import os

os.environ['DJANGO_DEBUG'] = 'False'
os.environ['DJANGO_SECRET_KEY'] = '<a unique secret generated for this deployment>'
os.environ['DJANGO_ALLOWED_HOSTS'] = 'alaawadi99998.pythonanywhere.com'
os.environ['DJANGO_CSRF_TRUSTED_ORIGINS'] = 'https://alaawadi99998.pythonanywhere.com'
os.environ['DJANGO_SQLITE_PATH'] = '/home/<your-username>/data-center/db.sqlite3'
os.environ['DJANGO_MEDIA_ROOT'] = '/home/<your-username>/data-center/media'
```

Generate a secret key with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Keep the secret out of source control. Create the database and media
directories in a persistent, writable location. Add the production site's
`/static/` mapping to the configured `STATIC_ROOT` (by default,
`<project>/staticfiles`) and its `/media/` mapping to `DJANGO_MEDIA_ROOT` in
the PythonAnywhere Web tab.

The settings enable HTTPS redirects and secure cookies when `DJANGO_DEBUG` is
false. They trust `X-Forwarded-Proto` by default for PythonAnywhere's HTTPS
proxy. One-year HSTS is enabled, but subdomain coverage and browser preload
remain disabled; enable those only after confirming all subdomains support
HTTPS.

If signup verification emails are used, configure the existing `EMAIL_HOST`,
`EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, and
`DEFAULT_FROM_EMAIL` variables with the SMTP provider's values. Do not use the
console email backend in production.

## Deploy and verify

From the project directory, with production environment variables configured:

```bash
python manage.py check --deploy
python manage.py migrate
python manage.py collectstatic --noinput
```

Resolve any deployment-check warnings that apply to the actual hosting setup,
then reload the web app from the PythonAnywhere Web tab.
