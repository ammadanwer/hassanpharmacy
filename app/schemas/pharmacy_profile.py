from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PharmacyProfileBase(BaseModel):
    name: str = "Hassan Pharmacy"
    customer_service: Optional[str] = "0345 7427946"
    country: Optional[str] = "Pakistan"
    city: Optional[str] = "Karachi"
    address: Optional[str] = "DHA phase 2 extension"
    email: Optional[str] = "haseebkiani44@gmail.com"
    reg_number: Optional[str] = "121122"
    license_number: Optional[str] = "1"
    license_expiry: Optional[str] = "30/11/2028"
    operating_hours: Optional[str] = "10am-6pm"
    pin_required: bool = False
    logo_data_url: Optional[str] = None


class PharmacyProfileUpdate(BaseModel):
    name: Optional[str] = None
    customer_service: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    reg_number: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    operating_hours: Optional[str] = None
    pin_required: Optional[bool] = None
    logo_data_url: Optional[str] = None


class PharmacyProfileResponse(PharmacyProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
