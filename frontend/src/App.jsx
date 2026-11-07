import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

const Placeholder = ({ name }) => (
  <h1 className="p-8 text-2xl font-bold text-green-700">{name}</h1>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Placeholder name="Login page" />} />
      <Route path="/register" element={<Placeholder name="Register page" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Placeholder name="Dashboard" />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}