from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MedicineFormulaBase(BaseModel):
    name: str
    description: Optional[str] = None


class MedicineFormulaCreate(MedicineFormulaBase):
    pass


class MedicineFormulaUpdate(MedicineFormulaBase):
    pass


class MedicineFormulaResponse(MedicineFormulaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PagedMedicineFormulaResponse(BaseModel):
    items: list[MedicineFormulaResponse]
    total: int
    skip: int = 0
    limit: int = 50
