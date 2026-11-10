import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import Spinner from "../components/Spinner";
import TransactionForm from "../components/TransactionForm";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format";

export default function Transactions() {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ wallet: "", type: "", date_from: "", date_to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadWallets() {
      try {
        const { data } = await api.get("/wallets/");
        setWallets(data);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      }
    }
    loadWallets();
  }, []);

  useEffect(() => {
    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      return;
    }
    loadTransactions();
  }, [filters]);

  const invalidDateRange = filters.date_from && filters.date_to && filters.date_from > filters.date_to;

  function requestParams() {
    const params = {};
    if (filters.wallet) params.wallet = filters.wallet;
    if (filters.type) params.type = filters.type;
    if (filters.date_from) params.date_from = new Date(`${filters.date_from}T00:00:00`).toISOString();
    if (filters.date_to) params.date_to = new Date(`${filters.date_to}T23:59:59`).toISOString();
    return params;
  }

  async function loadTransactions() {
    setLoading(true);
    try {
      const { data } = await api.get("/transactions/", { params: requestParams() });
      setTransactions(data);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function saveTransaction(data, keepOpen = false) {
    setSaving(true);
    setModalError("");
    try {
      if (editing) await api.patch(`/transactions/${editing.id}/`, data);
      else await api.post("/transactions/", data);
      if (!keepOpen) {
        setShowForm(false);
        setEditing(null);
      }
      await loadTransactions();
      return true;
    } catch (requestError) {
      setModalError(getErrorMessage(requestError));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(transaction) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${transaction.id}/`);
      await loadTransactions();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  function updateFilter(name, value) { setFilters({ ...filters, [name]: value }); }
  function openAddForm() { setEditing(null); setModalError(""); setShowForm(true); }
  function openEditForm(transaction) { setEditing(transaction); setModalError(""); setShowForm(true); }
  function clearFilters() { setFilters({ wallet: "", type: "", date_from: "", date_to: "" }); }

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-gray-900">Transactions</h1><p className="mt-1 text-gray-600">Record and review your money movements.</p></div><button onClick={openAddForm} className="button">Add transaction</button></div><section className="rounded-xl bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Filters</h2><button type="button" onClick={clearFilters} className="text-sm font-semibold text-green-700">Clear filters</button></div><div className="grid gap-3 sm:grid-cols-4"><select value={filters.wallet} onChange={(event) => updateFilter("wallet", event.target.value)} className="input"><option value="">All wallets</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select><select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className="input"><option value="">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option><option value="SAVING">Saving</option></select><div><label className="mb-1 block text-sm text-gray-600" htmlFor="transaction-filter-from">From</label><input id="transaction-filter-from" type="date" value={filters.date_from} onChange={(event) => updateFilter("date_from", event.target.value)} className="input" /></div><div><label className="mb-1 block text-sm text-gray-600" htmlFor="transaction-filter-to">To</label><input id="transaction-filter-to" type="date" value={filters.date_to} onChange={(event) => updateFilter("date_to", event.target.value)} className="input" /></div></div>{invalidDateRange && <p className="mt-2 text-sm text-red-600">From date must be before To date</p>}</section><ErrorMessage message={error} />{loading ? <Spinner /> : transactions.length ? <TransactionTable transactions={transactions} onEdit={openEditForm} onDelete={deleteTransaction} /> : <EmptyState>No transactions found.</EmptyState>}{showForm && <TransactionForm key={editing?.id || "new"} transaction={editing} wallets={wallets} onSubmit={saveTransaction} onCancel={() => setShowForm(false)} error={modalError} loading={saving} />}</div>;
}

function TransactionTable({ transactions, onEdit, onDelete }) {
  return <div className="overflow-hidden rounded-xl bg-white shadow-sm"><div className="hidden md:block overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-gray-50 text-gray-500"><tr><th className="px-4 py-3">Note</th><th className="px-4 py-3">Wallet</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />)}</tbody></table></div><div className="space-y-3 p-3 md:hidden">{transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />)}</div></div>;
}

function amountStyle(transaction) {
  if (transaction.type === "INCOME") return { sign: "+", color: "text-green-700" };
  if (transaction.type === "EXPENSE") return { sign: "-", color: "text-red-600" };
  return { sign: "+", color: "text-blue-700" };
}

function TransactionRow({ transaction, onEdit, onDelete }) {
  const amount = amountStyle(transaction);
  return <tr className="border-b last:border-0"><td className="px-4 py-3 font-semibold">{transaction.note || transaction.type}</td><td className="px-4 py-3">{transaction.wallet_name}</td><td className="px-4 py-3">{transaction.type}</td><td className="px-4 py-3 text-gray-500">{formatDate(transaction.date)}</td><td className={`px-4 py-3 font-semibold ${amount.color}`}>{amount.sign}{formatCurrency(transaction.amount)}</td><td className="px-4 py-3"><Actions transaction={transaction} onEdit={onEdit} onDelete={onDelete} /></td></tr>;
}

function TransactionCard({ transaction, onEdit, onDelete }) {
  const amount = amountStyle(transaction);
  return <article className="rounded-lg border border-gray-100 p-4"><div className="flex justify-between"><div><p className="font-semibold">{transaction.note || transaction.type}</p><p className="text-sm text-gray-500">{transaction.wallet_name} · {formatDate(transaction.date)}</p></div><p className={`font-semibold ${amount.color}`}>{amount.sign}{formatCurrency(transaction.amount)}</p></div><div className="mt-3"><Actions transaction={transaction} onEdit={onEdit} onDelete={onDelete} /></div></article>;
}

function Actions({ transaction, onEdit, onDelete }) {
  return <div className="flex gap-3 text-sm"><button onClick={() => onEdit(transaction)} className="font-semibold text-green-700">Edit</button><button onClick={() => onDelete(transaction)} className="font-semibold text-red-600">Delete</button></div>;
}
