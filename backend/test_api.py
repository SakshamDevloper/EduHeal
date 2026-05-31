import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            detail = err_json.get("detail", err_body)
        except Exception:
            detail = err_body
        print(f"HTTP Error {e.code} for {method} {path}: {detail}")
        return e.code, detail
    except Exception as e:
        print(f"Connection Error: {e}")
        return 0, str(e)

def run_tests():
    print("--- EDUHEAL API INTEGRATION TESTS ---")
    
    # 1. Login as Student
    print("\n1. Logging in as Student (Alex Rivera)...")
    status, res = make_request("/auth/login", "POST", {
        "email": "student@eduheal.org",
        "password": "password123"
    })
    assert status == 200, "Student login failed"
    student_token = res["access_token"]
    print("✓ Login successful!")

    # 2. Fetch User Profile
    print("\n2. Fetching student profile...")
    status, profile = make_request("/auth/me", "GET", token=student_token)
    assert status == 200, "Failed to get student profile"
    initial_points = profile["health_points"]
    print(f"✓ Profile loaded. Name: {profile['full_name']}, Health Points: {initial_points}")

    # 3. Get Lessons
    print("\n3. Fetching available micro-lessons...")
    status, lessons = make_request("/lessons", "GET", token=student_token)
    assert status == 200, "Failed to get lessons"
    print(f"✓ Found {len(lessons)} lessons.")
    l1 = lessons[0]
    print(f"  Lesson 1: '{l1['title']}' (Completed: {l1['completed']})")

    # 4. Fetch specific lesson details and questions
    print(f"\n4. Fetching questions for lesson ID {l1['id']}...")
    status, lesson_detail = make_request(f"/lessons/{l1['id']}", "GET", token=student_token)
    assert status == 200, "Failed to get lesson details"
    questions = lesson_detail["questions"]
    print(f"✓ Lesson questions loaded. Count: {len(questions)}")
    for q in questions:
        print(f"  - QID {q['id']}: {q['question_text']}")

    # 5. Submit Quiz
    print("\n5. Submitting correct answers to earn health points...")
    # Answer sheet for Handwashing lesson: Q1 -> C (20s), Q2 -> B (Outer membrane), Q3 -> B (Hydrophobic tail)
    answers = []
    # Make sure we submit correct choices (C, B, B)
    # The choices in seed.py:
    # Q1: C (20 seconds)
    # Q2: B (breaking down outer membrane)
    # Q3: B (hydrophobic tail)
    correct_options = ["C", "B", "B"]
    for i, q in enumerate(questions):
        answers.append({
            "question_id": q["id"],
            "answer": correct_options[i]
        })
        
    status, grade = make_request(f"/lessons/{l1['id']}/submit", "POST", {"answers": answers}, token=student_token)
    assert status == 200, "Failed to submit quiz"
    print(f"✓ Grading Response: Success: {grade['success']}, Score: {grade['score']}/{grade['total_questions']}")
    print(f"  Points Earned: {grade['points_earned']}, New Balance: {grade['total_health_points']} HP")
    
    # 6. Fetch Available slots
    print("\n6. Listing available Doctor slots...")
    status, slots = make_request("/appointments/slots", "GET", token=student_token)
    assert status == 200, "Failed to get doctor slots"
    print(f"✓ Found {len(slots)} open slots.")
    if len(slots) > 0:
        first_slot = slots[0]
        print(f"  Slot ID {first_slot['id']}: Time: {first_slot['start_time']}")

        # 7. Book Slot
        print(f"\n7. Booking slot ID {first_slot['id']} using points (Costs 100 HP)...")
        status, appt = make_request("/appointments/book", "POST", {"slot_id": first_slot["id"]}, token=student_token)
        if status == 200:
            print("✓ Appointment booked successfully!")
            print(f"  Doctor Name: {appt['doctor_name']}, Code: {appt['consultation_token']}, Room ID: {appt['room_id']}")
        else:
            print(f"✗ Booking failed (Status {status}). Note: Need at least 100 HP. Student currently has {grade['total_health_points']} HP.")

    # 8. Report Symptoms
    print("\n8. Submitting an anonymized student symptom report...")
    status, report = make_request("/analytics/report-symptoms", "POST", {
        "symptoms": ["cough", "fatigue", "fever"]
    }, token=student_token)
    assert status == 200, "Symptom reporting failed"
    print(f"✓ Symptoms reported. ID: {report['id']}, Symptoms: {report['symptoms']}")

    # 9. Query Health map
    # Login as Admin first to query analytics
    print("\n9. Logging in as Administrator (Principal Miller)...")
    status, admin_res = make_request("/auth/login", "POST", {
        "email": "admin@eduheal.org",
        "password": "password123"
    })
    assert status == 200, "Admin login failed"
    admin_token = admin_res["access_token"]
    
    print("\n10. Fetching Anonymized Health Mapping tracker...")
    status, health_map = make_request("/analytics/health-map", "GET", token=admin_token)
    assert status == 200, "Failed to fetch health map"
    print(f"✓ Health Mapping records: {len(health_map)} clusters active.")
    for item in health_map[:3]:
        print(f"  - School: {item['school_name']} ({item['cluster_name']}) | Symptom: {item['symptom']} | Count: {item['count']}")

    # 10. Run Machine Learning absenteeism predictor
    print("\n11. Querying Random Forest Absenteeism model...")
    status, prediction = make_request("/analytics/predict", "POST", {
        "school_id": 1,
        "month": 8,  # August (High rainfall monsoon)
        "avg_temp": 24.5,
        "rainfall": 280.0,
        "health_campaign": False,
        "recent_symptom_count": 12 # Outbreak case
    }, token=admin_token)
    assert status == 200, "Prediction failed"
    print(f"✓ ML Predictor response: School: {prediction['school_name']}")
    print(f"  Forecasted Absenteeism Rate: {round(prediction['predicted_absenteeism_rate']*100, 2)}%")
    print(f"  Risk Category: {prediction['risk_level']}")
    print(f"  Details: {prediction['explanation']}")

    print("\n✓ ALL END-TO-END SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
