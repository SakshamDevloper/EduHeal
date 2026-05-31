import React, { useState, useEffect } from "react";
import { useAuth, API_URL } from "../context/AuthContext";

export default function AnalyticsDashboard() {
  const { user, token, logout } = useAuth();
  
  // Health Map State
  const [healthMap, setHealthMap] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);

  // Schools list for predictor
  const [schools, setSchools] = useState([]);

  // Predictor Form States
  const [schoolId, setSchoolId] = useState("");
  const [month, setMonth] = useState("6");
  const [avgTemp, setAvgTemp] = useState("28");
  const [rainfall, setRainfall] = useState("120");
  const [healthCampaign, setHealthCampaign] = useState(false);
  const [recentSymptoms, setRecentSymptoms] = useState("3");

  // Predictor Results
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState("");

  useEffect(() => {
    fetchHealthMap();
    fetchSchools();
  }, []);

  const fetchHealthMap = async () => {
    setLoadingMap(true);
    try {
      const res = await fetch(`${API_URL}/analytics/health-map`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealthMap(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMap(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/schools`);
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
        if (data.length > 0) {
          setSchoolId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setPrediction(null);
    setPredictError("");
    setPredicting(true);

    const payload = {
      school_id: parseInt(schoolId),
      month: parseInt(month),
      avg_temp: parseFloat(avgTemp),
      rainfall: parseFloat(rainfall),
      health_campaign: healthCampaign,
      recent_symptom_count: parseInt(recentSymptoms)
    };

    try {
      const res = await fetch(`${API_URL}/analytics/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setPrediction(data);
      } else {
        setPredictError(data.detail || "Prediction modeling failed.");
      }
    } catch (err) {
      setPredictError("Server error executing Random Forest regressor.");
    } finally {
      setPredicting(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "High": return "var(--color-danger)";
      case "Medium": return "var(--color-warning)";
      case "Low": return "var(--color-success)";
      default: return "var(--text-primary)";
    }
  };

  return (
    <div className="dashboard-container">
      {/* Background Glowing Orbs */}
      <div className="glow-orb orb-indigo"></div>
      <div className="glow-orb orb-cyan"></div>

      <header className="nav-bar">
        <div>
          <h2 className="nav-logo">EduHeal</h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            School & Regional Health Analytics | Operator: <strong>{user?.full_name}</strong>
          </span>
        </div>
        <div className="nav-links">
          <button className="btn btn-outline" onClick={logout} style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ marginBottom: "2rem" }}>
        <h3>Insights & Predictive Health Dashboard</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Track disease outbreaks across school clusters and simulate student absenteeism using our Random Forest predictive engine.
        </p>
      </div>

      <div className="grid-2">
        
        {/* COLUMN 1: Anonymized Health Map */}
        <div className="glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
            <h3>Anonymized Health Outbreak Tracker</h3>
            <button className="btn btn-outline" onClick={fetchHealthMap} style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>
              🔄 Refresh
            </button>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Live aggregated reports of self-reported symptoms submitted by students within their respective school clusters.
          </p>

          {loadingMap ? (
            <p style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Loading health reports...</p>
          ) : healthMap.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "var(--text-muted)" }}>No symptom reports currently active.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {healthMap.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <strong style={{ fontSize: "1rem" }}>{item.symptom}</strong>
                    <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {item.school_name} — <span style={{ color: "var(--color-secondary)" }}>{item.cluster_name}</span>
                    </span>
                  </div>
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--color-danger)", padding: "0.35rem 0.85rem", borderRadius: "50px", fontWeight: "bold", fontSize: "0.9rem" }}>
                    {item.count} Active Case{item.count > 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2: Predictive Absenteeism Model */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
            Predictive Absenteeism Simulator
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Select local factors to forecast student absenteeism using our trained <strong>scikit-learn Random Forest Regressor</strong>.
          </p>

          <form onSubmit={handlePredict} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group" style={{ gridColumn: "span 2" }}>
              <label className="input-label">Select Target School</label>
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.cluster_name})</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Simulate Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="1">January (Winter)</option>
                <option value="3">March</option>
                <option value="6">June (Monsoon/Heat)</option>
                <option value="8">August (Monsoon)</option>
                <option value="10">October</option>
                <option value="12">December (Winter)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Avg Temperature (°C)</label>
              <input
                type="number"
                className="text-input"
                value={avgTemp}
                onChange={(e) => setAvgTemp(e.target.value)}
                min="0"
                max="50"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Estimated Rainfall (mm)</label>
              <input
                type="number"
                className="text-input"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
                min="0"
                max="600"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Recent Symptom Cases</label>
              <input
                type="number"
                className="text-input"
                value={recentSymptoms}
                onChange={(e) => setRecentSymptoms(e.target.value)}
                min="0"
                max="50"
              />
            </div>

            <div className="input-group" style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-glass)", padding: "0.75rem", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              <input
                type="checkbox"
                id="campaign-check"
                checked={healthCampaign}
                onChange={(e) => setHealthCampaign(e.target.checked)}
                style={{ transform: "scale(1.2)" }}
              />
              <label htmlFor="campaign-check" style={{ color: "var(--text-primary)", cursor: "pointer", fontSize: "0.9rem" }}>
                Active School Hygiene/Sanitation Campaign
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={predicting}
              style={{ gridColumn: "span 2", marginTop: "0.5rem" }}
            >
              {predicting ? "Running RandomForestRegressor..." : "🔮 Calculate Forecasted Absenteeism"}
            </button>
          </form>

          {predictError && (
            <div className="alert alert-danger" style={{ marginTop: "1.5rem" }}>
              {predictError}
            </div>
          )}

          {prediction && (
            <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-lg)" }}>
              <h4 style={{ marginBottom: "1rem" }}>Prediction Output</h4>
              
              <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>
                    FORECASTED RATE
                  </span>
                  <span style={{ fontSize: "2rem", fontWeight: "bold", color: getRiskColor(prediction.risk_level) }}>
                    {roundPercentage(prediction.predicted_absenteeism_rate)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>
                    OUTBREAK RISK LEVEL
                  </span>
                  <span style={{
                    display: "inline-block",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "50px",
                    marginTop: "0.25rem",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    background: `${getRiskColor(prediction.risk_level)}20`,
                    color: getRiskColor(prediction.risk_level),
                    border: `1px solid ${getRiskColor(prediction.risk_level)}40`
                  }}>
                    {prediction.risk_level}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5", fontStyle: "italic", borderLeft: `3px solid ${getRiskColor(prediction.risk_level)}`, paddingLeft: "1rem" }}>
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );

  function roundPercentage(val) {
    return `${(val * 100).toFixed(1)}%`;
  }
}
