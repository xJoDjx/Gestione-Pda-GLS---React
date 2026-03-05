import { useState } from "react";
import { useAuth } from "./AuthContext";

export const LoginScreen = () => {
  const { login, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    login(username, password);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <div style={{ width: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 76, height: 76, borderRadius: 22,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 8px 32px rgba(59,130,246,0.45)", marginBottom: 18
          }}>
            <svg width="38" height="38" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            GLS Manager
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>
            Gestione Padroncini & Conteggi
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)",
          borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)",
          padding: "38px 42px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)"
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 26 }}>
            Accedi al tuo account
          </div>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>
              Username
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              autoFocus
              placeholder="Il tuo username"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, boxSizing: "border-box",
                border: "1.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "#f1f5f9", fontSize: 14, outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24, position: "relative" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>
              Password
            </label>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
              style={{
                width: "100%", padding: "12px 70px 12px 14px", borderRadius: 10, boxSizing: "border-box",
                border: "1.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "#f1f5f9", fontSize: 14, outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
            <button onClick={() => setShowPwd(!showPwd)} style={{
              position: "absolute", right: 12, bottom: 10,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "#94a3b8", cursor: "pointer", fontSize: 11,
              padding: "3px 8px", fontWeight: 600
            }}>
              {showPwd ? "Nascondi" : "Mostra"}
            </button>
          </div>

          {/* Error */}
          {loginError && (
            <div style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 9, padding: "10px 14px", marginBottom: 18,
              fontSize: 13, color: "#fca5a5", display: "flex", alignItems: "center", gap: 8
            }}>
              ⚠ {loginError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !username || !password}
            style={{
              width: "100%", padding: "14px", borderRadius: 11, border: "none",
              background: (!username || !password || loading)
                ? "rgba(59,130,246,0.35)"
                : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: (!username || !password || loading) ? "not-allowed" : "pointer",
              boxShadow: "0 4px 20px rgba(59,130,246,0.3)", transition: "all 0.2s",
              letterSpacing: "0.02em"
            }}>
            {loading ? "Accesso in corso..." : "→  Accedi"}
          </button>

          <div style={{ textAlign: "center", marginTop: 22, fontSize: 11, color: "#334155" }}>
            Accesso riservato al personale autorizzato
          </div>
        </div>

        {/* hint credenziali default */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#334155" }}>
          Prima configurazione: <span style={{ color: "#475569", fontFamily: "monospace" }}>admin / admin123</span>
        </div>
      </div>
    </div>
  );
};
