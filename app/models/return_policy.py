from datetime import datetime
from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class ReturnPolicy(Base, IdIntPK, TimestampMixin):
    __tablename__ = "return_policies"

    description: Mapped[str] = mapped_column(String(1000), nullable=False)
