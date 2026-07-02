from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import Message
from app.schemas.user import ChangePassword, PagedUserResponse, StaffPasswordChange, UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/api/staff", response_model=list[UserResponse] | PagedUserResponse)
def list_staff(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    q: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    include_system: bool = Query(default=False),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(User)
    if not include_system:
        query = query.filter(User.role.notin_([UserRole.owner, UserRole.admin]))
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(search),
                User.phone.ilike(search),
                User.email.ilike(search),
                User.address.ilike(search),
                User.gender.ilike(search),
            )
        )
    total = query.count() if paged else 0
    items = query.order_by(User.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedUserResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/staff", response_model=UserResponse, status_code=201)
def create_staff(user_in: UserCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    if user_in.email and db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=user_in.name,
        phone=user_in.phone,
        email=user_in.email,
        address=user_in.address,
        role=user_in.role,
        gender=user_in.gender,
        permissions=user_in.permissions,
        sales_pin_hash=get_password_hash(user_in.sales_pin) if user_in.sales_pin else None,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/api/staff/{user_id}", response_model=UserResponse)
def update_staff(user_id: int, user_in: UserUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found")
    values = user_in.model_dump(exclude_unset=True)
    password = values.pop("password", None)
    sales_pin = values.pop("sales_pin", None)
    for field, value in values.items():
        setattr(user, field, value)
    if password:
        user.hashed_password = get_password_hash(password)
    if sales_pin:
        user.sales_pin_hash = get_password_hash(sales_pin)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/api/staff/{user_id}")
def delete_staff(user_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found")
    user.is_active = False
    db.commit()
    return {"message": "Staff member deactivated"}


@router.post("/api/auth/change-password", response_model=Message)
def change_password(payload: ChangePassword, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed"}


@router.post("/api/staff/{user_id}/change-password", response_model=Message)
def change_staff_password(user_id: int, payload: StaffPasswordChange, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    if current_user.role.value not in {"owner", "admin", "manager"}:
        raise HTTPException(status_code=403, detail="Only admin users can change staff passwords")
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found")
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Staff password changed"}
