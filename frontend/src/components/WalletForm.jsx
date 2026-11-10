import { useState } from "react";
import ErrorMessage from "./ErrorMessage";

export default function WalletForm({ wallet, onSubmit, onCancel, error, loading }) {
  const [form, setForm] = useState(wallet ? { name: wallet.name, initial_balance: wallet.initial_balance } : { name: "", initial_balance: "0.00" });
  function submit(event) { event.preventDefault(); onSubmit(form); }
  return <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">{wallet ? "Edit wallet" : "Add a wallet"}</h2><ErrorMessage message={error} /><input required placeholder="Wallet name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /><input required min="0" step="0.01" type="number" placeholder="Initial balance" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} className="input" /><div className="flex gap-2"><button disabled={loading} className="button">{loading ? "Saving..." : "Save wallet"}</button>{wallet && <button type="button" onClick={onCancel} className="secondary-button">Cancel</button>}</div></form>;
}
