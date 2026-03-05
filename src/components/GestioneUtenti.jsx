import { useState } from "react";
import { useAuth, SEZIONI } from "./AuthContext";
import { Icon } from "./Icons";
import { Badge } from "./BaseComponents";

const EMPTY = {
  id: null, username: "", password: "", nome: "",
  ruolo: "operatore", sezioni: ["dashboard"], attivo: true
};

export const GestioneUtenti = () => {
  const { users, saveUtente, deleteUtente, currentUser } = useAuth();
  const [editing, setEditing] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const openNew  = () => { setShowPwd(false); setEditing({ ...EMPTY }); };
  const openEdit = (u) => { setShowPwd(false); setEditing({ ...u }); };
  const close    = () => setEditing(null);

  const toggleSezione = (sid) =>
    setEditing(e => ({
      ...e,
      sezioni: e.sezioni.includes(sid)
        ? e.sezioni.filter(s => s !== sid)
        : [...e.sezioni, sid]
    }));

  const handleSave = () => {
    if (!editing.username.trim() || !editing.password.trim()) return;
    saveUtente(editing);
    close();
  };

  const rc = (r) => r === "admin"
    ? { bg: "#dbeafe", text: "#1d4ed8" }
    : { bg: "#f0fdf4", text: "#166534" };

  const TH = ({ children }) => (
    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
      color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em",
      borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", background: "#f8fafc" }}>
      {children}
    </th>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Gestione Utenti</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{users.length} utente/i configurati</div>
        </div>
        <button onClick={openNew} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
          borderRadius: 9, background: "#1e40af", color: "#fff", border: "none",
          fontSize: 13, fontWeight: 700, cursor: "pointer"
        }}>
          <Icon name="plus" size={14} /> Nuovo Utente
        </button>
      </div>

      {/* Tabella */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <TH>Nome</TH>
              <TH>Username</TH>
              <TH>Ruolo</TH>
              <TH>Sezioni accessibili</TH>
              <TH>Stato</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const isMe = u.id === currentUser?.id;
              const c = rc(u.ruolo);
              return (
                <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                      {u.nome || "—"}
                      {isMe && <span style={{ fontSize: 10, color: "#3b82f6", background: "#eff6ff", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>tu</span>}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#475569" }}>{u.username}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <Badge label={u.ruolo === "admin" ? "Admin" : "Operatore"} color={c.text} bg={c.bg} />
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    {u.ruolo === "admin"
                      ? <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Tutte le sezioni</span>
                      : <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(u.sezioni || []).map(sid => {
                            const s = SEZIONI.find(x => x.id === sid);
                            return s ? <Badge key={sid} label={s.label} color="#475569" bg="#f1f5f9" /> : null;
                          })}
                          {(!u.sezioni || u.sezioni.length === 0) && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Nessuna sezione</span>}
                        </div>
                    }
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <Badge
                      label={u.attivo !== false ? "Attivo" : "Disattivato"}
                      color={u.attivo !== false ? "#166534" : "#991b1b"}
                      bg={u.attivo !== false ? "#dcfce7" : "#fee2e2"}
                    />
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{ padding: "5px 12px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Modifica
                      </button>
                      {u.id !== "admin" && (
                        <button onClick={() => { if (window.confirm(`Eliminare utente "${u.username}"?`)) deleteUtente(u.id); }}
                          style={{ padding: "5px 9px", borderRadius: 7, background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, cursor: "pointer" }}>
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            {/* Modal header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg,#1e40af08,#3b82f604)" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                {editing.id ? "Modifica Utente" : "Nuovo Utente"}
              </div>
              <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <Icon name="x" size={18} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
              {/* Nome + Username */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <MField label="Nome Completo" value={editing.nome} onChange={v => setEditing(e => ({ ...e, nome: v }))} placeholder="Mario Rossi" />
                <MField label="Username" value={editing.username} onChange={v => setEditing(e => ({ ...e, username: v }))} placeholder="mario.rossi" disabled={editing.id === "admin"} />
              </div>

              {/* Password */}
              <div style={{ position: "relative" }}>
                <MField label="Password" value={editing.password} onChange={v => setEditing(e => ({ ...e, password: v }))} type={showPwd ? "text" : "password"} placeholder="••••••••" />
                <button onClick={() => setShowPwd(s => !s)} style={{ position: "absolute", right: 10, bottom: 9, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 11, color: "#64748b", cursor: "pointer", padding: "2px 8px" }}>
                  {showPwd ? "Nascondi" : "Mostra"}
                </button>
              </div>

              {/* Ruolo */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Ruolo</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["admin", "Amministratore", "#dbeafe", "#1d4ed8"], ["operatore", "Operatore", "#dcfce7", "#166534"]].map(([val, lbl, bg, color]) => (
                    <button key={val}
                      onClick={() => editing.id !== "admin" && setEditing(e => ({ ...e, ruolo: val }))}
                      disabled={editing.id === "admin"}
                      style={{
                        padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: editing.id === "admin" ? "not-allowed" : "pointer",
                        border: `2px solid ${editing.ruolo === val ? color : "#e2e8f0"}`,
                        background: editing.ruolo === val ? bg : "#fff",
                        color: editing.ruolo === val ? color : "#94a3b8",
                        opacity: editing.id === "admin" ? 0.6 : 1
                      }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Sezioni */}
              {editing.ruolo === "operatore" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                    Sezioni accessibili
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    {SEZIONI.map(s => {
                      const on = (editing.sezioni || []).includes(s.id);
                      return (
                        <button key={s.id} onClick={() => toggleSezione(s.id)} style={{
                          display: "flex", alignItems: "center", gap: 9,
                          padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                          border: `1.5px solid ${on ? "#3b82f6" : "#e2e8f0"}`,
                          background: on ? "#eff6ff" : "#f8fafc",
                          fontWeight: 600, fontSize: 12,
                          color: on ? "#1d4ed8" : "#64748b", transition: "all 0.15s"
                        }}>
                          <div style={{
                            width: 17, height: 17, borderRadius: 4,
                            background: on ? "#3b82f6" : "#fff",
                            border: `1.5px solid ${on ? "#3b82f6" : "#d1d5db"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                          }}>
                            {on && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle attivo */}
              {editing.id && editing.id !== "admin" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
                  <button onClick={() => setEditing(e => ({ ...e, attivo: !e.attivo }))} style={{
                    width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: editing.attivo !== false ? "#22c55e" : "#d1d5db",
                    position: "relative", transition: "background 0.2s", flexShrink: 0
                  }}>
                    <div style={{
                      position: "absolute", top: 3,
                      left: editing.attivo !== false ? 21 : 3,
                      width: 18, height: 18, borderRadius: 9,
                      background: "#fff", transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Account {editing.attivo !== false ? "attivo" : "disattivato"}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={close} style={{ padding: "9px 18px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Annulla
              </button>
              <button onClick={handleSave} disabled={!editing.username || !editing.password}
                style={{ padding: "9px 22px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (!editing.username || !editing.password) ? 0.5 : 1 }}>
                Salva Utente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MField = ({ label, value, onChange, type = "text", placeholder, disabled }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{
        padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
        fontSize: 13, background: disabled ? "#f8fafc" : "#fff", color: "#0f172a",
        outline: "none", width: "100%", boxSizing: "border-box"
      }}
      onFocus={e => !disabled && (e.target.style.borderColor = "#3b82f6")}
      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
    />
  </div>
);
