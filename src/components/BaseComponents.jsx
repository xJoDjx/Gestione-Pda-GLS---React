import { Icon } from "./Icons";

// ─── BADGE ────────────────────────────────────────────────────────────────────
export const Badge = ({ label, color = "#6b7280", bg = "#f3f4f6", border }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px",
    borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg,
    border: `1px solid ${border || bg}`, letterSpacing: "0.04em", textTransform: "uppercase"
  }}>{label}</span>
);

// ─── INPUT ────────────────────────────────────────────────────────────────────
export const Input = ({ label, value, onChange, type = "number", placeholder, step = "0.01", small, disabled }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && (
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
    )}
    <input
      type={type} value={value}
      onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
      placeholder={placeholder || (type === "number" ? "0,00" : "")}
      step={step} disabled={disabled}
      style={{
        border: "1px solid #e2e8f0", borderRadius: 8,
        padding: small ? "6px 10px" : "8px 12px",
        fontSize: small ? 12 : 13,
        fontFamily: type === "number" ? "'DM Mono', monospace" : "inherit",
        background: disabled ? "#f8fafc" : "#fff",
        color: "#0f172a", outline: "none", width: "100%", boxSizing: "border-box"
      }}
      onFocus={e => !disabled && (e.target.style.borderColor = "#3b82f6")}
      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
    />
  </div>
);

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
export const SectionCard = ({ title, icon, children, accent = "#3b82f6", compact }) => (
  <div style={{
    background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
    overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
  }}>
    <div style={{
      padding: compact ? "10px 16px" : "12px 18px",
      borderBottom: "1px solid #f1f5f9",
      display: "flex", alignItems: "center", gap: 8,
      background: `linear-gradient(135deg, ${accent}08, ${accent}04)`
    }}>
      <div style={{ color: accent }}><Icon name={icon} size={16} /></div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</span>
    </div>
    <div style={{ padding: compact ? "12px 16px" : "16px 18px" }}>{children}</div>
  </div>
);

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = "primary", size = "md", icon, disabled, style: extraStyle }) => {
  const variants = {
    primary: { background: "#1e40af", color: "#fff", border: "none" },
    success: { background: "#15803d", color: "#fff", border: "none" },
    danger: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
    ghost: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    dashed: { background: "#f8fafc", color: "#475569", border: "1px dashed #cbd5e1" },
  };
  const sizes = {
    sm: { padding: "5px 10px", fontSize: 11 },
    md: { padding: "8px 16px", fontSize: 13 },
    lg: { padding: "11px 22px", fontSize: 14 },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        borderRadius: 8, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all 0.15s",
        ...variants[variant], ...sizes[size], ...extraStyle
      }}>
      {icon && <Icon name={icon} size={parseInt(sizes[size].fontSize) - 1} />}
      {children}
    </button>
  );
};

// ─── TABS ─────────────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {tabs.map(([key, label]) => (
      <button key={key} onClick={() => onChange(key)}
        style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          cursor: "pointer", fontSize: 12, fontWeight: 700,
          background: active === key ? "#1e40af" : "#f1f5f9",
          color: active === key ? "#fff" : "#475569",
          transition: "all 0.15s"
        }}>
        {label}
      </button>
    ))}
  </div>
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon, color = "#3b82f6", bg = "#eff6ff", alert }) => (
  <div style={{
    background: alert ? "#fff7ed" : "#fff", borderRadius: 14,
    padding: "16px 20px", border: `1px solid ${alert ? "#fed7aa" : "#e2e8f0"}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <div style={{ background: bg, color, borderRadius: 8, padding: 6 }}>
        <Icon name={icon} size={14} />
      </div>
    </div>
    <span style={{ fontSize: 22, fontWeight: 700, color: alert ? "#dc2626" : "#0f172a", fontFamily: "'DM Mono', monospace", display: "block", marginTop: 4 }}>
      {value}
    </span>
    {sub && <span style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</span>}
  </div>
);

// ─── DOCUMENT UPLOAD (embedded base64) ───────────────────────────────────────
export const DocUpload = ({ label, doc, onUpload, onRemove, accent = "#3b82f6" }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload({ name: file.name, data: ev.target.result, type: file.type });
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</label>
      {doc ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 7, border: "1px solid #86efac" }}>
          <Icon name="note" size={14} />
          <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
          <button onClick={() => window.open(doc.data)} style={{ fontSize: 11, color: "#1d4ed8", background: "none", border: "none", cursor: "pointer" }}>Apri</button>
          <button onClick={onRemove} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 11 }}>✕</button>
        </div>
      ) : (
        <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#f8fafc", borderRadius: 7, border: "1px dashed #cbd5e1", cursor: "pointer", fontSize: 12, color: "#64748b" }}>
          <Icon name="plus" size={13} /> Allega documento
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFile} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );
};
