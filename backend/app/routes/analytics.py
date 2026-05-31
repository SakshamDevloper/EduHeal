from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from .. import models, schemas, database
from .auth import get_current_user
from ..ml.model import predict_absenteeism

router = APIRouter(prefix="/analytics", tags=["Insights & Analytics"])

@router.post("/report-symptoms", response_model=schemas.SymptomReportOut)
def report_symptoms(
    report_in: schemas.SymptomReportCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "student_parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students/parents can report symptoms"
        )
    
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a school to report symptoms"
        )

    # Convert list of symptoms to a comma-separated string
    symptoms_str = ",".join([s.strip().lower() for s in report_in.symptoms if s.strip()])
    if not symptoms_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symptom list cannot be empty"
        )

    new_report = models.SymptomReport(
        student_id=current_user.id,
        school_id=current_user.school_id,
        symptoms=symptoms_str,
        reported_at=datetime.utcnow()
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.get("/health-map", response_model=List[schemas.SymptomHeatmapItem])
def get_health_map(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Fetch all symptom reports
    reports = db.query(models.SymptomReport).all()
    
    # Simple in-memory aggregation of symptoms by school
    aggregation = {}
    for r in reports:
        school = db.query(models.School).filter(models.School.id == r.school_id).first()
        if not school:
            continue
            
        symptoms_list = r.symptoms.split(",")
        for sym in symptoms_list:
            sym = sym.strip().capitalize()
            key = (r.school_id, school.name, school.cluster_name, sym)
            aggregation[key] = aggregation.get(key, 0) + 1
            
    result = []
    for key, count in aggregation.items():
        school_id, school_name, cluster_name, symptom = key
        result.append(schemas.SymptomHeatmapItem(
            school_id=school_id,
            school_name=school_name,
            cluster_name=cluster_name,
            symptom=symptom,
            count=count
        ))
        
    return sorted(result, key=lambda x: x.count, reverse=True)

@router.post("/predict", response_model=schemas.PredictResponse)
def get_absenteeism_prediction(
    req: schemas.PredictRequest, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    school = db.query(models.School).filter(models.School.id == req.school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    # Use ML model to predict
    try:
        predicted_rate = predict_absenteeism(
            school_id=req.school_id,
            month=req.month,
            avg_temp=req.avg_temp,
            rainfall=req.rainfall,
            health_campaign=req.health_campaign,
            recent_symptoms=req.recent_symptom_count
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Machine Learning model inference failed: {str(e)}"
        )

    # Formulate risk level
    if predicted_rate >= 0.12:
        risk_level = "High"
    elif predicted_rate >= 0.06:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Build a helpful explanation
    factors = []
    if req.recent_symptom_count > 10:
        factors.append(f"a high number of active symptom reports ({req.recent_symptom_count} reports)")
    if req.rainfall > 200:
        factors.append("heavy monsoon rainfall causing transportation issues")
    if req.avg_temp > 38 or req.avg_temp < 12:
        factors.append("extreme weather conditions")
    if req.health_campaign:
        factors.append("mitigation from active sanitation/hygiene awareness campaign")
    
    factor_str = ", ".join(factors)
    if not factor_str:
        factor_str = "normal baseline seasonal variables"
        
    explanation = f"Predictive model forecasts an absenteeism rate of {round(predicted_rate * 100, 2)}% for {school.name} (Risk: {risk_level}). This is driven by {factor_str}."

    return schemas.PredictResponse(
        school_name=school.name,
        predicted_absenteeism_rate=predicted_rate,
        risk_level=risk_level,
        explanation=explanation
    )
