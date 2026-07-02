from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser, get_password_hash, verify_password
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import Message
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Annotated[Session, Depends(get_db)]):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=user_in.name,
        phone=user_in.phone,
        email=user_in.email,
        address=user_in.address,
        role=user_in.role,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login")
def login(username: str, password: str, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(or_(User.email == username, User.phone == username)).first()
    if not user or not user.is_active or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    from app.core.security import create_access_token
    token = create_access_token({"sub": str(user.id)}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def me(
    current_user: CurrentUser,
):
    return current_user
