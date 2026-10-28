from django.urls import path

from .views import (
    DisburseView,
    DocumentsView,
    LoanCommissionView,
    LoanDocumentsView,
    LoanPaymentsView,
    LoansView,
    LoanView,
    PaymentsView,
    PeopleView,
    ReceiptView,
    TimelineView,
)

urlpatterns = [
    path("loans/<uuid:loan_id>/commission", LoanCommissionView.as_view()),
    path("loans/<uuid:loan_id>/receipts/<uuid:entry_id>", ReceiptView.as_view()),
    path("loans/<uuid:loan_id>/documents", LoanDocumentsView.as_view()),
    path("loans", LoansView.as_view()),
    path("loans/<uuid:loan_id>", LoanView.as_view()),
    path("loans/<uuid:loan_id>/timeline", TimelineView.as_view()),
    path("loans/<uuid:loan_id>/payments", LoanPaymentsView.as_view()),
    path("loans/<uuid:loan_id>/disburse", DisburseView.as_view()),
    path("payments", PaymentsView.as_view()),
    path("people", PeopleView.as_view()),
    path("loan-documents", DocumentsView.as_view()),
]
