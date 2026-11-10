export default function ErrorMessage({ message }) {
  if (!message) return null;
  return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>;
}
