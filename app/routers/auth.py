from datetime import datetime, timedelta
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser, get_password_hash, verify_password
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.common import Message
from app.schemas.user import ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Annotated[Session, Depends(get_db)]):
    if db.query(User.id).first():
        raise HTTPException(status_code=403, detail="Registration is disabled")
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


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    identifier = payload.identifier.strip()
    generic_message = "If this account exists, a reset code has been generated."
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or Phone number is required")

    user = db.query(User).filter(or_(User.email == identifier, User.phone == identifier)).first()
    if not user or not user.is_active:
        return {"message": generic_message, "reset_code": None}

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({PasswordResetToken.used_at: datetime.utcnow()})
    db.add(PasswordResetToken(
        user_id=user.id,
        code_hash=get_password_hash(code),
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    ))
    db.commit()
    return {"message": generic_message, "reset_code": code}


@router.post("/reset-password", response_model=Message)
def reset_password(payload: ResetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    identifier = payload.identifier.strip()
    user = db.query(User).filter(or_(User.email == identifier, User.phone == identifier)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    now = datetime.utcnow()
    tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at >= now,
    ).order_by(PasswordResetToken.created_at.desc()).all()
    token = next((candidate for candidate in tokens if verify_password(payload.code.strip(), candidate.code_hash)), None)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user.hashed_password = get_password_hash(payload.new_password)
    token.used_at = now
    db.add(user)
    db.add(token)
    db.commit()
    return {"message": "Password has been reset"}


@router.get("/me", response_model=UserResponse)
def me(
    current_user: CurrentUser,
):
    return current_user
