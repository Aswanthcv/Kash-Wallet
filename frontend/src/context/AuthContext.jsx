import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(!!localStorage.getItem("access"));

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    setIsAuthed(true);
  };

  const register = async (username, email, password, confirmPassword) => {
    await api.post("/auth/register/", { username, email, password, confirm_password: confirmPassword });
    await login(username, password); // log in right after signing up
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthed, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
