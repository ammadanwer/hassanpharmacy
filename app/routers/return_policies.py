from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.return_policy import ReturnPolicy
from app.schemas.return_policy import (
    ReturnPolicyCreate,
    ReturnPolicyUpdate,
    ReturnPolicyResponse,
)

router = APIRouter()


@router.get("/api/return-policies", response_model=list[ReturnPolicyResponse])
def list_return_policies(db: Annotated[Session, Depends(get_db)], current_user: CurrentUser, skip: int = 0, limit: int = 100):
    return db.query(ReturnPolicy).order_by(ReturnPolicy.id.desc()).offset(skip).limit(limit).all()


@router.post("/api/return-policies", response_model=ReturnPolicyResponse, status_code=201)
def create_return_policy(policy_in: ReturnPolicyCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    policy = ReturnPolicy(**policy_in.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/api/return-policies/{policy_id}", response_model=ReturnPolicyResponse)
def update_return_policy(policy_id: int, policy_in: ReturnPolicyUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    policy = db.get(ReturnPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Return policy not found")
    for field, value in policy_in.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)
    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/api/return-policies/{policy_id}")
def delete_return_policy(policy_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    policy = db.get(ReturnPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Return policy not found")
    db.delete(policy)
    db.commit()
    return {"message": "Return policy deleted"}
