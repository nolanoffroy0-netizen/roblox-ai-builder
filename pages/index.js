import { useState, useEffect } from "react";

export default function Home() {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [statusData, setStatusData] = useState({ status: null, history: [] });
  const [error, setError] = useState("");

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatusData(data);
    } catch (e) {
      // silencieux, juste du polling d'affichage
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLastCommand(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error + (data.detail ? ": " + data.detail : ""));
      } else {
        setLastCommand(data.command);
        setInstruction("");
      }
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Roblox AI Builder</h1>
        <p style={styles.subtitle}>
          Decris ce que tu veux dans ton jeu. Le code Luau genere sera recupere
          automatiquement par le plugin dans Roblox Studio.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            style={styles.textarea}
            placeholder="Ex: cree une plateforme qui monte et descend en boucle"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
          />
          <button style={styles.button} type="submit" disabled={loading || !instruction.trim()}>
            {loading ? "Generation..." : "Generer et envoyer a Studio"}
          </button>
        </form>

        {error && <div style={styles.error}>{error}</div>}

        {lastCommand && (
          <div style={styles.card}>
            <h3>Commande envoyee</h3>
            <p><strong>Explication :</strong> {lastCommand.explication}</p>
            {lastCommand.instances?.map((inst, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <p>
                  <strong>{inst.class_name}</strong> → {inst.path}
                </p>
                {inst.properties?.Source && (
                  <pre style={styles.code}>{inst.properties.Source}</pre>
                )}
              </div>
            ))}
            <p style={styles.hint}>
              En attente que le plugin Roblox Studio la recupere...
            </p>
          </div>
        )}

        <div style={styles.card}>
          <h3>Dernier statut recu depuis Roblox Studio</h3>
          {statusData.status ? (
            <div>
              <p>
                <strong>Resultat :</strong>{" "}
                {statusData.status.success ? "Succes" : "Erreur"}
              </p>
              <p><strong>Message :</strong> {statusData.status.message}</p>
              <p style={styles.hint}>
                Recu a {new Date(statusData.status.received_at).toLocaleString()}
              </p>
              {statusData.status.game_content && (
                <pre style={styles.code}>
                  {JSON.stringify(statusData.status.game_content, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p style={styles.hint}>Aucun statut recu pour l'instant.</p>
          )}
        </div>

        {statusData.history?.length > 0 && (
          <div style={styles.card}>
            <h3>Historique recent</h3>
            {statusData.history.map((h, i) => (
              <div key={i} style={styles.historyItem}>
                <span>{h.success ? "OK" : "Erreur"}</span> — {h.message} —{" "}
                <span style={styles.hint}>
                  {new Date(h.received_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f1115",
    color: "#e8e8e8",
    fontFamily: "system-ui, sans-serif",
    padding: "40px 16px",
  },
  container: { maxWidth: 720, margin: "0 auto" },
  title: { fontSize: 28, marginBottom: 4 },
  subtitle: { color: "#9aa0a6", marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 },
  textarea: {
    background: "#1a1d23",
    color: "#e8e8e8",
    border: "1px solid #2a2d33",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    resize: "vertical",
  },
  button: {
    background: "#5865f2",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 15,
    cursor: "pointer",
  },
  error: {
    background: "#3a1a1a",
    border: "1px solid #7a2a2a",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  card: {
    background: "#1a1d23",
    border: "1px solid #2a2d33",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  code: {
    background: "#0f1115",
    padding: 12,
    borderRadius: 6,
    overflowX: "auto",
    fontSize: 13,
    whiteSpace: "pre-wrap",
  },
  hint: { color: "#7a7f87", fontSize: 13 },
  historyItem: { padding: "4px 0", borderBottom: "1px solid #2a2d33", fontSize: 14 },
};
