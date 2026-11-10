import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/format";

export default function Login() {
  const { isAuthed, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (isAuthed) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || getErrorMessage(err));
    } finally { setLoading(false); }
  }

  return <AuthCard><h1 className="text-2xl font-bold text-green-700">Kash-Wallet</h1><p className="mb-6 mt-1 text-gray-600">Track every rupee, wallet by wallet.</p><form onSubmit={handleSubmit} className="space-y-4">{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<input required placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="input" /><input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" /><button disabled={loading} className="button w-full">{loading ? "Logging in..." : "Log in"}</button></form><p className="mt-5 text-center text-sm text-gray-600">Need an account? <Link className="font-medium text-green-700" to="/register">Register</Link></p></AuthCard>;
}

function AuthCard({ children }) {
  return <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4"><section className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">{children}</section></main>;
}
