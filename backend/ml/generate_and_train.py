import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os

def generate_synthetic_data(num_samples=5000):
    np.random.seed(42)
    
    # Generate features
    # Rainfall in mm/hr (0 to 100)
    rainfall_mm = np.random.exponential(scale=15, size=num_samples).clip(0, 100)
    
    # Elevation in meters (typically 2 to 20 for coastal cities like Chennai)
    elevation_m = np.random.normal(loc=10, scale=4, size=num_samples).clip(1, 30)
    
    # Drainage score (0 to 100, where 100 is excellent drainage)
    drainage_score = np.random.normal(loc=50, scale=20, size=num_samples).clip(0, 100)
    
    # Past flood count (historical)
    past_flood_count = np.random.poisson(lam=2, size=num_samples)
    
    # Active citizen reports
    citizen_reports_count = np.random.poisson(lam=0.5, size=num_samples)
    
    # Road type (0: local, 1: arterial, 2: highway)
    road_type = np.random.choice([0, 1, 2], size=num_samples, p=[0.6, 0.3, 0.1])
    
    df = pd.DataFrame({
        'rainfall_mm': rainfall_mm,
        'elevation_m': elevation_m,
        'drainage_score': drainage_score,
        'past_flood_count': past_flood_count,
        'citizen_reports_count': citizen_reports_count,
        'road_type': road_type
    })
    
    # Logic to generate label: 'flood_occurred' (0 or 1)
    # Higher rainfall, lower elevation, lower drainage score increases probability
    base_risk = (
        (df['rainfall_mm'] / 100.0) * 0.4 + 
        (1.0 - (df['elevation_m'] / 30.0)) * 0.3 + 
        (1.0 - (df['drainage_score'] / 100.0)) * 0.2 + 
        (df['past_flood_count'] / 10.0) * 0.05 + 
        (df['citizen_reports_count'] / 5.0) * 0.05
    )
    
    # Add some noise
    noise = np.random.normal(0, 0.1, size=num_samples)
    final_risk = (base_risk + noise).clip(0, 1)
    
    # Threshold for flooding
    df['flood_occurred'] = (final_risk > 0.65).astype(int)
    
    return df

def train_model():
    print("Generating synthetic dataset...")
    df = generate_synthetic_data(5000)
    
    X = df.drop('flood_occurred', axis=1)
    y = df['flood_occurred']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    clf.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred))
    
    # Save the model
    model_path = os.path.join(os.path.dirname(__file__), 'flood_model.joblib')
    joblib.dump(clf, model_path)
    print(f"Model saved to {model_path}")
    
    # Print feature importances
    importances = clf.feature_importances_
    features = X.columns
    print("\nFeature Importances:")
    for feature, imp in zip(features, importances):
        print(f" - {feature}: {imp:.4f}")

if __name__ == "__main__":
    train_model()
