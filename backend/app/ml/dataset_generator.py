import csv
import random
import os

def poisson_variate(lmbda):
    import math
    if lmbda <= 0:
        return 0
    if lmbda < 30:
        L = math.exp(-lmbda)
        k = 0
        p = 1.0
        while p > L:
            k += 1
            p *= random.random()
        return k - 1
    else:
        val = random.normalvariate(lmbda, math.sqrt(lmbda))
        return max(0, int(round(val)))

def generate_dataset(output_path: str):
    schools = [
        {"id": 1, "name": "Greenwood Public School", "cluster": "North District", "base_rate": 0.05},
        {"id": 2, "name": "Riverside Academy", "cluster": "East District", "base_rate": 0.08},
        {"id": 3, "name": "Sunset Valley High", "cluster": "South District", "base_rate": 0.04}
    ]
    
    headers = [
        "school_id", 
        "month", 
        "avg_temperature", 
        "rainfall_mm", 
        "health_campaign_active", 
        "recent_symptom_count", 
        "absenteeism_rate"
    ]
    
    # We will generate about 1200 rows of data (simulating daily or weekly reports across multiple years)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        
        for school in schools:
            # Simulate records for the past 4 years (approx 4 * 365 = 1460 days, we'll do weekly reports ~200 records per school)
            for week in range(200):
                # Seasonality based on month
                month = random.randint(1, 12)
                
                # Temp based on month (assuming warm months: 5-8, cold months: 11-1)
                if month in [5, 6, 7, 8]:
                    temp = random.uniform(30.0, 42.0)
                    rain = random.uniform(0.0, 50.0)
                elif month in [11, 12, 1]:
                    temp = random.uniform(10.0, 20.0)
                    rain = random.uniform(0.0, 10.0)
                else:  # Monsoon / transitions
                    temp = random.uniform(22.0, 32.0)
                    rain = random.uniform(100.0, 350.0) # High rain
                
                # Recent symptom reports
                symptom_base = 2 if school["id"] == 3 else (5 if school["id"] == 1 else 8)
                # Symptom reports spike during monsoon (high rain) or winter (low temp)
                symptom_mult = 1.0
                if rain > 200:
                    symptom_mult += 1.5
                if temp < 15:
                    symptom_mult += 1.0
                    
                recent_symptoms = poisson_variate(symptom_base * symptom_mult)
                recent_symptoms = max(0, recent_symptoms)
                
                # Campaign active (15% chance)
                campaign = 1 if random.random() < 0.15 else 0
                
                # Absenteeism Rate calculation (Target)
                # Base rate + climate impacts + health impact - campaign impact + noise
                rate = school["base_rate"]
                
                # Rain impact: if rain is very high (monsoon), absenteeism increases due to waterborne illness / transport
                if rain > 150:
                    rate += 0.04
                
                # Extreme heat or cold impact
                if temp > 38 or temp < 12:
                    rate += 0.02
                
                # Symptoms impact: major driver
                rate += (recent_symptoms * 0.008)
                
                # Campaign reduces absenteeism
                if campaign == 1:
                    rate -= 0.025
                    
                # Add random noise
                rate += random.uniform(-0.015, 0.015)
                
                # Bounds
                rate = max(0.01, min(0.35, rate))
                
                writer.writerow([
                    school["id"],
                    month,
                    round(temp, 1),
                    round(rain, 1),
                    campaign,
                    recent_symptoms,
                    round(rate, 4)
                ])
                
    print(f"Generated synthetic training dataset with {200 * len(schools)} rows at {output_path}")

if __name__ == "__main__":
    generate_dataset("historical_data.csv")
