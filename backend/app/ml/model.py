import os
import pickle
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from .dataset_generator import generate_dataset

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "absenteeism_model.pkl")
CSV_PATH = os.path.join(MODEL_DIR, "historical_data.csv")

def get_or_train_model():
    # If the model is already trained, load and return it
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                return pickle.load(f)
        except Exception:
            pass  # If pickle loads fail, retrain

    # Ensure training CSV dataset exists
    if not os.path.exists(CSV_PATH):
        generate_dataset(CSV_PATH)
        
    # Read the dataset
    df = pd.read_csv(CSV_PATH)
    
    features = [
        "school_id", 
        "month", 
        "avg_temperature", 
        "rainfall_mm", 
        "health_campaign_active", 
        "recent_symptom_count"
    ]
    
    X = df[features]
    y = df["absenteeism_rate"]
    
    # Train the regressor
    print("Training RandomForest model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Cache the trained model
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
        
    print("Model trained and cached successfully.")
    return model

def predict_absenteeism(
    school_id: int, 
    month: int, 
    avg_temp: float, 
    rainfall: float, 
    health_campaign: bool, 
    recent_symptoms: int
):
    model = get_or_train_model()
    
    # Build dataframe for scikit-learn
    features = pd.DataFrame([{
        "school_id": school_id,
        "month": month,
        "avg_temperature": avg_temp,
        "rainfall_mm": rainfall,
        "health_campaign_active": 1 if health_campaign else 0,
        "recent_symptom_count": recent_symptoms
    }])
    
    # Perform prediction
    predicted_rate = float(model.predict(features)[0])
    return predicted_rate
