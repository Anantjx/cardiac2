# 🚑 AI-Powered Emergency Cardiac Care System

## 🌟 Project Overview
This project is an intelligent, accessible, and automated system designed to improve emergency cardiac care by using AI-driven symptom triaging, lab report analysis, appointment scheduling, and patient-friendly interaction. The system is designed with scalability and ease of use in mind, especially for differently-abled patients.

---

## 🎯 Problem Statement
Patients in emergency cardiac situations face delays in triaging, lab report analysis, and appointment scheduling. Differently-abled patients find it particularly difficult to navigate medical systems under stress. Manual processes slow down care delivery, reducing the chances of timely intervention.

---

## 💡 Solution
Our solution automates key parts of emergency cardiac care:
1. Patients enter their symptoms in simple language.
2. AI (OpenAI GPT API) analyzes symptoms to provide a triage result (High, Medium, Low Risk).
3. Patients can upload lab reports (PDF/Image), and the system extracts key medical data automatically using OpenAI’s Document Analysis API.
4. Smart appointment recommendations are generated based on triage and lab report data.
5. A patient-friendly chatbot helps explain medical terms and guides patients in simple language.
6. Clean and accessible UI design supports differently-abled users (large buttons, simple forms, voice interaction support).

---

## 🚀 Tech Stack
- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB Atlas (Cloud Database)
- APIs: OpenAI API for AI functionality (Symptom Analysis, Document Extraction, Chatbot)
- Deployment: Vercel (Frontend), Render (Backend)

---

## ⚡ Prototype Mode
For the prototype demonstration, we use mock data to simulate:
- Symptom input and triage result
- Lab report uploads and analysis
- Appointment scheduling
This allows demonstration without requiring OpenAI API keys at the initial stage.

---

## 📈 Scalability Plan
The system is designed to scale easily:
- Add more hospitals, doctors, and appointment slots via database configuration.
- Integrate OpenAI API keys in production for real-time intelligent analysis.
- Support multiple languages for wider accessibility.
- Handle multiple patient requests simultaneously using cloud infrastructure.

---

## ✅ How to Run Locally
1. **Clone the repo:**
   ```bash
   git clone https://github.com/ANDEV-afk/cardiac-care.git
   
2. **Install dependencies:**
   npm install

3. **Set up environment variables in a .env file:**
   OPENAI_API_KEY=your_openai_api_key (optional for prototype)

4. **Start the frontend (if applicable):**
   npm run dev

License

MIT License

**Future Improvements**->

Fully integrate OpenAI API keys for real-time AI-powered triaging and document analysis.

Multi-language support for a global user base.

Voice interaction directly powered by OpenAI APIs.

Offline mode support using cached data.
