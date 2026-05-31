from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
import random
import string
from datetime import datetime

from .. import models, schemas, database
from .auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["Telemedicine & Booking"])

def generate_consultation_token():
    # e.g., EH-482-938
    part1 = "".join(random.choices(string.digits, k=3))
    part2 = "".join(random.choices(string.digits, k=3))
    return f"EH-{part1}-{part2}"

@router.post("/slots", response_model=schemas.SlotOut)
def create_slot(slot_in: schemas.SlotCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can manage availability slots"
        )
    
    if slot_in.start_time >= slot_in.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )

    # Check for overlaps
    overlapping = db.query(models.AvailabilitySlot).filter(
        models.AvailabilitySlot.doctor_id == current_user.id,
        models.AvailabilitySlot.start_time < slot_in.end_time,
        models.AvailabilitySlot.end_time > slot_in.start_time
    ).first()

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot overlaps with an existing availability slot"
        )

    new_slot = models.AvailabilitySlot(
        doctor_id=current_user.id,
        start_time=slot_in.start_time,
        end_time=slot_in.end_time,
        is_booked=False
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return new_slot

@router.get("/slots", response_model=List[schemas.SlotOut])
def get_slots(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == "doctor":
        # Doctors see all of their own slots
        return db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.doctor_id == current_user.id).all()
    else:
        # Students see all unbooked slots in the future
        now = datetime.utcnow()
        return db.query(models.AvailabilitySlot).filter(
            models.AvailabilitySlot.is_booked == False,
            models.AvailabilitySlot.start_time > now
        ).all()

@router.post("/book", response_model=schemas.AppointmentOut)
def book_appointment(book_in: schemas.AppointmentBook, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "student_parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students/parents can book appointments"
        )

    # Check slot
    slot = db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.id == book_in.slot_id).first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_444_NOT_FOUND,
            detail="Availability slot not found"
        )

    if slot.is_booked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot is already booked"
        )

    # Validate points
    COST_OF_CONSULTATION = 100
    if current_user.health_points < COST_OF_CONSULTATION:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient points. Booking costs {COST_OF_CONSULTATION} points, you have {current_user.health_points} points."
        )

    # Book slot
    slot.is_booked = True
    current_user.health_points -= COST_OF_CONSULTATION

    room_id = f"room-{uuid.uuid4().hex[:12]}"
    token = generate_consultation_token()

    appointment = models.Appointment(
        student_id=current_user.id,
        doctor_id=slot.doctor_id,
        slot_id=slot.id,
        status="booked",
        consultation_token=token,
        room_id=room_id,
        scheduled_time=slot.start_time
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Return formatted appointment output
    doctor = db.query(models.User).filter(models.User.id == appointment.doctor_id).first()
    
    return schemas.AppointmentOut(
        id=appointment.id,
        student_id=appointment.student_id,
        doctor_id=appointment.doctor_id,
        slot_id=appointment.slot_id,
        status=appointment.status,
        consultation_token=appointment.consultation_token,
        room_id=appointment.room_id,
        scheduled_time=appointment.scheduled_time,
        doctor_name=doctor.full_name,
        student_name=current_user.full_name
    )

@router.get("", response_model=List[schemas.AppointmentOut])
def list_appointments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == "doctor":
        appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id == current_user.id).all()
    else:
        appointments = db.query(models.Appointment).filter(models.Appointment.student_id == current_user.id).all()

    result = []
    for appt in appointments:
        student = db.query(models.User).filter(models.User.id == appt.student_id).first()
        doctor = db.query(models.User).filter(models.User.id == appt.doctor_id).first()
        result.append(schemas.AppointmentOut(
            id=appt.id,
            student_id=appt.student_id,
            doctor_id=appt.doctor_id,
            slot_id=appt.slot_id,
            status=appt.status,
            consultation_token=appt.consultation_token,
            room_id=appt.room_id,
            scheduled_time=appt.scheduled_time,
            doctor_name=doctor.full_name if doctor else "Unknown Doctor",
            student_name=student.full_name if student else "Unknown Student"
        ))
    return result

@router.post("/{appt_id}/complete", response_model=schemas.AppointmentOut)
def complete_appointment(appt_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if current_user.id not in [appt.student_id, appt.doctor_id]:
        raise HTTPException(status_code=403, detail="Forbidden")

    appt.status = "completed"
    db.commit()
    db.refresh(appt)

    student = db.query(models.User).filter(models.User.id == appt.student_id).first()
    doctor = db.query(models.User).filter(models.User.id == appt.doctor_id).first()

    return schemas.AppointmentOut(
        id=appt.id,
        student_id=appt.student_id,
        doctor_id=appt.doctor_id,
        slot_id=appt.slot_id,
        status=appt.status,
        consultation_token=appt.consultation_token,
        room_id=appt.room_id,
        scheduled_time=appt.scheduled_time,
        doctor_name=doctor.full_name if doctor else "Unknown Doctor",
        student_name=student.full_name if student else "Unknown Student"
    )
