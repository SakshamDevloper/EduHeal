import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const API_URL = "http://127.0.0.1:8000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("eduheal_token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }
      
      localStorage.setItem("eduheal_token", data.access_token);
      setToken(data.access_token);
      await fetchProfile(data.access_token);
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      return false;
    }
  };

  const register = async (fullName, email, password, role, schoolId) => {
    setError("");
    try {
      const payload = {
        full_name: fullName,
        email,
        password,
        role,
        school_id: schoolId ? parseInt(schoolId) : null,
      };

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      // Automatically log in
      return await login(email, password);
    } catch (err) {
      setError(err.message || "Registration failed. Please check your fields.");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("eduheal_token");
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshPoints = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Error refreshing user points:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        refreshPoints,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
