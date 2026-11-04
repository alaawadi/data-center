from django.shortcuts import render


def page_not_found(request, exception=None, **kwargs):
    return render(request, '404.html', status=404)
