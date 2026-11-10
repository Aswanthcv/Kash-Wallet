import { useEffect } from "react";

export default function ConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onCancel();
  }

  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4" onClick={handleBackdropClick}><div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold text-gray-900">{title}</h2><p className="mt-2 text-gray-600">{message}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">{cancelText}</button><button type="button" onClick={onConfirm} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">{confirmText}</button></div></div></div>;
}
