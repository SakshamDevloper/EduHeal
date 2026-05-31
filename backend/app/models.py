import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cluster_name = Column(String, nullable=False)  # e.g. "Zone A", "Zone B"

    # Relationships
    users = relationship("User", back_populates="school")
    attendance_records = relationship("SchoolAttendance", back_populates="school")
    symptom_reports = relationship("SymptomReport", back_populates="school")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "student_parent", "doctor", "school_admin"
    health_points = Column(Integer, default=0)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)

    # Relationships
    school = relationship("School", back_populates="users")
    quiz_progress = relationship("StudentQuizProgress", back_populates="student")
    symptom_reports = relationship("SymptomReport", back_populates="student")
    
    # Appointments as a student
    student_appointments = relationship(
        "Appointment", 
        foreign_keys="Appointment.student_id", 
        back_populates="student"
    )
    
    # Appointments as a doctor
    doctor_appointments = relationship(
        "Appointment", 
        foreign_keys="Appointment.doctor_id", 
        back_populates="doctor"
    )
    
    # Availability slots as a doctor
    availability_slots = relationship("AvailabilitySlot", back_populates="doctor")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    content_markdown = Column(String, nullable=False)
    points_value = Column(Integer, default=50)

    # Relationships
    questions = relationship("QuizQuestion", back_populates="lesson", cascade="all, delete-orphan")
    student_progress = relationship("StudentQuizProgress", back_populates="lesson", cascade="all, delete-orphan")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    question_text = Column(String, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_option = Column(String, nullable=False)  # "A", "B", "C", "D"

    # Relationships
    lesson = relationship("Lesson", back_populates="questions")

class StudentQuizProgress(Base):
    __tablename__ = "student_quiz_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
    score_obtained = Column(Integer, nullable=False)

    # Relationships
    student = relationship("User", back_populates="quiz_progress")
    lesson = relationship("Lesson", back_populates="student_progress")

class SymptomReport(Base):
    __tablename__ = "symptom_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    symptoms = Column(String, nullable=False)  # Comma-separated list of symptoms
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="symptom_reports")
    school = relationship("School", back_populates="symptom_reports")

class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False)

    # Relationships
    doctor = relationship("User", back_populates="availability_slots")
    appointment = relationship("Appointment", back_populates="slot", uselist=False)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("availability_slots.id"), nullable=False)
    status = Column(String, default="booked")  # "booked", "completed", "cancelled"
    consultation_token = Column(String, nullable=True)  # Vouchers used for booking
    room_id = Column(String, nullable=False)  # WebRTC Room Session ID
    scheduled_time = Column(DateTime, nullable=False)

    # Relationships
    student = relationship("User", foreign_keys=[student_id], back_populates="student_appointments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_appointments")
    slot = relationship("AvailabilitySlot", back_populates="appointment")

class SchoolAttendance(Base):
    __tablename__ = "school_attendance"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    date = Column(Date, nullable=False)
    absenteeism_rate = Column(Float, nullable=False)  # Percentage, e.g., 0.05 for 5%
    average_temperature = Column(Float, nullable=True)  # in Celsius
    rainfall_mm = Column(Float, nullable=True)  # in mm
    health_campaign_active = Column(Boolean, default=False)

    # Relationships
    school = relationship("School", back_populates="attendance_records")
