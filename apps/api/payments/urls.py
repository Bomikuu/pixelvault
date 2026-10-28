from django.urls import path

from .views import CheckoutView, CommissionCheckoutView, PaymentPreviewView, WebhookView

urlpatterns = [
    path("loans/<uuid:loan_id>/payment-preview", PaymentPreviewView.as_view()),
    path("loans/<uuid:loan_id>/checkout", CheckoutView.as_view()),
    path("commissions/<uuid:accrual_id>/checkout", CommissionCheckoutView.as_view()),
    path("integrations/pixelflow/<uuid:routing_id>/events", WebhookView.as_view()),
]
