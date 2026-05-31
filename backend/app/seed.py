import bcrypt
from datetime import datetime, date, timedelta
from .database import SessionLocal, Base, engine
from . import models

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def seed_db():
    print("Dropping tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("Seeding schools...")
        schools = [
            models.School(name="Greenwood Public School", cluster_name="North District"),
            models.School(name="Riverside Academy", cluster_name="East District"),
            models.School(name="Sunset Valley High", cluster_name="South District")
        ]
        for s in schools:
            db.add(s)
        db.commit()
        
        # Reload schools to get IDs
        school_greenwood = db.query(models.School).filter(models.School.name == "Greenwood Public School").first()
        school_riverside = db.query(models.School).filter(models.School.name == "Riverside Academy").first()
        school_sunset = db.query(models.School).filter(models.School.name == "Sunset Valley High").first()

        print("Seeding users...")
        users = [
            models.User(
                email="doctor@eduheal.org",
                password_hash=get_password_hash("password123"),
                full_name="Dr. Sarah Jenkins",
                role="doctor",
                health_points=0
            ),
            models.User(
                email="student@eduheal.org",
                password_hash=get_password_hash("password123"),
                full_name="Alex Rivera",
                role="student_parent",
                health_points=50,  # Starts with 50 points so they only need one quiz to book a consultation!
                school_id=school_greenwood.id
            ),
            models.User(
                email="admin@eduheal.org",
                password_hash=get_password_hash("password123"),
                full_name="Principal Miller",
                role="school_admin",
                health_points=0,
                school_id=school_greenwood.id
            )
        ]
        for u in users:
            db.add(u)
        db.commit()

        print("Seeding lessons & quizzes...")
        # Lesson 1
        l1 = models.Lesson(
            title="The Science of Handwashing",
            description="Learn how washing your hands with soap kills germs and prevents infections.",
            content_markdown="""# The Science of Handwashing

Washing hands with soap and clean water is one of the most effective ways to prevent the spread of diseases. 

## How Soap Works
At the molecular level, soap molecules have a double nature:
1. **Hydrophilic Head**: Attracted to water.
2. **Hydrophobic Tail**: Attracted to fats and oils.

Many viruses (like influenza or coronaviruses) are enveloped in a protective lipid (fatty) membrane. When you wash your hands, the hydrophobic tails of the soap molecules wedge themselves into the lipid membrane and **break it apart**, rendering the virus inactive!

## The 20-Second Rule
Scrubbing your hands creates friction, which helps lift germs and dirt from the skin. To do it effectively, you must scrub for **at least 20 seconds**—roughly the time it takes to sing the 'Happy Birthday' song twice. 

Make sure to scrub:
* The backs of your hands
* Between your fingers
* Under your fingernails
""",
            points_value=50
        )
        db.add(l1)
        db.commit()
        db.refresh(l1)

        q1 = [
            models.QuizQuestion(
                lesson_id=l1.id,
                question_text="How long should you scrub your hands with soap to effectively remove germs?",
                option_a="5 seconds",
                option_b="10 seconds",
                option_c="20 seconds",
                option_d="1 minute",
                correct_option="C"
            ),
            models.QuizQuestion(
                lesson_id=l1.id,
                question_text="How does soap destroy lipid-enveloped viruses?",
                option_a="By freezing them",
                option_b="By breaking down their fatty outer membrane",
                option_c="By drying them out",
                option_d="By changing their DNA",
                correct_option="B"
            ),
            models.QuizQuestion(
                lesson_id=l1.id,
                question_text="Which part of the soap molecule is attracted to grease and fats?",
                option_a="The hydrophilic head",
                option_b="The hydrophobic tail",
                option_c="The electrical charge",
                option_d="The oxygen atom",
                correct_option="B"
            )
        ]
        for q in q1:
            db.add(q)

        # Lesson 2
        l2 = models.Lesson(
            title="Nutrition & Balanced Diet",
            description="Explore carbohydrates, proteins, fats, and how micro-nutrients support your immune system.",
            content_markdown="""# Nutrition & Balanced Diet

Eating a wide variety of nutritious foods provides the energy and compounds your body needs to grow and stay healthy.

## Macro-nutrients vs Micro-nutrients
* **Carbohydrates**: Your body's primary energy source (found in grains, fruits, vegetables).
* **Proteins**: The building blocks for muscle growth, tissue repair, and immune cells (found in beans, eggs, nuts, meat).
* **Fats**: Essential for hormone production and brain health.
* **Micro-nutrients**: Vitamins and minerals that support biochemical reactions.

## Immunity Boosters
Vitamins play a critical role in defense:
1. **Vitamin C**: A powerful antioxidant that supports various cellular functions of the immune system. Found in oranges, bell peppers, and strawberries.
2. **Iron**: Vital for producing hemoglobin, which transports oxygen in blood cells. Found in spinach, lentils, and lean meat.
""",
            points_value=50
        )
        db.add(l2)
        db.commit()
        db.refresh(l2)

        q2 = [
            models.QuizQuestion(
                lesson_id=l2.id,
                question_text="Which macronutrient is the primary building block for muscles and immune cells?",
                option_a="Carbohydrates",
                option_b="Fats",
                option_c="Proteins",
                option_d="Sodium",
                correct_option="C"
            ),
            models.QuizQuestion(
                lesson_id=l2.id,
                question_text="What mineral is essential for red blood cells to transport oxygen throughout the body?",
                option_a="Calcium",
                option_b="Iron",
                option_c="Potassium",
                option_d="Magnesium",
                correct_option="B"
            ),
            models.QuizQuestion(
                lesson_id=l2.id,
                question_text="Which vitamin is a powerful antioxidant commonly found in citrus fruits that boosts immunity?",
                option_a="Vitamin B12",
                option_b="Vitamin D",
                option_c="Vitamin C",
                option_d="Vitamin K",
                correct_option="C"
            )
        ]
        for q in q2:
            db.add(q)

        # Lesson 3
        l3 = models.Lesson(
            title="Mental Well-being & Sleep",
            description="Understand stress, emotional resilience, and the biological importance of a good sleep schedule.",
            content_markdown="""# Mental Well-being & Sleep

Your brain and body need rest and care just as much as they need food and exercise.

## Why Sleep Matters
During sleep, your brain is busy clearing out toxins, consolidating memories, and repairing tissues. Teenagers and children need **8 to 9 hours** of sleep each night to maintain optimal immune function, cognitive performance, and emotional regulation. Chronic sleep deprivation weakens immunity and increases stress hormones.

## Emotional Health
Stress is a natural physical reaction. However, chronic stress raises cortisol levels. Healthy ways to handle stress include:
* **Deep Breathing**: Slows heart rate and calms the nervous system.
* **Regular Activity**: Releases endorphins ("happy chemicals").
* **Speaking up**: Sharing worries with parents, teachers, or counselors.
""",
            points_value=50
        )
        db.add(l3)
        db.commit()
        db.refresh(l3)

        q3 = [
            models.QuizQuestion(
                lesson_id=l3.id,
                question_text="How many hours of sleep are recommended per night for optimal brain and immune function?",
                option_a="5-6 hours",
                option_b="8-9 hours",
                option_c="11-12 hours",
                option_d="4 hours",
                correct_option="B"
            ),
            models.QuizQuestion(
                lesson_id=l3.id,
                question_text="Which hormone is released in response to stress and can suppress immune function over time?",
                option_a="Insulin",
                option_b="Melatonin",
                option_c="Cortisol",
                option_d="Thyroxine",
                correct_option="C"
            ),
            models.QuizQuestion(
                lesson_id=l3.id,
                question_text="What is a healthy, scientifically-backed way to reduce stress levels?",
                option_a="Consuming extra sugar",
                option_b="Physical exercise and deep breathing",
                option_c="Staying awake late to study",
                option_d="Ignoring feelings of worry",
                correct_option="B"
            )
        ]
        for q in q3:
            db.add(q)

        db.commit()

        # Seed mock availability slots for the doctor (today and tomorrow)
        doctor = db.query(models.User).filter(models.User.email == "doctor@eduheal.org").first()
        today = datetime.utcnow().replace(hour=10, minute=0, second=0, microsecond=0)
        
        slots = [
            models.AvailabilitySlot(
                doctor_id=doctor.id,
                start_time=today + timedelta(days=1),
                end_time=today + timedelta(days=1, hours=1),
                is_booked=False
            ),
            models.AvailabilitySlot(
                doctor_id=doctor.id,
                start_time=today + timedelta(days=1, hours=2),
                end_time=today + timedelta(days=1, hours=3),
                is_booked=False
            ),
            models.AvailabilitySlot(
                doctor_id=doctor.id,
                start_time=today + timedelta(days=2),
                end_time=today + timedelta(days=2, hours=1),
                is_booked=False
            )
        ]
        for slot in slots:
            db.add(slot)
        db.commit()

        # Seed some dummy symptom reports for mapping
        student = db.query(models.User).filter(models.User.role == "student_parent").first()
        
        symptom_reports = [
            models.SymptomReport(
                student_id=student.id,
                school_id=school_greenwood.id,
                symptoms="fever,cough,fatigue",
                reported_at=datetime.utcnow() - timedelta(days=3)
            ),
            models.SymptomReport(
                student_id=student.id,
                school_id=school_greenwood.id,
                symptoms="cough,runny nose",
                reported_at=datetime.utcnow() - timedelta(days=2)
            ),
            models.SymptomReport(
                student_id=student.id,
                school_id=school_riverside.id,
                symptoms="fever,headache",
                reported_at=datetime.utcnow() - timedelta(days=1)
            ),
            models.SymptomReport(
                student_id=student.id,
                school_id=school_sunset.id,
                symptoms="stomach ache,nausea",
                reported_at=datetime.utcnow() - timedelta(days=4)
            )
        ]
        for sr in symptom_reports:
            db.add(sr)
        db.commit()

        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
