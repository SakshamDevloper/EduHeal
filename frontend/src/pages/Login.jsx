import React, { useState, useEffect } from "react";
import { useAuth, API_URL } from "../context/AuthContext";

export default function Login() {
  const { login, register, error, setError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [schools, setSchools] = useState([]);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student_parent");
  const [schoolId, setSchoolId] = useState("");

  useEffect(() => {
    // Load schools list for registration dropdown
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
        console.error("Failed to fetch schools:", err);
      }
    };
    fetchSchools();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (isRegister) {
      if (!fullName) {
        setError("Full name is required for registration.");
        return;
      }
      const schoolSelected = role !== "doctor" ? schoolId : null;
      await register(fullName, email, password, role, schoolSelected);
    } else {
      await login(email, password);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
      {/* Background Glowing Orbs */}
      <div className="glow-orb orb-indigo"></div>
      <div className="glow-orb orb-cyan"></div>

      <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", margin: "20px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="nav-logo" style={{ justifyContent: "center", fontSize: "2.2rem", marginBottom: "0.5rem" }}>
            EduHeal <span className="pulse-indicator"></span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {isRegister ? "Empower your health and learning journey" : "Sign in to access your health education & booking hub"}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="text-input"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="text-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="text-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <>
              <div className="input-group">
                <label className="input-label">I am a...</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="student_parent">Student / Parent</option>
                  <option value="doctor">Volunteer Healthcare Doctor</option>
                  <option value="school_admin">School Administrator</option>
                </select>
              </div>

              {role !== "doctor" && schools.length > 0 && (
                <div className="input-group">
                  <label className="input-label">Select Your School</label>
                  <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name} ({school.cluster_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem", fontSize: "1rem" }}>
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            {isRegister ? "Already have an account? " : "New to EduHeal? "}
          </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-secondary)",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {isRegister ? "Sign In Here" : "Create Account Here"}
          </button>
        </div>
      </div>
    </div>
  );
}
