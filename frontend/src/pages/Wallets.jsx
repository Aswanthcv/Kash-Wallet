import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import { formatCurrency, getErrorMessage } from "../utils/format";

const initialForm = {
  name: "",
  initial_balance: "0",
  editingId: null,
  editName: "",
  loading: false,
};

export default function Wallets() {
  const [wallets, setWallets] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState("");

  // Load all wallets when the page opens.
  async function loadWallets() {
    try {
      const { data } = await api.get("/wallets/");
      setWallets(data);
    } catch (error) {
      setErrors(getErrorMessage(error));
    }
  }

  useEffect(() => {
    async function fetchWallets() {
      await loadWallets();
    }

    fetchWallets();
  }, []);

  // Add a wallet, then reload computed balances from the server.
  async function addWallet(event) {
    event.preventDefault();
    setErrors("");
    setForm({ ...form, loading: true });

    try {
      await api.post("/wallets/", {
        name: form.name,
        initial_balance: form.initial_balance,
      });
      setForm(initialForm);
      await loadWallets();
    } catch (error) {
      setErrors(getErrorMessage(error));
      setForm({ ...form, loading: false });
    }
  }

  // Rename a wallet without changing its balance.
  async function renameWallet(wallet) {
    setErrors("");
    setForm({ ...form, loading: true });

    try {
      await api.patch(`/wallets/${wallet.id}/`, { name: form.editName });
      setForm(initialForm);
      await loadWallets();
    } catch (error) {
      setErrors(getErrorMessage(error));
      setForm({ ...form, loading: false });
    }
  }

  // Delete a wallet only after warning about its transactions.
  async function deleteWallet(wallet) {
    const warning = `Delete ${wallet.name}? All transactions in this wallet will also be deleted.`;
    if (!window.confirm(warning)) return;

    setErrors("");
    try {
      await api.delete(`/wallets/${wallet.id}/`);
      await loadWallets();
    } catch (error) {
      setErrors(getErrorMessage(error));
    }
  }

  if (wallets === null) return <Spinner label="Loading wallets..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Wallets</h1>
        <p className="mt-1 text-gray-600">Manage your accounts and balances.</p>
      </div>

      <form onSubmit={addWallet} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Add a wallet</h2>
        {errors && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Wallet name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input" />
          <input required min="0" step="0.01" type="number" value={form.initial_balance} onChange={(event) => setForm({ ...form, initial_balance: event.target.value })} className="input" />
        </div>
        <button disabled={form.loading} className="button">{form.loading ? "Adding..." : "Add wallet"}</button>
      </form>

      {wallets.length === 0 ? <EmptyState>No wallets yet, <Link className="font-semibold text-green-700" to="/wallets">add one above</Link>.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{wallets.map((wallet) => <WalletCard key={wallet.id} wallet={wallet} form={form} setForm={setForm} renameWallet={renameWallet} deleteWallet={deleteWallet} />)}</div>}
    </div>
  );
}

function WalletCard({ wallet, form, setForm, renameWallet, deleteWallet }) {
  const isEditing = form.editingId === wallet.id;

  return <article className="rounded-xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1">{isEditing ? <input autoFocus value={form.editName} onChange={(event) => setForm({ ...form, editName: event.target.value })} className="input" /> : <h2 className="font-semibold text-gray-900">{wallet.name}</h2>}</div><p className="text-lg font-bold text-green-700">{formatCurrency(wallet.balance)}</p></div><dl className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Initial balance</dt><dd>{formatCurrency(wallet.initial_balance)}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Current balance</dt><dd className="font-semibold text-green-700">{formatCurrency(wallet.balance)}</dd></div></dl><div className="mt-5 flex gap-3 text-sm">{isEditing ? <><button disabled={form.loading} onClick={() => renameWallet(wallet)} className="font-semibold text-green-700">Save</button><button disabled={form.loading} onClick={() => setForm(initialForm)} className="font-semibold text-gray-600">Cancel</button></> : <button onClick={() => setForm({ ...form, editingId: wallet.id, editName: wallet.name })} className="font-semibold text-green-700">Rename</button>}<button disabled={form.loading} onClick={() => deleteWallet(wallet)} className="font-semibold text-red-600">Delete</button></div></article>;
}
