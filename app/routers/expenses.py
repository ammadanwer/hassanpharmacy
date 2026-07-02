from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.expense import Expense
from app.models.expense_category import ExpenseCategory
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate, PagedExpenseResponse

router = APIRouter()


def _pdf_escape(value: object) -> str:
    return str(value or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _text_pdf(lines: list[str]) -> bytes:
    content_lines = ["BT", "/F1 18 Tf", "72 760 Td", f"({_pdf_escape(lines[0])}) Tj", "/F1 12 Tf"]
    for line in lines[1:34]:
        content_lines.extend(["0 -28 Td", f"({_pdf_escape(line)}) Tj"])
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode())
    return bytes(pdf)


def _expense_pdf(expense: Expense) -> bytes:
    return _text_pdf([
        "Hassan Pharmacy",
        "Daily Expense",
        f"Expense ID: {expense.id}",
        f"Date: {expense.date}",
        f"Name: {expense.name}",
        f"Category: {expense.expense_category_name or '-'}",
        f"Amount: Rs. {float(expense.expense_amount or 0):.2f}",
        f"Notes: {expense.notes or '-'}",
    ])


def apply_expense_filters(query, date_from: date | None, date_to: date | None, q: str | None, category_id: int | None):
    if date_from:
        query = query.filter(Expense.date >= date_from)
    if date_to:
        query = query.filter(Expense.date <= date_to)
    if category_id:
        query = query.filter(Expense.expense_category_id == category_id)
    if q:
        search = f"%{q.strip()}%"
        query = (
            query.outerjoin(ExpenseCategory, Expense.expense_category_id == ExpenseCategory.id)
            .filter(or_(Expense.name.ilike(search), Expense.notes.ilike(search), ExpenseCategory.name.ilike(search)))
        )
    return query


@router.get("/api/expenses", response_model=list[ExpenseResponse] | PagedExpenseResponse)
def list_expenses(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = Query(default=None),
    category_id: int | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = apply_expense_filters(db.query(Expense), date_from, date_to, q, category_id)
    total = query.count() if paged else 0
    items = query.order_by(Expense.date.desc(), Expense.id.desc()).offset(skip).limit(limit).all()
    if paged:
        return PagedExpenseResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.get("/api/expenses/download-pdf")
def download_expenses_pdf(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = Query(default=None),
    category_id: int | None = Query(default=None),
):
    rows = apply_expense_filters(db.query(Expense), date_from, date_to, q, category_id).order_by(Expense.date.desc(), Expense.id.desc()).limit(500).all()
    total = sum(float(expense.expense_amount or 0) for expense in rows)
    lines = [
        "Hassan Pharmacy",
        "Daily Expense Report",
        f"Date From: {date_from or '-'}",
        f"Date To: {date_to or '-'}",
        f"Search: {q or '-'}",
        f"Total Expenses: {len(rows)}",
        f"Total Amount: Rs. {total:.2f}",
        "",
    ]
    lines.extend(
        f"{expense.date} | {expense.name} | {expense.expense_category_name or '-'} | Rs. {float(expense.expense_amount or 0):.2f}"
        for expense in rows[:24]
    )
    filename = "expenses.pdf"
    return Response(
        content=_text_pdf(lines),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/expenses/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/api/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(expense_in: ExpenseCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    expense = Expense(**expense_in.model_dump(), created_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/api/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: int, expense_in: ExpenseUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in expense_in.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted"}


@router.get("/api/expenses/{expense_id}/download-pdf")
def download_expense_pdf(expense_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    filename = f"expense-{expense.id}.pdf"
    return Response(
        content=_expense_pdf(expense),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
