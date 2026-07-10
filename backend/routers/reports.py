import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from database import get_db
from models.flood_report import FloodReport
from services.auth import get_current_admin
from models.user import User

import boto3

router = APIRouter(prefix="/api/reports", tags=["reports"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class StatusUpdate(BaseModel):
    status: str

# S3 Configuration
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
s3_client = None
if AWS_BUCKET_NAME:
    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=AWS_REGION
        )
    except Exception as e:
        print(f"Failed to initialize boto3 client: {e}")

@router.post("")
async def create_report(
    lat: float = Form(...),
    lng: float = Form(...),
    water_depth: str = Form(...),
    severity: str = Form(...),
    notes: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    photo_url = None
    if photo:
        file_ext = photo.filename.split(".")[-1] if photo.filename else "jpg"
        file_name = f"{uuid.uuid4()}.{file_ext}"
        
        if s3_client and AWS_BUCKET_NAME:
            try:
                s3_client.upload_fileobj(
                    photo.file, 
                    AWS_BUCKET_NAME, 
                    file_name,
                    ExtraArgs={"ContentType": photo.content_type}
                )
                photo_url = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{file_name}"
            except Exception as e:
                print(f"S3 upload failed: {e}")
                # Fallback to local
        
        if not photo_url:
            file_path = os.path.join(UPLOAD_DIR, file_name)
            # Reset file pointer if read by failed S3
            photo.file.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
            photo_url = f"/uploads/{file_name}"
        
    db_report = FloodReport(
        lat=lat,
        lng=lng,
        water_depth=water_depth,
        severity=severity,
        notes=notes,
        user_id="anonymous", # Anonymous submission
        photo_url=photo_url,
        status="pending"
    )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("")
def get_reports(limit: int = 20, db: Session = Depends(get_db)):
    reports = db.query(FloodReport).order_by(desc(FloodReport.created_at)).limit(limit).all()
    return reports

@router.put("/{report_id}/status")
def update_report_status(report_id: str, update: StatusUpdate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    if update.status not in ["pending", "verified", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    report = db.query(FloodReport).filter(FloodReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.status = update.status
    db.commit()
    return {"status": "success", "report_id": report_id, "new_status": report.status}
