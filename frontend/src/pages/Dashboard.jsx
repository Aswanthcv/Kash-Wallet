import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import Spinner from "../components/Spinner";
import TransactionForm from "../components/TransactionForm";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const [summaryResponse, walletsResponse, transactionsResponse] = await Promise.all([
        api.get("/summary/"),
        api.get("/wallets/"),
        api.get("/transactions/"),
      ]);
      setSummary(summaryResponse.data);
      setWallets(walletsResponse.data);
      setTransactions(transactionsResponse.data.slice(0, 8));
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load dashboard data when the page opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  async function saveTransaction(data, keepOpen = false) {
    setSaving(true);
    setModalError("");
    try {
      await api.post("/transactions/", data);
      await loadData();
      if (!keepOpen) setShowForm(false);
      return true;
    } catch (requestError) {
      setModalError(getErrorMessage(requestError));
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour <= 11 ? "Good morning" : hour >= 12 && hour <= 16 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          {summary && <><h1 className="text-3xl font-bold text-gray-900">{greeting}, {summary.username.charAt(0).toUpperCase() + summary.username.slice(1)} 👋</h1><p className="mt-1 text-gray-600">Here's your money at a glance.</p></>}
        </div>
        {wallets.length ? <button onClick={() => { setModalError(""); setShowForm(true); }} className="button">+ Add transaction</button> : <Link className="font-semibold text-green-700" to="/wallets">Create a wallet first</Link>}
      </div>
      <ErrorMessage message={error} />

      {summary && <DashboardSummary summary={summary} />}
      <WalletSection wallets={wallets} />
      <TransactionSection transactions={transactions} />
      {showForm && <TransactionForm wallets={wallets} onSubmit={saveTransaction} onCancel={() => setShowForm(false)} error={modalError} loading={saving} />}
    </div>
  );
}

function DashboardSummary({ summary }) {
  return <div className="space-y-4">
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">Total balance</p>
      <p className="mt-2 text-3xl font-bold text-green-700">{formatCurrency(summary.total_balance)}</p>
    </section>
    <section className="grid gap-4 sm:grid-cols-3">
      <SummaryCard label="Income" value={summary.this_month.income} color="text-green-700" />
      <SummaryCard label="Spent" value={summary.this_month.expense} color="text-red-600" />
      <SummaryCard label="Savings received" value={summary.this_month.saving} color="text-blue-700" />
    </section>
  </div>;
}

function SummaryCard({ label, value, color }) {
  return <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">This month {label.toLowerCase()}</p><p className={`mt-2 text-xl font-bold ${color}`}>{formatCurrency(value)}</p></div>;
}

function WalletSection({ wallets }) {
  return <section><h2 className="mb-4 text-xl font-semibold">Your wallets</h2>{wallets.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{wallets.map((wallet) => <article key={wallet.id} className="rounded-xl bg-white p-5 shadow-sm"><p className="break-words text-gray-500">{wallet.name}</p><p className="mt-2 text-xl font-bold text-green-700">{formatCurrency(wallet.balance)}</p></article>)}</div> : <EmptyState>No wallets yet, <Link className="font-semibold text-green-700" to="/wallets">add one</Link>.</EmptyState>}</section>;
}

function TransactionSection({ transactions }) {
  return <section><h2 className="mb-4 text-xl font-semibold">Recent transactions</h2>{transactions.length ? <div className="space-y-3">{transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div> : <EmptyState>No transactions yet.</EmptyState>}</section>;
}

function TransactionRow({ transaction }) {
  const isIncome = transaction.type === "INCOME";
  const sign = isIncome || transaction.type === "SAVING" ? "+" : "-";
  const color = isIncome ? "text-green-700" : transaction.type === "EXPENSE" ? "text-red-600" : "text-blue-700";
  return <article className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{transaction.note || transaction.type}</p><p className="text-sm text-gray-500">{transaction.wallet_name} · {formatDate(transaction.date)}</p></div><p className={`font-semibold ${color}`}>{sign}{formatCurrency(transaction.amount)}</p></article>;
}
