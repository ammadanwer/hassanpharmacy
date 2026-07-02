from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    role: UserRole = UserRole.technician
    gender: Optional[str] = None
    sales_pin: Optional[str] = Field(default=None, min_length=3, max_length=8)
    permissions: Optional[dict[str, Any]] = None
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    role: Optional[UserRole] = None
    gender: Optional[str] = None
    sales_pin: Optional[str] = Field(default=None, min_length=3, max_length=8)
    permissions: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    role: UserRole
    gender: Optional[str] = None
    has_sales_pin: bool = False
    permissions: Optional[dict[str, Any]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PagedUserResponse(BaseModel):
    items: list[UserResponse]
    total: int
    skip: int = 0
    limit: int = 50


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class StaffPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_code: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    identifier: str
    code: str
    new_password: str = Field(min_length=6)
