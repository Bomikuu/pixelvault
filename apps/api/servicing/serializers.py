from .projections import get_loan_projection


def loan_data(loan):
    return get_loan_projection(loan_id=loan.id)
