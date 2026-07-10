import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def generate_synthetic_data(num_samples=5000):
    np.random.seed(42)
    
    # Generate features
    # rainfall_mm: usually between 0 and 150mm
    rainfall_mm = np.random.exponential(scale=20, size=num_samples)
    
    # elevation_m: between 2m and 50m
    elevation_m = np.random.uniform(2, 50, size=num_samples)
    
    # drainage_score: 0 to 100
    drainage_score = np.random.normal(loc=50, scale=20, size=num_samples)
    drainage_score = np.clip(drainage_score, 0, 100)
    
    # past_flood_count: 0 to 10
    past_flood_count = np.random.poisson(lam=1, size=num_samples)
    
    # citizen_reports_count: 0 to 20
    citizen_reports_count = np.random.poisson(lam=0.5, size=num_samples)
    
    # road_type: 0 (highway), 1 (arterial), 2 (local)
    road_type = np.random.randint(0, 3, size=num_samples)
    
    # Calculate flood probability based on correlations
    # High rainfall increases prob
    # Low elevation increases prob
    # Low drainage increases prob
    # High past flood count increases prob
    # High citizen reports increases prob
    
    base_prob = 0.1
    
    # Normalized factors (roughly 0 to 1)
    rain_factor = np.clip(rainfall_mm / 100, 0, 1)
    elevation_factor = np.clip(1 - (elevation_m / 50), 0, 1)
    drainage_factor = np.clip(1 - (drainage_score / 100), 0, 1)
    history_factor = np.clip(past_flood_count / 5, 0, 1)
    reports_factor = np.clip(citizen_reports_count / 10, 0, 1)
    
    # Combine factors to create a probability
    prob = (base_prob + 
            0.3 * rain_factor + 
            0.2 * elevation_factor + 
            0.2 * drainage_factor + 
            0.15 * history_factor + 
            0.15 * reports_factor)
            
    # Add some noise
    prob = np.clip(prob + np.random.normal(0, 0.1, size=num_samples), 0, 1)
    
    # Generate labels (1 for flood, 0 for no flood)
    flood_occurred = np.random.binomial(1, p=prob)
    
    df = pd.DataFrame({
        'rainfall_mm': rainfall_mm,
        'elevation_m': elevation_m,
        'drainage_score': drainage_score,
        'past_flood_count': past_flood_count,
        'citizen_reports_count': citizen_reports_count,
        'road_type': road_type,
        'flood_occurred': flood_occurred
    })
    
    return df

def main():
    print("Generating synthetic data...")
    df = generate_synthetic_data(5000)
    
    X = df[['rainfall_mm', 'elevation_m', 'drainage_score', 'past_flood_count', 'citizen_reports_count', 'road_type']]
    y = df['flood_occurred']
    
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Save the model
    output_path = os.path.join(os.path.dirname(__file__), "flood_model.joblib")
    joblib.dump(model, output_path)
    print(f"Model saved successfully to {output_path}")
    
    # Print feature importances
    importances = model.feature_importances_
    features = X.columns
    for feature, imp in zip(features, importances):
        print(f"Feature '{feature}': {imp:.4f}")

if __name__ == "__main__":
    main()
