import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "./ConfirmModal";

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-green-100 text-green-800" : "text-gray-600 hover:bg-gray-100"}`;

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function handleLogout() {
    setShowLogoutConfirm(true);
  }

  function confirmLogout() {
    logout();
    setShowLogoutConfirm(false);
    navigate("/login");
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <NavLink to="/" className="text-xl font-bold text-green-700">Kash-Wallet</NavLink>
        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/wallets" className={linkClass}>Wallets</NavLink>
          <NavLink to="/transactions" className={linkClass}>Transactions</NavLink>
          <button onClick={handleLogout} className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Logout</button>
        </nav>
      </div>
      {showLogoutConfirm && <ConfirmModal title="Log out?" message="You will need to log in again to see your wallets." confirmText="Log out" onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />}
    </header>
  );
}
