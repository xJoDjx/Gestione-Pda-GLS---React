// ─────────────────────────────────────────────────────────────────────────────
// ModalContrattoNoleggio.jsx
//
// Modal che appare quando l'utente clicca "Crea Contratto" nel dettaglio mezzo.
// Permette di scegliere giorno / mese / anno e genera il DOCX.
//
// USO in MezzoDetail (all'interno di MezziView.jsx):
//
//   import { ModalContrattoNoleggio } from "./ModalContrattoNoleggio";
//
//   // Stato nel componente padre:
//   const [showContratto, setShowContratto] = useState(false);
//
//   // Bottone nell'header:
//   <button onClick={() => setShowContratto(true)}>📄 Crea Contratto</button>
//
//   // Modal:
//   {showContratto && (
//     <ModalContrattoNoleggio
//       mezzo={form}
//       padroncini={padroncini}
//       onClose={() => setShowContratto(false)}
//     />
//   )}
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { generaContrattoNoleggio } from "./generaContrattoNoleggio";
import { C, TY, BR, SP } from "./theme";

const MESI = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
];

const oggi = new Date();

export const ModalContrattoNoleggio = ({ mezzo, padroncini = [], onClose }) => {
  const [giorno, setGiorno] = useState(String(oggi.getDate()).padStart(2, "0"));
  const [mese,   setMese]   = useState(MESI[oggi.getMonth()]);
  const [anno,   setAnno]   = useState(String(oggi.getFullYear()));
  const [loading, setLoading] = useState(false);

  // Trova il padroncino associato al mezzo (se c'è)
  const padroncino = padroncini.find(p => p.id === mezzo.padroncino_id) || {};

  // Dati anteprima
  const rata   = parseFloat(mezzo.rata_noleggio || 0);
  const limKm  = parseInt(mezzo.limitazioni_km || 3000);
  const targa  = (mezzo.targa || "").toUpperCase();

  const inputSt = {
    padding: "7px 10px", borderRadius: BR.lg, border: `1px solid ${C.border}`,
    fontSize: TY.md, background: C.white, outline: "none", width: "100%", boxSizing: "border-box",
  };
  const labelSt = {
    fontSize: TY.xs, fontWeight: TY.black, color: C.fgMuted,
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "block", marginBottom: 4,
  };

  const handleGenera = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 50)); // tick per aggiornare UI
      generaContrattoNoleggio({ mezzo, padroncino, giorno, mese, anno });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 24,
    }}>
      <div style={{
        background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)", width: "100%", maxWidth: 520,
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bgPage }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: TY.black, color: C.fg }}>📄 Crea Contratto di Noleggio</div>
            <div style={{ fontSize: TY.md, color: C.fgMuted, marginTop: 2 }}>
              {targa} — {[mezzo.marca, mezzo.modello].filter(Boolean).join(" ")}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: "5px 9px", borderRadius: BR.md, border: `1px solid ${C.border}`, background: C.white, color: C.fgMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        {/* Corpo */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Anteprima dati mezzo */}
          <div style={{ padding: "12px 14px", background: C.primaryBg, borderRadius: BR.lg, border: `1px solid ${C.primaryBorder}`, fontSize: TY.md }}>
            <div style={{ fontWeight: TY.bold, color: C.primarySoft, marginBottom: 6, fontSize: TY.xs, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Dati inseriti nel contratto
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {[
                ["Targa", targa],
                ["Tipo", mezzo.alimentazione || "—"],
                ["Rata noleggio", `€ ${rata.toLocaleString("it-IT", { minimumFractionDigits: 2 })} + IVA`],
                ["KM inclusi / mese", `${limKm.toLocaleString("it-IT")}`],
                ["Noleggiante", padroncino.nome || <span style={{ color: C.fgSubtle, fontStyle: "italic" }}>nessun padroncino associato</span>],
                ["Rappresentante", padroncino.rappresentante || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: C.fgMuted, fontSize: TY.xs }}>{k}: </span>
                  <span style={{ fontWeight: TY.semi, color: C.fg }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selezione data */}
          <div>
            <div style={{ fontSize: TY.xs, fontWeight: TY.black, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Data del contratto
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px", gap: 10 }}>
              <div>
                <label style={labelSt}>Giorno</label>
                <input
                  type="number" min="1" max="31" value={giorno}
                  onChange={e => setGiorno(String(e.target.value).padStart(2, "0"))}
                  style={inputSt}
                />
              </div>
              <div>
                <label style={labelSt}>Mese</label>
                <select value={mese} onChange={e => setMese(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                  {MESI.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Anno</label>
                <input
                  type="number" min="2020" max="2099" value={anno}
                  onChange={e => setAnno(e.target.value)}
                  style={inputSt}
                />
              </div>
            </div>
          </div>

          {/* Avviso se nessun padroncino */}
          {!padroncino.nome && (
            <div style={{ padding: "10px 14px", background: C.warningBg, borderRadius: BR.lg, border: `1px solid ${C.warningBorder}`, fontSize: TY.md, color: C.warning }}>
              ⚠️ Nessun padroncino assegnato a questo mezzo. Il contratto verrà generato con i campi del noleggiante vuoti.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: SP.gapSm, background: C.bgPage }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: BR.lg, border: `1px solid ${C.border}`, background: C.white, color: C.fgMuted, fontSize: TY.md, cursor: "pointer" }}>
            Annulla
          </button>
          <button
            onClick={handleGenera}
            disabled={loading}
            style={{
              padding: "9px 20px", borderRadius: BR.xl,
              background: loading ? C.border : C.primary,
              color: "#fff", border: "none",
              fontSize: TY.base_, fontWeight: TY.bold,
              cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {loading ? "⏳ Generazione..." : "📥 Genera & Scarica DOCX"}
          </button>
        </div>
      </div>
    </div>
  );
};
