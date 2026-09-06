import sys, os, pandas as pd
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Base, engine
from models.rainfall_summary import RainfallSummary

Base.metadata.create_all(engine)

CSV_FILE = os.path.join(os.path.dirname(__file__), "../data/cleaned_rainfall.csv")

def seed():
    df = pd.read_csv(CSV_FILE)
    df["time"] = pd.to_datetime(df["time"], errors="coerce")
    df = df.dropna(subset=["time"])
    df["month"] = df["time"].dt.month
    df["rain_val"] = pd.to_numeric(df["precipitation (mm)"], errors="coerce").fillna(0)

    db = SessionLocal()
    db.query(RainfallSummary).delete()

    for month in range(1, 13):
        mdf = df[df["month"] == month]
        if mdf.empty:
            continue
        summary = RainfallSummary(
            month           = month,
            avg_rainfall_mm = round(float(mdf["rain_val"].mean()), 3),
            max_rainfall_mm = round(float(mdf["rain_val"].max()), 3),
            high_risk_hours = int((mdf["rain_val"] > 30).sum()),
        )
        db.add(summary)
        print(f"  Month {month:02d}: avg={summary.avg_rainfall_mm}mm max={summary.max_rainfall_mm}mm high_risk_hrs={summary.high_risk_hours}")

    db.commit()
    db.close()
    print("Rainfall summary seeded.")

if __name__ == "__main__":
    seed()
