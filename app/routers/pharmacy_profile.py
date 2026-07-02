from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.pharmacy_profile import PharmacyProfile
from app.schemas.pharmacy_profile import PharmacyProfileResponse, PharmacyProfileUpdate

router = APIRouter()


def get_or_create_profile(db: Session) -> PharmacyProfile:
    profile = db.query(PharmacyProfile).order_by(PharmacyProfile.id.asc()).first()
    if profile:
        return profile
    profile = PharmacyProfile()
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/api/pharmacy-profile", response_model=PharmacyProfileResponse)
def read_pharmacy_profile(db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    return get_or_create_profile(db)


@router.put("/api/pharmacy-profile", response_model=PharmacyProfileResponse)
def update_pharmacy_profile(
    profile_in: PharmacyProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    profile = get_or_create_profile(db)
    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
