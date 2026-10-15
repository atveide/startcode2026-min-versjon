import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState<string>("loading…");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { status: string }) => setStatus(data.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main>
      <h1>Hello</h1>
      <p>Backend status: {status}</p>
    </main>
  );
}
