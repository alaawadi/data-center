"""URL configuration for the users app."""
from django.urls import path

from . import views

app_name = 'users'

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('signup/', views.SignupView.as_view(), name='signup'),
    path('terms/', views.TermsView.as_view(), name='terms'),
    path('privacy/', views.PrivacyView.as_view(), name='privacy'),
    path('signup/verify/', views.verify_signup_disabled, name='verify-signup'),
    path('phone-available/', views.check_phone_ajax, name='phone-check'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/edit/', views.ProfileUpdateView.as_view(), name='profile-edit'),
    path('profile/update/', views.profile_update_ajax, name='profile-update'),
]
