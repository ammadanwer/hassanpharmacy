from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.medicine_formula import MedicineFormula
from app.models.product import Product
from app.schemas.medicine_formula import (
    MedicineFormulaCreate,
    MedicineFormulaUpdate,
    MedicineFormulaResponse,
    PagedMedicineFormulaResponse,
)

router = APIRouter()


@router.get("/api/medicine-formulas", response_model=list[MedicineFormulaResponse] | PagedMedicineFormulaResponse)
def list_formulas(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(MedicineFormula)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = query.filter(or_(MedicineFormula.name.ilike(search), MedicineFormula.description.ilike(search)))
    total = query.count() if paged else 0
    items = query.order_by(MedicineFormula.reference_sort_order.is_(None), MedicineFormula.reference_sort_order.asc(), MedicineFormula.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedMedicineFormulaResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/medicine-formulas", response_model=MedicineFormulaResponse, status_code=201)
def create_formula(formula_in: MedicineFormulaCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    formula = MedicineFormula(**formula_in.model_dump())
    db.add(formula)
    db.commit()
    db.refresh(formula)
    return formula


@router.put("/api/medicine-formulas/{formula_id}", response_model=MedicineFormulaResponse)
def update_formula(formula_id: int, formula_in: MedicineFormulaUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    formula = db.get(MedicineFormula, formula_id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")
    for field, value in formula_in.model_dump(exclude_unset=True).items():
        setattr(formula, field, value)
    db.commit()
    db.refresh(formula)
    return formula


@router.delete("/api/medicine-formulas/{formula_id}")
def delete_formula(formula_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    formula = db.get(MedicineFormula, formula_id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")
    if db.query(Product.id).filter(Product.formula_id == formula_id).first():
        raise HTTPException(status_code=409, detail="Formula is in use and cannot be deleted")
    db.delete(formula)
    db.commit()
    return {"message": "Formula deleted"}
