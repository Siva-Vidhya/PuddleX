# PuddleX

PuddleX is a predictive navigation platform designed to help citizens and emergency responders navigate cities safely during severe rainfall and flash flooding. It uses real-time weather APIs, topographical data, and community reports to fuel a Random Forest predictive ML engine, routing users around dynamically detected high-risk flood zones.

## Architecture
- **Frontend**: Next.js 14 (App Router) + TailwindCSS + Leaflet + Framer Motion
- **Backend**: FastAPI (Python) + scikit-learn (ML) + OSMnx (Routing)
- **Database**: PostgreSQL (Production) / SQLite (Local)
- **Storage**: AWS S3 / Cloudflare R2 (for photo reports)

---

## Local Development Setup

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate, Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python data_generator.py # Generate synthetic data and train the initial ML model
uvicorn main:app --reload
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## Production Deployment Guide

### A. Backend Deployment (Render)
1. Push this repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New > Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read the `backend/render.yaml` file, provisioning both a managed PostgreSQL database and the FastAPI web service.
5. In the Render Dashboard for your Web Service, set the following Environment Variables:
   - `FRONTEND_URL`: The URL of your deployed Vercel frontend (e.g., `https://puddlex.vercel.app`).
   - *(Optional but Recommended)* S3 Bucket credentials for storing uploaded photos:
     - `AWS_BUCKET_NAME`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`
6. Once deployed, note the provided Render URL (e.g., `https://puddlex-backend.onrender.com`).

### B. Frontend Deployment (Vercel)
1. Sign in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Connect your GitHub repository.
3. Configure the **Root Directory** to `frontend`.
4. Set the following Environment Variables:
   - `NEXT_PUBLIC_API_URL`: The Render URL from Step A (e.g., `https://puddlex-backend.onrender.com`).
   - `NEXTAUTH_SECRET`: Generate a strong random string (e.g., `openssl rand -base64 32`).
   - `NEXTAUTH_URL`: The production URL of this Vercel app (e.g., `https://puddlex.vercel.app`).
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From your Google Cloud Console (OAuth 2.0 Client IDs).
5. Deploy.

### C. Final Configuration
1. **Google OAuth**: Add your final Vercel domain to the "Authorized JavaScript origins" and "Authorized redirect URIs" (e.g., `https://puddlex.vercel.app/api/auth/callback/google`) in the Google Cloud Console.
2. **DNS**: If you have a custom domain, map it via Vercel's Domain Settings. Vercel automatically provisions SSL (HTTPS).

## Monitoring
The backend exposes a lightweight health check route at `/api/health` that you can plug into services like UptimeRobot or Datadog to ensure high availability.
