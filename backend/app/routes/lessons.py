from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from .. import models, schemas, database
from .auth import get_current_user

router = APIRouter(prefix="/lessons", tags=["Lessons & Quizzes"])

@router.get("", response_model=List[schemas.LessonBriefOut])
def list_lessons(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    lessons = db.query(models.Lesson).all()
    
    # Check completion status for the student
    completed_lesson_ids = set()
    if current_user.role == "student_parent":
        progress = db.query(models.StudentQuizProgress.lesson_id)\
            .filter(models.StudentQuizProgress.student_id == current_user.id).all()
        completed_lesson_ids = {item[0] for item in progress}

    result = []
    for l in lessons:
        result.append(schemas.LessonBriefOut(
            id=l.id,
            title=l.title,
            description=l.description,
            points_value=l.points_value,
            completed=l.id in completed_lesson_ids
        ))
    return result

@router.get("/{lesson_id}", response_model=schemas.LessonOut)
def get_lesson(lesson_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    return lesson

@router.post("/{lesson_id}/submit", response_model=schemas.QuizGradingResponse)
def submit_quiz(
    lesson_id: int, 
    submission: schemas.QuizSubmission, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "student_parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can take quizzes"
        )

    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    # Check if student already completed the quiz
    existing_progress = db.query(models.StudentQuizProgress)\
        .filter(models.StudentQuizProgress.student_id == current_user.id, models.StudentQuizProgress.lesson_id == lesson_id).first()
    
    questions = lesson.questions
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This lesson has no quiz questions"
        )

    question_map = {q.id: q for q in questions}
    
    # Calculate score
    correct_count = 0
    submitted_qids = set()
    for ans in submission.answers:
        if ans.question_id not in question_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question ID {ans.question_id} does not belong to this lesson"
            )
        if ans.question_id in submitted_qids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate question submissions"
            )
        submitted_qids.add(ans.question_id)
        
        question = question_map[ans.question_id]
        if ans.answer.upper() == question.correct_option.upper():
            correct_count += 1

    # Must submit all questions
    if len(submitted_qids) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must answer all questions in the quiz"
        )

    # Score calculation
    total_q = len(questions)
    percentage = (correct_count / total_q) * 100
    passed = percentage >= 70.0  # Pass threshold
    
    points_earned = 0
    # Reward points if passed and first time completing
    if passed and not existing_progress:
        points_earned = lesson.points_value
        current_user.health_points += points_earned
        
        # Save progress
        new_progress = models.StudentQuizProgress(
            student_id=current_user.id,
            lesson_id=lesson_id,
            score_obtained=correct_count,
            completed_at=datetime.utcnow()
        )
        db.add(new_progress)
        db.commit()
    elif passed and existing_progress:
        # Passed but already completed before
        points_earned = 0
    
    db.commit()
    db.refresh(current_user)

    return schemas.QuizGradingResponse(
        success=passed,
        score=correct_count,
        total_questions=total_q,
        points_earned=points_earned,
        correct_answers=correct_count,
        total_health_points=current_user.health_points
    )
