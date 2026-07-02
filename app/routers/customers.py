from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.customer import Customer
from app.models.sale import PaymentMethod, Sale, SaleStatus
from app.schemas.customer import CustomerCreate, CustomerDuePayment, CustomerHistoryResponse, CustomerResponse, CustomerUpdate, PagedCustomerResponse

router = APIRouter()


def _customer_sales_query(db: Session, customer: Customer):
    filters = [Sale.customer_id == customer.id]
    if customer.phone:
        filters.append(Sale.customer_phone == customer.phone)
    return db.query(Sale).filter(or_(*filters))


def _customer_history_payload(db: Session, customer: Customer) -> dict:
    sales = _customer_sales_query(db, customer).order_by(Sale.date.desc(), Sale.id.desc()).all()
    total_purchases = sum(float(sale.total_amount or 0) for sale in sales)
    total_paid = sum(float(sale.paid or 0) for sale in sales)
    total_due = sum(float(sale.due or 0) for sale in sales)
    total_returns = sum(float(return_row.amount or 0) for sale in sales for return_row in sale.returns)
    return {
        "customer": customer,
        "sales": sales,
        "total_purchases": total_purchases,
        "total_paid": total_paid,
        "total_due": total_due,
        "total_returns": total_returns,
    }


@router.get("/api/customers", response_model=list[CustomerResponse] | PagedCustomerResponse)
def list_customers(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    q: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(Customer)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Customer.name.ilike(like), Customer.phone.ilike(like), Customer.address.ilike(like)))
    total = query.count() if paged else 0
    items = query.order_by(Customer.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedCustomerResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.get("/api/customers/{customer_id}/history", response_model=CustomerHistoryResponse)
def customer_history(customer_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_history_payload(db, customer)


@router.post("/api/customers/{customer_id}/clear-dues", response_model=CustomerHistoryResponse)
def clear_customer_dues(
    customer_id: int,
    payment: CustomerDuePayment,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    method = None
    if payment.payment_method:
        try:
            method = PaymentMethod(payment.payment_method)
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Invalid payment method") from error
    remaining = float(payment.amount)
    customer_due = float(customer.due_amount or 0)
    due_sales = _customer_sales_query(db, customer).filter(Sale.due > 0).order_by(Sale.date.asc(), Sale.id.asc()).all()
    for sale in due_sales:
        if remaining <= 0:
            break
        sale_due = float(sale.due or 0)
        applied = min(remaining, sale_due)
        sale.paid = float(sale.paid or 0) + applied
        sale.due = max(0, sale_due - applied)
        if method:
            sale.payment_method = method
        if float(sale.due or 0) <= 0:
            sale.status = SaleStatus.paid
        else:
            sale.status = SaleStatus.partial
        remaining -= applied
    applied_to_sales = float(payment.amount) - remaining
    if remaining > 0 and customer_due > applied_to_sales:
        remaining_customer_due = customer_due - applied_to_sales
        applied_to_customer = min(remaining, remaining_customer_due)
        applied_to_sales += applied_to_customer
        remaining -= applied_to_customer
    customer.due_amount = max(0, customer_due - applied_to_sales)
    db.commit()
    db.refresh(customer)
    return _customer_history_payload(db, customer)


@router.post("/api/customers", response_model=CustomerResponse, status_code=201)
def create_customer(customer_in: CustomerCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    customer = Customer(**customer_in.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/api/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer_in: CustomerUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in customer_in.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted"}
