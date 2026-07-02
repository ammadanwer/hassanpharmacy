from datetime import date as date_type, datetime, time as time_type
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ShiftBase(BaseModel):
    staff_id: int
    shift_type: str
    start_time: time_type
    end_time: time_type
    start_period: str = "AM"
    end_period: str = "AM"
    off_days: Optional[str] = None
    date: date_type
    notes: Optional[str] = None


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(ShiftBase):
    staff_id: Optional[int] = None
    shift_type: Optional[str] = None
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None
    start_period: Optional[str] = None
    end_period: Optional[str] = None
    off_days: Optional[str] = None
    date: Optional[date_type] = None


class ShiftResponse(ShiftBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    staff_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PagedShiftResponse(BaseModel):
    items: list[ShiftResponse]
    total: int
    skip: int = 0
    limit: int = 50
