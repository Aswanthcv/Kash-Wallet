import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/format";

export default function Register() {
  const { isAuthed, register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState([]); const [loading, setLoading] = useState(false);
  if (isAuthed) return <Navigate to="/" replace />;

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault(); setErrors([]); setLoading(true);
    if (form.password !== form.confirmPassword) { setErrors(["Passwords do not match"]); setLoading(false); return; }
    try { await register(form.username, form.email, form.password, form.confirmPassword); navigate("/"); }
    catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object" && !data.detail) {
        setErrors(Object.entries(data).map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(" ") : messages}`));
      } else setErrors([data?.detail || getErrorMessage(err)]);
    }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4"><section className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold text-green-700">Kash-Wallet</h1><p className="mb-6 mt-1 text-gray-600">Track every rupee, wallet by wallet.</p><form onSubmit={handleSubmit} className="space-y-4">{errors.length > 0 && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.map((message) => <p key={message}>{message}</p>)}</div>}<input required name="username" placeholder="Username" value={form.username} onChange={updateField} className="input" /><input required name="email" type="email" placeholder="Email" value={form.email} onChange={updateField} className="input" /><input required name="password" type="password" placeholder="Password" value={form.password} onChange={updateField} className="input" /><input required name="confirmPassword" type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={updateField} className="input" /><button disabled={loading} className="button w-full">{loading ? "Creating account..." : "Register"}</button></form><p className="mt-5 text-center text-sm text-gray-600">Already have an account? <Link className="font-medium text-green-700" to="/login">Log in</Link></p></section></main>;
}
