from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date

# School Schemas
class SchoolBase(BaseModel):
    name: str
    cluster_name: str

class SchoolCreate(SchoolBase):
    pass

class SchoolOut(SchoolBase):
    id: int
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # "student_parent", "doctor", "school_admin"

class UserCreate(UserBase):
    password: str
    school_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    health_points: int
    school_id: Optional[int] = None
    school: Optional[SchoolOut] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Lesson & Quiz Schemas
class QuizQuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    class Config:
        from_attributes = True

class LessonBase(BaseModel):
    title: str
    description: str
    content_markdown: str
    points_value: int

class LessonOut(LessonBase):
    id: int
    questions: List[QuizQuestionOut] = []
    class Config:
        from_attributes = True

class LessonBriefOut(BaseModel):
    id: int
    title: str
    description: str
    points_value: int
    completed: Optional[bool] = False
    class Config:
        from_attributes = True

class QuizAnswerSubmit(BaseModel):
    question_id: int
    answer: str  # "A", "B", "C", "D"

class QuizSubmission(BaseModel):
    answers: List[QuizAnswerSubmit]

class QuizGradingResponse(BaseModel):
    success: bool
    score: int
    total_questions: int
    points_earned: int
    correct_answers: int
    total_health_points: int

# Symptom Report Schemas
class SymptomReportCreate(BaseModel):
    symptoms: List[str]  # e.g., ["fever", "cough"]

class SymptomReportOut(BaseModel):
    id: int
    student_id: int
    school_id: int
    symptoms: str
    reported_at: datetime
    class Config:
        from_attributes = True

# Appointment & Slot Schemas
class SlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime

class SlotOut(BaseModel):
    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    is_booked: bool
    class Config:
        from_attributes = True

class AppointmentBook(BaseModel):
    slot_id: int

class AppointmentOut(BaseModel):
    id: int
    student_id: int
    doctor_id: int
    slot_id: int
    status: str
    consultation_token: Optional[str] = None
    room_id: str
    scheduled_time: datetime
    doctor_name: Optional[str] = None
    student_name: Optional[str] = None
    class Config:
        from_attributes = True

# Analytics / Health Mapping Schemas
class SchoolAttendanceOut(BaseModel):
    id: int
    school_id: int
    date: date
    absenteeism_rate: float
    average_temperature: Optional[float] = None
    rainfall_mm: Optional[float] = None
    health_campaign_active: bool
    class Config:
        from_attributes = True

class PredictRequest(BaseModel):
    school_id: int
    month: int  # 1-12
    avg_temp: float
    rainfall: float
    health_campaign: bool
    recent_symptom_count: int  # Number of symptoms reported recently in the school

class PredictResponse(BaseModel):
    school_name: str
    predicted_absenteeism_rate: float
    risk_level: str  # "Low", "Medium", "High"
    explanation: str

class SymptomHeatmapItem(BaseModel):
    school_id: int
    school_name: str
    cluster_name: str
    symptom: str
    count: int
