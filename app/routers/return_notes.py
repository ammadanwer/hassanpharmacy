from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.return_note import ReturnNote
from app.schemas.return_note import (
    ReturnNoteCreate,
    ReturnNoteUpdate,
    ReturnNoteResponse,
)

router = APIRouter()


@router.get("/api/return-notes", response_model=list[ReturnNoteResponse])
def list_return_notes(db: Annotated[Session, Depends(get_db)], current_user: CurrentUser, skip: int = 0, limit: int = 100):
    return db.query(ReturnNote).order_by(ReturnNote.id.asc()).offset(skip).limit(limit).all()


@router.post("/api/return-notes", response_model=ReturnNoteResponse, status_code=201)
def create_return_note(note_in: ReturnNoteCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    note = ReturnNote(**note_in.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/api/return-notes/{note_id}", response_model=ReturnNoteResponse)
def update_return_note(note_id: int, note_in: ReturnNoteUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    note = db.get(ReturnNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Return note not found")
    for field, value in note_in.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/api/return-notes/{note_id}")
def delete_return_note(note_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    note = db.get(ReturnNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Return note not found")
    db.delete(note)
    db.commit()
    return {"message": "Return note deleted"}
