"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('django-admin/', admin.site.urls),

    path('', include('landing.urls', namespace='landing')),
    path('', include('users.urls', namespace='users')),
    path('', include('accounts.urls', namespace='accounts')),
    path('', include('portfolio.urls', namespace='portfolio')),
    path('', include('courses.urls', namespace='courses')),
    path('', include('projects.urls', namespace='projects')),
    path('', include('dashboard.urls', namespace='dashboard')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
