import { useEffect, useRef, useState } from "react";
import ErrorMessage from "./ErrorMessage";

const types = [
  { value: "INCOME", label: "Income", active: "border-green-600 bg-green-100 text-green-700" },
  { value: "EXPENSE", label: "Expense", active: "border-red-600 bg-red-100 text-red-700" },
  { value: "SAVING", label: "Saving", active: "border-blue-600 bg-blue-100 text-blue-700" },
];

function localDateTime(value) {
  if (!value) return new Date().toISOString().slice(0, 16);
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function TransactionForm({ transaction, wallets, onSubmit, onCancel, error, loading }) {
  const amountRef = useRef(null);
  const [form, setForm] = useState(transaction ? {
    wallet: String(transaction.wallet),
    type: transaction.type,
    amount: transaction.amount,
    date: localDateTime(transaction.date),
    note: transaction.note || "",
  } : {
    wallet: wallets[0] ? String(wallets[0].id) : "",
    type: "INCOME",
    amount: "",
    date: localDateTime(),
    note: "",
  });

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    const keepOpen = event.nativeEvent.submitter?.name === "saveAndAddAnother";
    const saved = await onSubmit({ ...form, wallet: Number(form.wallet), date: new Date(form.date).toISOString() }, keepOpen);
    if (saved && keepOpen) setForm({ ...form, amount: "", note: "" });
  }

  return <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4 py-6"><form onSubmit={submit} className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{transaction ? "Edit transaction" : "Add transaction"}</h2><button type="button" onClick={onCancel} className="text-2xl text-gray-400" aria-label="Close">&times;</button></div><ErrorMessage message={error} /><div className="relative"><span className="pointer-events-none absolute left-3 top-2 text-gray-500">₹</span><input ref={amountRef} required min="0.01" step="0.01" type="number" name="amount" placeholder="Amount" value={form.amount} onChange={updateField} className="input pl-8 text-lg" /></div><div><p className="mb-2 text-sm font-medium text-gray-700">Type</p><div className="grid grid-cols-3 gap-2">{types.map((type) => <button key={type.value} type="button" onClick={() => setForm({ ...form, type: type.value })} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.type === type.value ? type.active : "border-gray-300 text-gray-600"}`}>{type.label}</button>)}</div>{form.type === "SAVING" && <p className="mt-2 text-sm text-gray-500">Gifts, vouchers, money from family. Adds to your wallet.</p>}</div><select required name="wallet" value={form.wallet} onChange={updateField} className="input"><option value="">Choose wallet</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select><div><label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="transaction-date">Date &amp; time</label><input id="transaction-date" required type="datetime-local" name="date" value={form.date} onChange={updateField} className="input" /></div><div><label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="transaction-note">Note (optional)</label><input id="transaction-note" maxLength="60" name="note" placeholder="e.g. Coffee, Auto fare" value={form.note} onChange={updateField} className="input" /></div><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="secondary-button">Cancel</button>{!transaction && <button type="submit" name="saveAndAddAnother" disabled={loading || !wallets.length} className="secondary-button">Save and add another</button>}<button type="submit" disabled={loading || !wallets.length} className="button">{loading ? "Saving..." : "Save transaction"}</button></div></form></div>;
}
