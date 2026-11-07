from django.urls import path
from .views import PortfolioView, InvestmentDocumentView, PublicInvestorsView

urlpatterns = [
    path("investments/portfolio", PortfolioView.as_view()),
    path("meetings/<uuid:room_id>/investment-agreement", InvestmentDocumentView.as_view()),
    path("community/offers/<uuid:offer_id>/investors", PublicInvestorsView.as_view()),
]
