from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReturnPolicyBase(BaseModel):
    description: str


class ReturnPolicyCreate(ReturnPolicyBase):
    pass


class ReturnPolicyUpdate(ReturnPolicyBase):
    pass


class ReturnPolicyResponse(ReturnPolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
