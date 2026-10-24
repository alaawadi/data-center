"""URL configuration for the accounts app."""
from django.urls import path

from . import views

app_name = 'accounts'

urlpatterns = [
    path('freelancers/', views.FreelancerListView.as_view(), name='list'),
    path('freelancers/<str:handle>/', views.FreelancerDetailView.as_view(), name='profile'),
]
