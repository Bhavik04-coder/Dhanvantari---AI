# Dhanvantari AI - Healthcare Platform

> **AI-Powered Healthcare Platform** combining disease prediction, telemedicine, pharmacy, pathology services, and patient management into a unified digital health ecosystem.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-green)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Internal-red)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [ML Model Details](#-ml-model-details)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Dhanvantari AI** is a comprehensive digital healthcare platform that bridges the gap between patients and healthcare providers through intelligent automation and seamless service integration.

### The Problem We Solve

| Healthcare Challenge | Our Solution |
|---------------------|--------------|
| Doctor shortage (1:1,457 ratio in India) | AI-powered triage and symptom analysis |
| Fragmented health services | Unified platform for all healthcare needs |
| Delayed diagnosis in rural areas | 24/7 AI disease prediction |
| No continuity of care | Integrated patient records and history |
| Overwhelming doctor workload | Automated routine tasks and smart scheduling |

### Platform Statistics

- **631 Disease Classifications** with 86.76% accuracy
- **130+ Symptoms** in searchable database
- **45+ Medicines** from FDA API + Indian catalog
- **Real-time Notifications** for both patients and doctors
- **Google Calendar Integration** for appointments
- **Google Meet Integration** for online consultations
- **Prescription Management** with pharmacy integration
- **Lab Test Booking** with result tracking

---

## ✨ Key Features

### 🏥 For Patients

#### AI Disease Prediction
- Symptom-based ML analysis using graph neural networks
- 669 disease classifications with confidence scoring
- Voice input support via Web Speech API
- Real-time prediction with detailed explanations
- Risk level assessment (High/Medium/Low)

#### Telemedicine Services
- Browse and book appointments with verified doctors
- Online consultations via Google Meet
- Offline clinic visits with location tracking
- Real-time appointment status updates
- Calendar integration for reminders

#### Medicine Ordering
- Browse 45+ medicines with FDA-verified information
- Real-time data from FDA API
- Prescription upload and verification
- Order tracking with delivery estimates
- Secure payment integration
- Prescription refill reminders
- Auto-sync from FDA database

#### Pathology Services
- Book lab tests from home
- Sample collection scheduling
- Digital test reports
- Result notifications
- Test history tracking

#### Health Management
- Personal health diary with mood tracking
- Medical records storage
- Appointment history
- Order tracking dashboard
- Delete pending orders
- Real-time notifications

### 👨‍⚕️ For Doctors

#### Dashboard & Analytics
- Comprehensive patient overview
- Appointment calendar with filters
- Revenue analytics and reports
- Patient demographics insights
- Performance metrics

#### Patient Management
- Complete patient records and history
- Vital signs tracking (BP, heart rate, glucose, temperature)
- Medical history and allergies
- Previous prescriptions and treatments
- Patient communication tools

#### AI Prediction Review
- Review patient-submitted AI predictions
- Approve, modify, or reject predictions
- Add clinical notes and recommendations
- Flag high-risk cases
- Track prediction accuracy

#### Prescription Management
- Digital prescription generator
- Medicine database integration
- Dosage and duration templates
- PDF export and sharing
- Forward to pharmacy

#### Appointment System
- Create and manage appointments
- Confirm/cancel patient requests
- Google Calendar sync
- Google Meet link generation
- Automated notifications

#### Profile & Settings
- Professional profile with verification
- Medical license verification system
- Treatment pricing management
- Consultation fee settings
- Google Meet link configuration
- Live location tracking

#### Lab Test Management
- Order tests for patients
- Track test status
- View and share results
- Lab value interpretation
- Critical result alerts

### 🎨 UI/UX Features

#### Premium Animations
- **Mouse-Controlled Hero**: Interactive 3D rotating image sequence (127 frames)
- **Scroll-Based Animations**: Smooth canvas animations for services
- **Neural Network Background**: Interactive particles with mouse reaction
- **Animated Feature Cards**: Dynamic backgrounds with:
  - AI Diagnosis - Pulsing neural nodes
  - 24/7 Monitoring - EKG heartbeat wave
  - Expert Network - Floating bokeh particles
  - Secure & Private - Digital shield/grid
  - Health Analytics - Growing data pillars
  - Mobile Access - Floating glass UI elements

#### Design System
- **Glassmorphism**: Modern glass-effect cards and overlays
- **Smooth Scroll**: Lenis-powered smooth scrolling
- **Framer Motion**: Professional animations throughout
- **Responsive Design**: Optimized for all devices
- **Dark Mode Support**: Eye-friendly interface
- **Accessibility**: WCAG 2.1 compliant

---

## 🛠️ Tech Stack

### Frontend

```
Next.js 15.1.6          - React framework with App Router
TypeScript 5.0          - Type-safe development
Tailwind CSS 3.4.1      - Utility-first styling
Framer Motion 11.15.0   - Animation library
Lenis 1.1.18            - Smooth scroll
Three.js                - 3D graphics
React Three Fiber       - React renderer for Three.js
Zustand                 - State management
NextAuth.js 4           - Authentication
```

### Backend

```
Next.js API Routes      - RESTful API endpoints
Supabase                - PostgreSQL database
Supabase Realtime       - WebSocket subscriptions
Google Calendar API     - Calendar integration
Google Meet API         - Video consultation
FDA API                 - Medicine data (openFDA)
```

### ML/AI

```
Python 3.8+             - Core language
Flask 3.0.0             - API framework
scikit-learn 1.8.0      - Machine learning
XGBoost (GPU)           - Gradient boosting
Node2Vec                - Graph embeddings
pandas                  - Data processing
joblib                  - Model serialization
```

### DevOps & Tools

```
Git                     - Version control
npm/yarn                - Package management
ESLint                  - Code linting
Prettier                - Code formatting
```

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Patient    │  │    Doctor    │  │    Admin     │      │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes (REST)                       │   │
│  │  /api/patient/*  /api/doctor/*  /api/public/*       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │  Flask API   │  │  Google APIs │
│  PostgreSQL  │  │  ML Service  │  │ Calendar/Meet│
│   Realtime   │  │  (Port 5000) │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Data Flow

#### Patient Booking Appointment

```
Patient Dashboard → POST /api/patient/appointments
                 ↓
         Supabase (appointments table)
                 ↓
         Real-time subscription
                 ↓
         Doctor Dashboard (notification)
                 ↓
         Doctor confirms
                 ↓
         PATCH /api/doctor/appointments
                 ↓
         Google Calendar event created
                 ↓
         Patient receives confirmation
```

#### AI Disease Prediction

```
Patient Input (symptoms) → POST /api/predict
                         ↓
                 Flask ML Server
                         ↓
         XGBoost + Graph Features
                         ↓
         Disease + Confidence + Risk
                         ↓
         Patient Dashboard (results)
                         ↓
         Doctor Dashboard (review queue)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.8+ ([Download](https://www.python.org/))
- **npm** or **yarn**
- **Git** ([Download](https://git-scm.com/))
- **Supabase Account** ([Sign up](https://supabase.com/))
- **Google Cloud Account** (for OAuth and APIs)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Akhilesh-Gangawane/HumanDiseaseDetector.git
cd HumanDiseaseDetector
```

#### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your environment variables
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=your-secret-key
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

#### 3. Database Setup

```bash
# 1. Create a Supabase project at https://supabase.com
# 2. Go to SQL Editor
# 3. Copy contents of combined_supabase.sql
# 4. Paste and run the SQL script
# 5. Verify tables are created in Table Editor
```

#### 4. ML Backend Setup

```bash
# Navigate to ML directory
cd Human-Health_model

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py

# Test the API
python test_app.py
```

ML API runs on [http://localhost:5000](http://localhost:5000)

#### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable APIs:
   - Google Calendar API
   - Google Meet API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`
6. Copy Client ID and Secret to `.env.local`

---

## 📁 Project Structure

```
dhanvantari-ai/
├── app/                                # Next.js App Router
│   ├── api/                           # API Routes
│   │   ├── auth/                      # Authentication
│   │   ├── patient/                   # Patient endpoints
│   │   ├── doctor/                    # Doctor endpoints
│   │   ├── admin/                     # Admin endpoints
│   │   ├── public/                    # Public endpoints
│   │   ├── predict/                   # ML prediction
│   │   └── user/                      # User management
│   ├── dashboard/                     # Doctor dashboard
│   ├── patient-dashboard/             # Patient dashboard
│   ├── admin/                         # Admin panel
│   ├── login/                         # Login page
│   ├── buy-medicine/                  # Medicine store
│   ├── consult-doctor/                # Doctor consultation
│   ├── pathology/                     # Lab services
│   ├── disease-prediction/            # AI prediction
│   ├── knowledge-center/              # Health articles
│   ├── health-policy/                 # Insurance
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Landing page
│   └── globals.css                    # Global styles
│
├── components/                        # React Components
│   ├── landing/                       # Landing page
│   ├── patient/                       # Patient components
│   ├── doctor/                        # Doctor components
│   ├── admin/                         # Admin components
│   ├── ui/                            # Reusable UI
│   ├── animations/                    # Animation components
│   └── DiaryPage.tsx                  # Shared diary
│
├── lib/                               # Utilities
│   ├── authOptions.ts                 # NextAuth config
│   ├── supabaseServer.ts              # Supabase client
│   ├── googleCalendar.ts              # Calendar API
│   └── types.ts                       # TypeScript types
│
├── hooks/                             # Custom React hooks
│   ├── useRealtimeNotifications.ts    # Real-time notifications
│   ├── useRealtimeAppointments.ts     # Real-time appointments
│   └── useImagePreloader.ts           # Image preloading
│
├── Human-Health_model/                # ML Backend
│   ├── app.py                         # Flask API
│   ├── train_optuna.py                # Model training
│   ├── evaluate.py                    # Model evaluation
│   ├── pipeline.py                    # ML pipeline
│   ├── graph_features.py              # Node2Vec
│   ├── best_pipeline.joblib           # Trained model
│   ├── symptom_embeddings.joblib      # Embeddings
│   ├── label_encoder.joblib           # Label encoder
│   ├── feature_names.joblib           # Feature names
│   └── requirements.txt               # Python deps
│
├── public/                            # Static assets
│   ├── hero-images/                   # 127 frames
│   ├── knowledge-scroll/              # 145 frames
│   ├── medicine-scroll/               # 145 frames
│   ├── opd-scroll/                    # 145 frames
│   └── path-scroll/                   # 145 frames
│
├── combined_supabase.sql              # Database schema
├── README.md                          # This file
├── package.json                       # Node dependencies
├── tsconfig.json                      # TypeScript config
├── tailwind.config.ts                 # Tailwind config
└── next.config.js                     # Next.js config
```

---

## 🗄️ Database Schema

### Core Tables

#### users
```sql
- id (UUID, PK)
- email (TEXT, UNIQUE)
- full_name (TEXT)
- avatar_url (TEXT)
- role (ENUM: 'doctor', 'patient')
- google_access_token (TEXT)
- google_refresh_token (TEXT)
- created_at (TIMESTAMPTZ)
```

#### doctors
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- specialization (TEXT)
- license_number (TEXT)
- experience_years (INT)
- verification_status (ENUM)
- medical_council (TEXT)
- registration_year (INT)
- google_meet_link (TEXT)
- consultation_fee (NUMERIC)
- follow_up_fee (NUMERIC)
```

#### patients
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- first_name (TEXT)
- last_name (TEXT)
- date_of_birth (DATE)
- gender (ENUM)
- blood_group (ENUM)
- allergies (TEXT[])
- chronic_conditions (TEXT[])
```

#### appointments
```sql
- id (UUID, PK)
- doctor_id (UUID, FK → doctors.id)
- patient_id (UUID, FK → patients.id)
- appointment_date (DATE)
- appointment_time (TIME)
- type (TEXT)
- mode (ENUM: 'Online', 'Offline')
- status (ENUM: 'Confirmed', 'Pending', 'Cancelled')
- meet_link (TEXT)
- calendar_event_id (TEXT)
- initiated_by (TEXT)
```

#### prescriptions
```sql
- id (UUID, PK)
- patient_id (UUID, FK)
- doctor_id (UUID, FK)
- prescription_date (DATE)
- advice (TEXT)
- forwarded_to_pharmacy (BOOLEAN)
```

#### treatment_prices
```sql
- id (UUID, PK)
- doctor_id (UUID, FK)
- treatment_name (TEXT)
- treatment_category (TEXT)
- price (NUMERIC)
- duration_minutes (INT)
- is_active (BOOLEAN)
```

### Notification Tables

#### doctor_notifications
```sql
- id (UUID, PK)
- doctor_id (UUID, FK → users.id)
- title (TEXT)
- message (TEXT)
- type (ENUM)
- read (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

#### patient_notifications
```sql
- id (UUID, PK)
- patient_id (UUID, FK → users.id)
- doctor_id (UUID, FK)
- title (TEXT)
- message (TEXT)
- type (ENUM)
- read (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

---

## 📡 API Documentation

### Authentication

All API routes require authentication via NextAuth session.

```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.email) return 401 Unauthorized
```

### Patient Endpoints

#### `GET /api/patient/appointments`
Get all appointments for logged-in patient

**Response:**
```json
{
  "appointments": [
    {
      "id": "uuid",
      "doctorName": "Dr. Smith",
      "date": "2024-05-15",
      "time": "10:00",
      "type": "Consultation",
      "mode": "Online",
      "status": "Confirmed",
      "meetLink": "https://meet.google.com/xxx"
    }
  ]
}
```

#### `POST /api/patient/appointments`
Book a new appointment

**Request:**
```json
{
  "doctorId": "uuid",
  "doctorName": "Dr. Smith",
  "date": "2024-05-15",
  "time": "10:00",
  "type": "Consultation",
  "mode": "Online",
  "reason": "Fever and cough"
}
```

#### `GET /api/patient/notifications`
Get all notifications

#### `GET /api/patient/diary`
Get health diary entries

#### `POST /api/patient/diary`
Create diary entry

#### `DELETE /api/patient/medicine-orders?id={orderId}`
Delete a pending medicine order

**Response:**
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

#### `DELETE /api/patient/lab-bookings?id={bookingId}`
Delete a pending lab booking

#### `DELETE /api/patient/appointments?id={appointmentId}`
Cancel a pending appointment (updates status to 'Cancelled')

### Doctor Endpoints

#### `GET /api/doctor/appointments`
Get all appointments for logged-in doctor

#### `POST /api/doctor/appointments`
Create appointment for patient

#### `PATCH /api/doctor/appointments`
Confirm or cancel appointment

**Request:**
```json
{
  "id": "uuid",
  "status": "Confirmed"
}
```

#### `GET /api/doctor/patients`
Get all patients

#### `GET /api/doctor/predictions`
Get AI predictions for review

#### `POST /api/doctor/prescriptions`
Create prescription

#### `GET /api/doctor/treatment-prices`
Get treatment pricing

#### `POST /api/doctor/treatment-prices`
Add treatment price

### Public Endpoints

#### `GET /api/public/doctors`
Get all verified doctors

**Query Params:**
- `specialty` - Filter by specialization
- `search` - Search by name

#### `GET /api/public/medicines`
Get medicine catalog (auto-syncs from FDA if empty)

**Response:**
```json
{
  "medicines": [
    {
      "id": "uuid",
      "name": "Aspirin",
      "category": "Pain Relief",
      "price": 25.00,
      "manufacturer": "Bayer",
      "description": "Pain reliever and fever reducer",
      "rating": 4.5,
      "reviews_count": 1250,
      "in_stock": true,
      "requires_prescription": false
    }
  ]
}
```

#### `POST /api/medicines/sync`
Sync medicines from FDA API (public endpoint)

**Response:**
```json
{
  "success": true,
  "count": 45,
  "fdaCount": 25,
  "indianCount": 20,
  "message": "Medicines synced successfully"
}
```

#### `GET /api/public/lab-tests`
Get available lab tests

### ML Prediction

#### `POST /api/predict`
Get disease prediction from symptoms

**Request:**
```json
{
  "symptoms": ["fever", "cough", "fatigue"],
  "age": 35,
  "gender": "Male"
}
```

**Response:**
```json
{
  "disease": "Common Cold",
  "confidence": 85.5,
  "risk": "Low",
  "explanation": "Based on symptoms...",
  "recommendations": ["Rest", "Hydration"]
}
```

---

## 💊 Medicine System

### FDA API Integration

The platform integrates with the **openFDA API** to provide real, verified medicine information.

#### Features:
- **Real-time FDA Data**: Fetches medicine information from official FDA database
- **Auto-Sync**: Automatically syncs medicines when database is empty
- **Hybrid Catalog**: Combines FDA medicines with Indian medicines
- **Smart Categorization**: Auto-categorizes based on product type and generic name
- **No Images**: Clean, professional design without image dependencies

#### How It Works:

```
1. Patient visits /buy-medicine
   ↓
2. System checks database
   ↓
3. If empty, auto-syncs from FDA API
   ↓
4. Fetches 25+ medicines from FDA
   ↓
5. Adds 20+ Indian medicines
   ↓
6. Total: 45+ medicines ready
```

#### FDA Medicines Include:
- Aspirin, Ibuprofen, Acetaminophen
- Amoxicillin, Azithromycin
- Metformin, Atorvastatin, Lisinopril
- Omeprazole, Losartan, Amlodipine
- And 15+ more verified medicines

#### Indian Medicines Include:
- Paracetamol (500mg, 650mg)
- Diclofenac, Ciprofloxacin
- Glimepiride, Insulin Glargine
- Vitamins (D3, B12, Omega-3)
- Inhalers, Creams, and more

#### Testing:
Visit `/test-medicines` to test the sync functionality and view medicine data.

---

## 🧠 ML Model Details

### Model Architecture

```
Input: Symptom Vector (130 dimensions)
  ↓
Graph Features (Node2Vec embeddings - 32D)
  ↓
Feature Engineering (co-occurrence patterns)
  ↓
XGBoost Classifier (GPU-accelerated)
  ↓
Output: Disease (669 classes) + Confidence
```

### Performance Metrics

| Metric | Score |
|--------|-------|
| Accuracy | **86.76%** |
| Precision (Macro) | **87.66%** |
| Recall (Macro) | **89.22%** |
| F1 Score (Macro) | **87.95%** |
| Training Time | ~45 min (GPU) |
| Inference Time | <100ms |

### Key Features

- **Graph-Based Learning**: Node2Vec embeddings capture symptom relationships
- **GPU Acceleration**: XGBoost with CUDA support
- **Explainable AI**: Feature importance analysis
- **Robust Pipeline**: Handles missing data and type consistency
- **High Granularity**: 669 disease classifications

### Training Pipeline

```bash
# 1. Prepare data
python Human-Health_model/prepare_data.py

# 2. Train model with hyperparameter optimization
python Human-Health_model/train_optuna.py

# 3. Evaluate model
python Human-Health_model/evaluate.py

# 4. Export model
# Models saved as .joblib files
```

---

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Environment Variables:**
- Add all `.env.local` variables to Vercel dashboard
- Update `NEXTAUTH_URL` to production domain

### Backend (Railway/Render)

```bash
# 1. Create Dockerfile for Flask app
# 2. Push to GitHub
# 3. Connect to Railway/Render
# 4. Deploy
```

### Database (Supabase)

- Already hosted on Supabase cloud
- No additional deployment needed
- Update connection strings in production

---

## 🧪 Testing

### Frontend Tests

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Backend Tests

```bash
# Test ML API
cd Human-Health_model
python test_app.py

# Test model accuracy
python evaluate.py
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- **Frontend**: ESLint + Prettier
- **Backend**: PEP 8 (Python)
- **Commits**: Conventional Commits

---

## 📄 License

Internal Project - Healthcare AI Platform

---

## 👥 Team

**Akhilesh Gangawane**
- GitHub: [@Akhilesh-Gangawane](https://github.com/Akhilesh-Gangawane)
- Role: Full Stack Developer & ML Engineer

---

## 🙏 Acknowledgments

- Medical dataset providers
- Open-source community
- Healthcare professionals for domain expertise
- Supabase for database infrastructure
- Vercel for hosting platform

---

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@dhanvantari-ai.com

---

**Built with ❤️ for better healthcare accessibility**
