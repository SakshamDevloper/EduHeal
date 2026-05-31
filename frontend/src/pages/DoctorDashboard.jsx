import React, { useState, useEffect, useRef } from "react";
import { useAuth, API_URL } from "../context/AuthContext";

export default function DoctorDashboard() {
  const { user, token, logout } = useAuth();
  
  // Slots & Appointments State
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  
  // New Slot form states
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotSuccess, setSlotSuccess] = useState("");
  const [slotError, setSlotError] = useState("");

  // WebRTC Call State
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const [callStatus, setCallStatus] = useState("Connecting to signaling server...");

  useEffect(() => {
    fetchSlots();
    fetchAppointments();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch(`${API_URL}/appointments/slots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSlotSuccess("");
    setSlotError("");

    if (!startTime || !endTime) {
      setSlotError("Please set both start and end times.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/appointments/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSlotSuccess("Availability slot created successfully!");
        setStartTime("");
        setEndTime("");
        fetchSlots();
      } else {
        setSlotError(data.detail || "Failed to create slot.");
      }
    } catch (err) {
      setSlotError("Server error creating slot.");
    }
  };

  // WebRTC Video Call Actions
  const startVideoCall = async (appt) => {
    setActiveCall(appt);
    setCallStatus("Acquiring camera access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect WebSocket signaling
      const wsUrl = `ws://127.0.0.1:8000/api/webrtc/ws/${appt.room_id}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setCallStatus("Connected to consultation room. Broadcasting presence...");
        // Send a join notification
        socketRef.current.send(JSON.stringify({ type: "join", user: user.full_name }));
      };

      socketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);
        if (message.type === "join") {
          setCallStatus(`Student (${message.user}) joined! Active consultation in progress.`);
        }
      };

      socketRef.current.onerror = (err) => {
        setCallStatus("Signaling server error.");
      };

      socketRef.current.onclose = () => {
        setCallStatus("Lobby connection closed.");
      };

    } catch (err) {
      console.error(err);
      setCallStatus("Failed to get media devices. Please allow camera permissions.");
    }
  };

  const completeAppointment = async (apptId) => {
    try {
      const res = await fetch(`${API_URL}/appointments/${apptId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Consultation marked as completed.");
        endVideoCall();
        fetchAppointments();
      } else {
        alert("Failed to complete appointment.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const endVideoCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setActiveCall(null);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
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
            Volunteer Provider Portal: <strong>{user?.full_name}</strong>
          </span>
        </div>
        <div className="nav-links">
          <button className="btn btn-outline" onClick={logout} style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="grid-3" style={{ gridTemplateColumns: "1fr 2fr" }}>
        
        {/* LEFT COLUMN: Manage Availability */}
        <div>
          <div className="glass-panel" style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Add Availability Slot
            </h3>
            
            {slotSuccess && <div className="alert alert-success">{slotSuccess}</div>}
            {slotError && <div className="alert alert-danger">{slotError}</div>}

            <form onSubmit={handleCreateSlot}>
              <div className="input-group">
                <label className="input-label">Start Date & Time</label>
                <input
                  type="datetime-local"
                  className="text-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  className="text-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem" }}>
                Create Slot
              </button>
            </form>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Your Availability Slots
            </h3>
            {slots.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No slots added yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "350px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {slots.map((slot) => (
                  <div key={slot.id} style={{ padding: "0.75rem", background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>{formatDate(slot.start_time)}</strong>
                      <span style={{ display: "block", color: "var(--text-secondary)" }}>
                        to {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "0.7rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "50px",
                      background: slot.is_booked ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                      color: slot.is_booked ? "var(--color-danger)" : "var(--color-success)",
                      fontWeight: "600"
                    }}>
                      {slot.is_booked ? "Booked" : "Available"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Appointments List */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
            Scheduled Student Consultations
          </h3>

          {appointments.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No consultations booked yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {appointments.map((appt) => (
                <div key={appt.id} className="glass-panel" style={{ background: "rgba(255, 255, 255, 0.02)", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0 }}>Student: {appt.student_name}</h4>
                    <span style={{
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "50px",
                      background: appt.status === "completed" ? "rgba(16, 185, 129, 0.1)" : "rgba(6, 182, 212, 0.1)",
                      color: appt.status === "completed" ? "var(--color-success)" : "var(--color-secondary)",
                      textTransform: "uppercase",
                      fontWeight: "bold"
                    }}>
                      {appt.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                    📅 {formatDate(appt.scheduled_time)}
                    <br />
                    🔑 Consultation Token: <code>{appt.consultation_token}</code>
                  </div>

                  {appt.status === "booked" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => startVideoCall(appt)}
                      style={{ width: "100%", fontSize: "0.85rem", padding: "0.6rem" }}
                    >
                      📹 Start Video Consultation Room
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WEBRTC CALLING INTERACTIVE POPUP */}
      {activeCall && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "800px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3>Telemedicine Consultation Portal</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Patient: <strong>{activeCall.student_name}</strong> | Token: <code>{activeCall.consultation_token}</code>
                </span>
              </div>
              <button className="btn btn-danger" onClick={endVideoCall} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                Leave Room
              </button>
            </div>

            <div style={{ marginBottom: "1rem", padding: "0.5rem 1rem", background: "rgba(99, 102, 241, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-glass)", fontSize: "0.9rem" }}>
              <span className="pulse-indicator" style={{ marginRight: "0.5rem" }}></span>
              <strong>Room Status:</strong> {callStatus}
            </div>

            {/* Video Streams Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", height: "320px" }}>
              {/* Local Stream */}
              <div style={{ position: "relative", background: "#000000", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
                <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0, 0, 0, 0.6)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                  Doctor (You)
                </div>
              </div>

              {/* Remote Mock Stream */}
              <div style={{ position: "relative", background: "#1f2937", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                {callStatus.includes("Student (") ? (
                  /* Mocking Student Active Video Camera */
                  <div style={{ width: "100%", height: "100%", position: "relative", background: "linear-gradient(135deg, #1e293b, #374151)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <span style={{ fontSize: "4rem" }}>👦</span>
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(16, 185, 129, 0.2)", color: "var(--color-success)", border: "1px solid var(--color-success)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>
                      LIVE
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>⌛</span>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      Waiting for patient to join video stream...
                    </p>
                  </div>
                )}
                <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0, 0, 0, 0.6)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                  Patient (Student)
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button className="btn btn-outline" onClick={endVideoCall}>
                Cancel/Close
              </button>
              <button className="btn btn-secondary" onClick={() => completeAppointment(activeCall.id)}>
                ✔️ Mark Consultation as Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
