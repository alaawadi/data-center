"""URL configuration for the dashboard app."""
from django.urls import path

from . import views

app_name = 'dashboard'

urlpatterns = [
    path('service-worker.js', views.pwa_service_worker, name='pwa-service-worker'),
    path('panel/', views.PanelView.as_view(), name='home'),
    path('panel/courses/new/', views.PanelCourseEditorView.as_view(), name='course-editor-create'),
    path('panel/courses/<str:pk>/edit/', views.PanelCourseEditorView.as_view(), name='course-editor-edit'),
    path('panel/projects/new/', views.PanelProjectEditorView.as_view(), name='project-editor-create'),
    path('panel/projects/<str:pk>/edit/', views.PanelProjectEditorView.as_view(), name='project-editor-edit'),
    path('panel/settings/', views.platform_settings, name='platform-settings'),
    path('panel/backup/', views.database_backup, name='database-backup'),
    path('panel/training-categories/', views.training_categories, name='training-categories'),
    path('panel/display-order/', views.admin_display_order, name='display-order'),
    path('panel/trainers/save/', views.trainer_save, name='trainer-save'),
    path('panel/students/save/', views.student_save, name='student-save'),
    path('panel/trainers/<str:pk>/status/', views.trainer_set_active, name='trainer-status'),
    path('panel/trainers/<str:pk>/content-permission/', views.trainer_set_content_permission, name='trainer-content-permission'),
    path('panel/students/<str:pk>/status/', views.student_set_active, name='student-status'),
    path('panel/students/<str:pk>/sessions/', views.student_sessions, name='student-sessions'),
    path('panel/students/<str:pk>/referral-points/reset/', views.student_reset_referral_points, name='student-reset-referral-points'),
    path('panel/students/<str:pk>/referral-points/redeem/', views.student_redeem_referral_points, name='student-redeem-referral-points'),
    path('panel/course-progress/<int:pk>/remove/', views.course_student_remove, name='course-student-remove'),
    path('panel/courses/<str:pk>/students/', views.course_students, name='course-students'),
    path('panel/courses/<str:pk>/status/', views.course_set_active, name='course-status'),
    path('panel/projects/<str:pk>/status/', views.project_set_active, name='project-status'),
    path('panel/certificates/<str:certificate_key>/status/', views.certificate_set_active, name='certificate-status'),
    path('panel/course-lessons/save/', views.course_lesson_save, name='course-lesson-save'),
    path('panel/workshops/save/', views.workshop_save, name='workshop-save'),
    path('panel/course-registration-requests/save/', views.course_registration_request_save, name='course-registration-request-save'),
    path('panel/course-registration-requests/<int:pk>/update/', views.course_registration_request_update, name='course-registration-request-update'),
    path('panel/course-registration-requests/<int:pk>/confirm/', views.course_registration_request_confirm, name='course-registration-request-confirm'),
    path('panel/course-registration-requests/<int:pk>/status/', views.course_registration_request_status, name='course-registration-request-status'),
    path('panel/course-registration-requests/<int:pk>/setup-link/', views.course_registration_request_setup_link, name='course-registration-request-setup-link'),
    path('panel/course-registration-requests/<int:pk>/paid-amount/', views.course_registration_request_paid_amount, name='course-registration-request-paid-amount'),
    path('panel/workshops/<str:pk>/attendees/', views.workshop_attendees, name='workshop-attendees'),
    path('panel/workshops/<str:pk>/attendance/', views.workshop_attendance_status, name='workshop-attendance-status'),
    path('panel/workshops/<str:pk>/qr/regenerate/', views.workshop_regenerate_qr, name='workshop-regenerate-qr'),
    path('panel/workshops/<str:pk>/delete/', views.workshop_delete, name='workshop-delete'),
    path('workshops/attendance/scan/', views.workshop_attendance_scan, name='workshop-attendance-scan'),
]
