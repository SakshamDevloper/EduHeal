import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";

function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)"
      }}>
        <div className="pulse-indicator" style={{ width: "30px", height: "30px", marginBottom: "1rem" }}></div>
        <p style={{ color: "var(--text-secondary)", letterSpacing: "0.05em" }}>LOADING EDUHEAL SYSTEM...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Route based on role
  switch (user.role) {
    case "student_parent":
      return <StudentDashboard />;
    case "doctor":
      return <DoctorDashboard />;
    case "school_admin":
      return <AnalyticsDashboard />;
    default:
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Invalid User Role</h2>
          <p>Please contact EduHeal administrator.</p>
        </div>
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardRouter />
    </AuthProvider>
  );
}
