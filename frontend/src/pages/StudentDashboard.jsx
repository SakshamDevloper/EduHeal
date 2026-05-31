import React, { useState, useEffect, useRef } from "react";
import { useAuth, API_URL } from "../context/AuthContext";

export default function StudentDashboard() {
  const { user, token, logout, refreshPoints } = useAuth();
  const [activeTab, setActiveTab] = useState("lessons");
  
  // Lessons State
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  
  // Appointments State
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingError, setBookingError] = useState("");
  
  // WebRTC Call State
  const [activeCallRoom, setActiveCallRoom] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const [callStatus, setCallStatus] = useState("Connecting to signaling server...");
  
  // Symptom Report State
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomSuccess, setSymptomSuccess] = useState("");
  const [symptomError, setSymptomError] = useState("");
  
  const symptomsList = ["Fever", "Cough", "Headache", "Stomach Ache", "Fatigue", "Runny Nose", "Sore Throat", "Nausea"];

  useEffect(() => {
    fetchLessons();
    fetchSlots();
    fetchAppointments();
  }, []);

  // API Fetches
  const fetchLessons = async () => {
    try {
      const res = await fetch(`${API_URL}/lessons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  // Quiz submission handler
  const handleOpenLesson = async (lesson) => {
    try {
      const res = await fetch(`${API_URL}/lessons/${lesson.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLesson(data);
        setQuizAnswers({});
        setQuizResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAnswer = (questionId, option) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!selectedLesson) return;
    
    // Validate all questions answered
    const unanswered = selectedLesson.questions.some(q => !quizAnswers[q.id]);
    if (unanswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const payload = {
      answers: Object.entries(quizAnswers).map(([qid, ans]) => ({
        question_id: parseInt(qid),
        answer: ans
      }))
    };

    try {
      const res = await fetch(`${API_URL}/lessons/${selectedLesson.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
        refreshPoints();
        fetchLessons(); // Refresh completion status
      } else {
        alert(data.detail || "Failed to submit quiz.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Booking handler
  const handleBookSlot = async (slotId) => {
    setBookingSuccess("");
    setBookingError("");
    try {
      const res = await fetch(`${API_URL}/appointments/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ slot_id: slotId })
      });
      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(`Appointment successfully booked! Token: ${data.consultation_token}`);
        refreshPoints();
        fetchSlots();
        fetchAppointments();
      } else {
        setBookingError(data.detail || "Booking failed.");
      }
    } catch (err) {
      setBookingError("Server error occurred during booking.");
    }
  };

  // Symptom reports handler
  const handleSymptomChange = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms(prev => [...prev, symptom]);
    }
  };

  const handleSubmitSymptoms = async (e) => {
    e.preventDefault();
    setSymptomSuccess("");
    setSymptomError("");

    if (selectedSymptoms.length === 0) {
      setSymptomError("Please select at least one symptom.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/analytics/report-symptoms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ symptoms: selectedSymptoms })
      });
      if (res.ok) {
        setSymptomSuccess("Symptoms successfully reported. This helps our school tracking dashboard predict outbreaks!");
        setSelectedSymptoms([]);
      } else {
        const data = await res.json();
        setSymptomError(data.detail || "Failed to report symptoms.");
      }
    } catch (err) {
      setSymptomError("Server communication failed.");
    }
  };

  // WebRTC Video Call Actions
  const startVideoCall = async (appointment) => {
    setActiveCallRoom(appointment.room_id);
    setCallStatus("Acquiring camera access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect WebSocket signaling
      const wsUrl = `ws://127.0.0.1:8000/api/webrtc/ws/${appointment.room_id}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setCallStatus("Connected to consultation room. Waiting for doctor to join...");
        // Send a join notification
        socketRef.current.send(JSON.stringify({ type: "join", user: user.full_name }));
      };

      socketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);
        if (message.type === "join") {
          setCallStatus(`Doctor (${message.user}) joined! Active consultation in progress.`);
        }
      };

      socketRef.current.onerror = (err) => {
        setCallStatus("Signaling server error. Reconnecting...");
      };

      socketRef.current.onclose = () => {
        setCallStatus("Lobby connection closed.");
      };

    } catch (err) {
      console.error(err);
      setCallStatus("Failed to get media devices. Please allow camera permissions.");
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
    setActiveCallRoom(null);
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
            Welcome, <strong>{user?.full_name}</strong> ({user?.school?.name || "Student Portal"})
          </span>
        </div>
        <div className="nav-links">
          <div className="points-pill">
            <span style={{ fontSize: "1.1rem" }}>❤️</span> {user?.health_points} Health Points
          </div>
          <button className="btn btn-outline" onClick={logout} style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button
          className={`btn ${activeTab === "lessons" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("lessons")}
        >
          📚 Lessons & Quizzes
        </button>
        <button
          className={`btn ${activeTab === "booking" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("booking")}
        >
          🏥 Telemedicine Consultations
        </button>
        <button
          className={`btn ${activeTab === "symptoms" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("symptoms")}
        >
          🤒 Report Daily Symptoms
        </button>
      </div>

      {/* TABS CONTENT */}

      {/* 1. LESSONS TAB */}
      {activeTab === "lessons" && (
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3>Micro-learning Modules</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Complete brief lessons on sanitation and wellbeing, score 70% or more, and earn health points for free doctor bookings!
            </p>
          </div>

          <div className="grid-3">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="glass-panel glass-panel-hover" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <h4 style={{ color: "#ffffff" }}>{lesson.title}</h4>
                    {lesson.completed ? (
                      <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "50px", fontWeight: "600" }}>
                        Passed
                      </span>
                    ) : (
                      <span style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--color-primary)", fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "50px", fontWeight: "600" }}>
                        +{lesson.points_value} HP
                      </span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{lesson.description}</p>
                </div>
                <button className="btn btn-outline" onClick={() => handleOpenLesson(lesson)} style={{ width: "100%" }}>
                  {lesson.completed ? "Review Lesson" : "Start Lesson"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TELEMEDICINE TAB */}
      {activeTab === "booking" && (
        <div>
          {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}
          {bookingError && <div className="alert alert-danger">{bookingError}</div>}

          <div className="grid-2">
            {/* Book slots */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                Book Consultation Slot
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Redeem <strong>100 Health Points</strong> to secure an appointment with a volunteer healthcare provider.
              </p>

              {slots.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  No available doctor slots at the moment. Please check back later.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {slots.map((slot) => (
                    <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)" }}>
                      <div>
                        <strong style={{ display: "block" }}>Doctor ID: #{slot.doctor_id}</strong>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {formatDate(slot.start_time)} - {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleBookSlot(slot.id)}
                        disabled={user?.health_points < 100}
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      >
                        Book slot (100 HP)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booked Appointments */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                Your Scheduled Consultations
              </h3>
              {appointments.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No appointments booked yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {appointments.map((appt) => (
                    <div key={appt.id} style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <strong>{appt.doctor_name}</strong>
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
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        📅 {formatDate(appt.scheduled_time)}
                        <br />
                        🔑 Voucher Code: <code>{appt.consultation_token}</code>
                      </div>
                      {appt.status === "booked" && (
                        <button className="btn btn-primary" onClick={() => startVideoCall(appt)} style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem" }}>
                          📹 Join Video Consultation Room
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SYMPTOMS TAB */}
      {activeTab === "symptoms" && (
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Report Symptoms
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Tick any symptoms that you or your child are experiencing today. This information is anonymized and aggregated to help local health officers track absenteeism risks.
            </p>

            {symptomSuccess && <div className="alert alert-success">{symptomSuccess}</div>}
            {symptomError && <div className="alert alert-danger">{symptomError}</div>}

            <form onSubmit={handleSubmitSymptoms}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                {symptomsList.map((symptom) => (
                  <label key={symptom} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.includes(symptom)}
                      onChange={() => handleSymptomChange(symptom)}
                      style={{ transform: "scale(1.2)" }}
                    />
                    <span>{symptom}</span>
                  </label>
                ))}
              </div>
              <button type="submit" className="btn btn-secondary" style={{ width: "100%" }}>
                Submit Symptoms Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LESSON DETAIL / QUIZ MODAL */}
      {selectedLesson && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItem: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "1rem" }}>
              <h2>{selectedLesson.title}</h2>
              <button onClick={() => setSelectedLesson(null)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.5rem", cursor: "pointer" }}>
                &times;
              </button>
            </div>

            {!quizResult ? (
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "2rem", maxHeight: "250px", overflowY: "auto", paddingRight: "0.5rem" }}>
                  {/* Simplistic Markdown renderer */}
                  {selectedLesson.content_markdown.split("\n\n").map((para, i) => {
                    if (para.startsWith("# ")) return <h2 key={i} style={{ margin: "1rem 0" }}>{para.substring(2)}</h2>;
                    if (para.startsWith("## ")) return <h3 key={i} style={{ margin: "0.75rem 0" }}>{para.substring(3)}</h3>;
                    if (para.startsWith("* ")) {
                      return (
                        <ul key={i} style={{ paddingLeft: "1.5rem", margin: "0.5rem 0" }}>
                          {para.split("\n").map((li, idx) => (
                            <li key={idx}>{li.replace("* ", "")}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={i} style={{ marginBottom: "1rem" }}>{para}</p>;
                  })}
                </div>

                <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1rem" }}>Knowledge Check Quiz</h3>
                  <form onSubmit={handleSubmitQuiz}>
                    {selectedLesson.questions.map((q, idx) => (
                      <div key={q.id} style={{ marginBottom: "1.5rem" }}>
                        <p style={{ fontWeight: "600", marginBottom: "0.75rem" }}>
                          {idx + 1}. {q.question_text}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {["A", "B", "C", "D"].map(opt => {
                            const optionText = q[`option_${opt.toLowerCase()}`];
                            return (
                              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  checked={quizAnswers[q.id] === opt}
                                  onChange={() => handleSelectAnswer(q.id, opt)}
                                />
                                <span><strong>{opt}.</strong> {optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                      Submit Answers
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
                  {quizResult.success ? "🎉" : "❌"}
                </div>
                <h3 style={{ marginBottom: "1rem" }}>
                  {quizResult.success ? "Congratulations! You Passed!" : "Quiz Failed. Please Review and Try Again."}
                </h3>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Score: <strong>{quizResult.score} / {quizResult.total_questions}</strong> Correct
                </p>
                {quizResult.points_earned > 0 ? (
                  <div className="alert alert-success" style={{ display: "inline-block" }}>
                    Earned +{quizResult.points_earned} Health Points!
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {quizResult.success ? "Lesson already completed previously. No extra points earned." : "Score at least 70% to pass and earn points."}
                  </p>
                )}
                <div style={{ marginTop: "2rem" }}>
                  <button className="btn btn-outline" onClick={() => setSelectedLesson(null)}>
                    Close Lesson
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEBRTC CALLING INTERACTIVE POPUP */}
      {activeCallRoom && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "800px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3>Lightweight In-App Telemedicine Lobby</h3>
              <button className="btn btn-danger" onClick={endVideoCall} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                Leave Consult
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
                  Student (You)
                </div>
              </div>

              {/* Remote Mock Stream */}
              <div style={{ position: "relative", background: "#1f2937", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                {callStatus.includes("Doctor (") ? (
                  /* Mocking Doctor Active Video Camera */
                  <div style={{ width: "100%", height: "100%", position: "relative", background: "linear-gradient(135deg, #1e293b, #374151)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <span style={{ fontSize: "4rem" }}>👨‍⚕️</span>
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(16, 185, 129, 0.2)", color: "var(--color-success)", border: "1px solid var(--color-success)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>
                      LIVE
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>⌛</span>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      Waiting for doctor's video feed...
                    </p>
                  </div>
                )}
                <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0, 0, 0, 0.6)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                  Remote Doctor
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem", textAlign: "center" }}>
              WebRTC peer-to-peer visual connection uses HTML5 navigator APIs and direct WebSocket room broadcasts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
