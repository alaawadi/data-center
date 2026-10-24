import os

from django import template
from django.contrib.staticfiles import finders
from django.templatetags.static import static

register = template.Library()

_ver_cache = {}


def _version(path):
    """Return the mtime-based cache-busting token for a static file.

    The resolved absolute path is cached, but the mtime is re-read on every
    call so that editing a file immediately changes its ``?v=`` token. Caching
    the token itself would freeze it for the lifetime of the process and make
    browsers keep serving a stale copy of the file.
    """
    abs_path = _ver_cache.get(path)
    if abs_path is None:
        try:
            abs_path = finders.find(path) or ''
        except Exception:
            abs_path = ''
        _ver_cache[path] = abs_path
    if not abs_path:
        return ''
    try:
        return str(int(os.path.getmtime(abs_path)))
    except OSError:
        return ''


@register.simple_tag
def static_v(path):
    url = static(path)
    ver = _version(path)
    if not ver:
        return url
    sep = '&' if '?' in url else '?'
    return '{}{}v={}'.format(url, sep, ver)
