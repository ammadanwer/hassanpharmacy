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


def _truncate(value: object, length: int) -> str:
    text = " ".join(str(value or "-").split())
    return text if len(text) <= length else f"{text[:max(0, length - 1)]}..."


def _text_pdf(lines: list[str]) -> bytes:
    return _text_pages_pdf([lines])


def _text_pages_pdf(pages: list[list[str]]) -> bytes:
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    ]
    page_refs = []
    for page in pages:
        content_lines = ["BT", "/F1 16 Tf", "44 762 Td", f"({_pdf_escape(page[0] if page else '')}) Tj"]
        if len(page) > 1:
            content_lines.extend(["/F1 9 Tf"])
        for line in page[1:]:
            content_lines.extend(["0 -16 Td", f"({_pdf_escape(line)}) Tj"])
        content_lines.append("ET")
        stream = "\n".join(content_lines).encode("latin-1", "replace")
        page_obj_number = len(objects) + 1
        content_obj_number = page_obj_number + 1
        page_refs.append(f"{page_obj_number} 0 R")
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_obj_number} 0 R >>".encode()
        )
        objects.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(page_refs)}] /Count {len(page_refs)} >>".encode()
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


def _expense_report_pdf(
    expenses: list[Expense],
    date_from: date | None,
    date_to: date | None,
    q: str | None,
    category_name: str | None,
) -> bytes:
    total = sum(float(expense.expense_amount or 0) for expense in expenses)
    table_header = f"{'Date':<12} {'Name':<28} {'Expense Category':<24} {'Expense Amount':>14}"
    table_rule = "-" * len(table_header)
    row_lines = [
        f"{str(expense.date):<12} {_truncate(expense.name, 28):<28} {_truncate(expense.expense_category_name or '-', 24):<24} {float(expense.expense_amount or 0):>14,.2f}"
        for expense in expenses
    ]
    rows_per_page = 35
    chunks = [row_lines[index:index + rows_per_page] for index in range(0, len(row_lines), rows_per_page)] or [[]]
    pages = []
    for page_index, chunk in enumerate(chunks, start=1):
        pages.append([
            "Hassan Pharmacy",
            "Daily Expense Report",
            f"Date From: {date_from or '-'}    Date To: {date_to or '-'}",
            f"Search: {q or '-'}    Expense Category: {category_name or '-'}",
            f"Total Expenses: {len(expenses)}    Total Expense Amount: Rs. {total:,.2f}    Page {page_index} of {len(chunks)}",
            "",
            table_header,
            table_rule,
            *chunk,
        ])
    return _text_pages_pdf(pages)


def _expense_pdf(expense: Expense) -> bytes:
    return _text_pdf([
        "Hassan Pharmacy",
        "Daily Expense",
        f"Date: {expense.date}",
        f"Name: {expense.name}",
        f"Expense Category: {expense.expense_category_name or '-'}",
        f"Expense Amount: Rs. {float(expense.expense_amount or 0):.2f}",
        f"Description: {expense.notes or '-'}",
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
    rows = apply_expense_filters(db.query(Expense), date_from, date_to, q, category_id).order_by(Expense.date.desc(), Expense.id.desc()).all()
    category_name = None
    if category_id:
        category = db.get(ExpenseCategory, category_id)
        category_name = category.name if category else str(category_id)
    filename = "expenses.pdf"
    return Response(
        content=_expense_report_pdf(rows, date_from, date_to, q, category_name),
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
