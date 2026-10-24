"""URL configuration for the landing app."""
from django.urls import path

from . import views

app_name = 'landing'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
]
