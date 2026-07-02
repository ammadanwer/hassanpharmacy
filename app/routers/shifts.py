from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import PagedShiftResponse, ShiftCreate, ShiftUpdate, ShiftResponse

router = APIRouter()


@router.get("/api/shifts", response_model=list[ShiftResponse] | PagedShiftResponse)
def list_shifts(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    q: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(Shift)
    if q:
        search = f"%{q.strip()}%"
        query = (
            query.outerjoin(User, Shift.staff_id == User.id)
            .filter(
                or_(
                    User.name.ilike(search),
                    User.phone.ilike(search),
                    Shift.shift_type.ilike(search),
                    Shift.off_days.ilike(search),
                    Shift.notes.ilike(search),
                )
            )
        )
    total = query.count() if paged else 0
    items = query.order_by(Shift.id.desc()).offset(skip).limit(limit).all()
    if paged:
        return PagedShiftResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/shifts", response_model=ShiftResponse, status_code=201)
def create_shift(shift_in: ShiftCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    shift = Shift(**shift_in.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.put("/api/shifts/{shift_id}", response_model=ShiftResponse)
def update_shift(shift_id: int, shift_in: ShiftUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for field, value in shift_in.model_dump(exclude_unset=True).items():
        setattr(shift, field, value)
    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/api/shifts/{shift_id}")
def delete_shift(shift_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"message": "Shift deleted"}
