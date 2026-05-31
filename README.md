# EduHeal 🏥

An intelligent, full-stack digital health and gamified learning platform built to bridge the gap between **health literacy** and **healthcare access** in underserved communities. 

EduHeal gamifies health education for students through bite-sized micro-lessons and quizzes. Completing tasks rewards users with **Health Points**, which parents can securely redeem for **Consultation Tokens** to book real-time, built-in telemedicine appointments with volunteer doctors.

---

## 🚀 Key Features

* **Gamified Learning Engine:** Interactive, low-bandwidth micro-lessons and quizzes on sanitation, hygiene, and nutrition.
* **ACID-Compliant Point Ledger:** Secure reward validation preventing point manipulation, double-spending, or front-running vulnerabilities.
* **Telemedicine & Scheduling Hub:** In-app real-time appointment booking matrix for healthcare providers and patients.
* **Embedded WebRTC Consultations:** In-app video/audio consultation streams with automatic low-bandwidth fallbacks.
* **Predictive Analytics Core:** A Python-based ML layer that maps regional symptom clusters and runs classification models to forecast school absenteeism trends.

---

## 🛠️ Tech Stack

### Backend & API
* **Language/Framework:** Python 3.11+ via **FastAPI** (Async, high-performance ASGI framework)
* **ORM/Validation:** **SQLModel** (Combining SQLAlchemy Core/ORM capabilities with Pydantic data validation)
* **Dependency & Env Management:** **Poetry** * **Database Migrations:** **Alembic** (Versioned, programmatic schema generation)

### Storage & Real-Time Sync
* **Primary Relational DB (SSOT):** **PostgreSQL** (Enforcing transactional boundaries, foreign key constraints, and scheduling availability state logic)
* **Real-time Client Cache:** **Cloud Firestore** (Utilized as an optimistic, read-only cache layer enabling flawless client performance under intermittent network dropouts)

### Media & Core Infrastructure
* **Telemedicine Video Streams:** **Agora.io SDK** (Server-side dynamic dynamic token signing with strict 1-hour TTL constraints)
* **Secrets Containment:** **Google Cloud Secret Manager** * **Dynamic Configuration:** **Firebase Remote Config** (Client-side feature flag and UI toggles managed completely decoupled from static build bundles)

### Data Science & Analytics Vertex
* **Machine Learning Engine:** **Scikit-Learn** (Random Forest / Logistic Regression deployment configurations)
* **Data Processing Pipeline:** **Pandas** & **NumPy**
* **Enterprise Warehouse Sink:** **Google Cloud BigQuery** (Automated event telemetry export from Firebase clients for feature mapping)

---

## 🔒 Security Architecture

* **Zero Client-Side Writes:** Firebase Security Rules explicitly block all direct client modifications (`allow write: if false;`) on transactional schemas. All data mutation requests must invoke authenticated, server-side FastAPI router gateways.
* **Auditability via CDC:** PostgreSQL configuration runs `wal_level = logical` to stream atomic updates out of operational balance tables through Change Data Capture pipelines directly into append-only compliance buckets.
* **Principle of Least Privilege:** Infrastructure nodes use isolated Cloud IAM Service Accounts restricted exclusively to required runtime roles (`roles/datastore.user`, `roles/secretmanager.secretAccessor`).

---

## 📦 Getting Started (Local Development)

### Prerequisites
* Python 3.11+
* PostgreSQL Database Instance
* Poetry Package Manager

### Installation & Execution

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone [https://github.com/SakshamDevloper/EduHeal.git](https://github.com/SakshamDevloper/EduHeal.git)
   cd EduHeal
