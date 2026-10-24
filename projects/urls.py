"""URL configuration for the projects app."""
from django.urls import path

from . import views

app_name = 'projects'

urlpatterns = [
    path('projects/', views.ProjectListView.as_view(), name='list'),
    path('projects/edit/', views.ProjectEditorView.as_view(), name='create'),
    path('projects/edit/<str:pk>/', views.ProjectEditorView.as_view(), name='edit'),
    path('projects/save/', views.project_save, name='save'),
    path('projects/delete/', views.project_delete, name='delete'),
    path('projects/files/<int:pk>/download/', views.project_file_download, name='file-download'),
    path('projects/interaction/', views.project_interaction, name='interaction'),
    path('projects/<str:pk>/', views.ProjectDetailView.as_view(), name='detail'),
]
