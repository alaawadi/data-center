"""URL configuration for the courses app."""
from django.urls import path

from . import views

app_name = 'courses'

urlpatterns = [
    path('courses/', views.CourseListView.as_view(), name='list'),
    path('courses/edit/', views.CourseEditorView.as_view(), name='create'),
    path('courses/edit/<str:pk>/', views.CourseEditorView.as_view(), name='edit'),
    path('courses/save/', views.course_save, name='save'),
    path('courses/reorder/', views.course_reorder, name='reorder'),
    path('courses/<str:pk>/coming-soon/', views.course_set_coming_soon, name='coming-soon'),
    path('courses/delete/', views.course_delete, name='delete'),
    path('courses/<str:pk>/versions/', views.course_versions, name='versions'),
    path('courses/discard-changes/', views.course_discard_changes, name='discard-changes'),
    path('certificates/manual/submit/', views.manual_certificate_submit, name='manual-certificate-submit'),
    path('courses/progress/', views.course_lesson_done, name='progress'),
    path('courses/<str:pk>/redeem-points/', views.redeem_course_points, name='redeem-points'),
    path('courses/quiz/start/', views.course_quiz_start, name='quiz_start'),
    path('courses/quiz/submit/', views.course_quiz_submit, name='quiz_submit'),
    path('courses/<str:pk>/', views.CourseDetailView.as_view(), name='detail'),
    path('courses/<str:pk>/certificate/', views.CertificateDetailView.as_view(), name='certificate'),
    path('courses/<str:pk>/playlist/', views.PlaylistView.as_view(), name='playlist'),
]
