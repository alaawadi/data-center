"""URL configuration for the portfolio app."""
from django.urls import path

from . import views

app_name = 'portfolio'

urlpatterns = [
    path('portfolio/', views.HomeView.as_view(), name='home'),
]
