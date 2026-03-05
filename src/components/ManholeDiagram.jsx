import { useState } from "react";

const CX = 260, CY = 260;
const MH_OUTER = 46, MH_INNER = 30;
const PIPE_LEN = 100, PIPE_R = 12;
const SLOT_ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];

const TIP_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"
];

const TYPE_CFG = {
  E: { label: "ENTRADA", color: "var(--blue)", arrow: "in" },
  S: { label: "SALIDA", color: "var(--orange)", arrow: "out" },
  SUM: { label: "SUMIDERO", color: "var(--green)", arrow: "in" },
};

const MATERIALS = ["—", "CONCRETO", "PVC CORRUGADO", "PVC LISO", "PLÁSTICO",
  "ASBESTO CEMENTO", "MAMPOSTERIA", "GRES", "GRP", "METAL", "OTRO"];
const ESTADOS = ["—", "LIMPIO", "INUNDADO", "SEDIMENTADO", "COLMATADO", "CON BASURAS", "OTRO"];

function deg2rad(d) { return (d * Math.PI) / 180; }
const emptyPipe = () => ({
  tipo: "", deHasta: "", diametro: "", unit: "mm",
  material: "", estado: "", emboquillado: "", cotaClave: "", pendiente: "",
});

function PipeTube({ angle, pipe, selected, tipColor, onClick }) {
  const r = deg2rad(angle);
  const perp = r + Math.PI / 2;
  const sx = CX + Math.cos(r) * MH_OUTER;
  const sy = CY + Math.sin(r) * MH_OUTER;
  const ex = CX + Math.cos(r) * (MH_OUTER + PIPE_LEN);
  const ey = CY + Math.sin(r) * (MH_OUTER + PIPE_LEN);
  const px = Math.cos(perp) * PIPE_R;
  const py = Math.sin(perp) * PIPE_R;
  const capRy = Math.max(3, PIPE_R * (0.28 + 0.38 * Math.abs(Math.sin(r))));

  const has = !!pipe.tipo;
  const tc = has ? TYPE_CFG[pipe.tipo].color : null;

  const bodyFill = has ? tc + "15" : selected ? tipColor + "18" : "var(--bg3)";
  const topEdge = has ? tc : selected ? tipColor : "var(--border2)";
  const botEdge = has ? tc + "44" : "var(--border)";
  const capStroke = has ? tc : tipColor;

  // Arrow logic: centered on the pipe
  const midDist = MH_OUTER + (PIPE_LEN / 2);
  const mx = CX + Math.cos(r) * midDist;
  const my = CY + Math.sin(r) * midDist;

  const arw = has ? TYPE_CFG[pipe.tipo].arrow : null;
  const arAngle = arw === "in" ? angle + 180 : angle;
  const arRad = deg2rad(arAngle);
  const aLen = 10, aW = 6;

  // Triangle points relative to midpoint
  const tx = mx + Math.cos(arRad) * (aLen / 2), ty = my + Math.sin(arRad) * (aLen / 2);
  const b1x = mx - Math.cos(arRad) * (aLen / 2) + Math.cos(arRad - Math.PI / 2) * (aW / 2);
  const b1y = my - Math.sin(arRad) * (aLen / 2) + Math.sin(arRad - Math.PI / 2) * (aW / 2);
  const b2x = mx - Math.cos(arRad) * (aLen / 2) + Math.cos(arRad + Math.PI / 2) * (aW / 2);
  const b2y = my - Math.sin(arRad) * (aLen / 2) + Math.sin(arRad + Math.PI / 2) * (aW / 2);

  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      <polygon
        points={`${sx + px},${sy + py} ${ex + px},${ey + py} ${ex - px},${ey - py} ${sx - px},${sy - py}`}
        fill={bodyFill} stroke="none"
      />
      <line x1={sx + px} y1={sy + py} x2={ex + px} y2={ey + py} stroke={topEdge} strokeWidth="1.5" />
      <line x1={sx - px} y1={sy - py} x2={ex - px} y2={ey - py} stroke={botEdge} strokeWidth="1.5" />

      {/* End Caps */}
      <ellipse cx={ex} cy={ey} rx={PIPE_R} ry={capRy}
        fill={has ? tc + "18" : "var(--bg2)"} stroke={capStroke} strokeWidth="2" />
      <ellipse cx={ex} cy={ey} rx={PIPE_R - 4} ry={Math.max(1.5, capRy - 3)}
        fill={has ? tc : "var(--bg3)"}
        stroke={has ? "none" : tipColor + "55"} strokeWidth="1" />

      {/* deHasta Label inside cap */}
      {has && pipe.deHasta && (
        <text x={ex} y={ey + 2} textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="900" className="font-mono">
          {pipe.deHasta}
        </text>
      )}

      {!has && (
        <ellipse cx={ex} cy={ey} rx={PIPE_R + 7} ry={capRy + 5}
          fill="none" stroke={tipColor} strokeWidth="1.2"
          strokeDasharray="4 4" opacity="0.5">
          <animate attributeName="stroke-dashoffset" from="0" to="-24"
            dur="1.4s" repeatCount="indefinite" />
        </ellipse>
      )}

      {selected && (
        <ellipse cx={ex} cy={ey} rx={PIPE_R + 11} ry={capRy + 8}
          fill={has ? tc + "11" : tipColor + "11"}
          stroke={has ? tc : tipColor} strokeWidth="2" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1s" repeatCount="indefinite" />
        </ellipse>
      )}

      {has && (
        <polygon points={`${tx},${ty} ${b1x},${b1y} ${b2x},${b2y}`}
          fill={tc} opacity="1" />
      )}
    </g>
  );
}

function ManholeBody({ pozoId }) {
  return (
    <g>
      <circle cx={CX + 2} cy={CY + 3} r={MH_OUTER + 8} fill="rgba(0,0,0,0.3)" />
      <circle cx={CX} cy={CY} r={MH_OUTER + 8}
        fill="url(#rimGrad)" stroke="var(--border2)" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={MH_OUTER}
        fill="url(#chamberGrad)" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={MH_INNER + 10}
        fill="none" stroke="var(--bg)" strokeWidth="8" opacity="0.5" />
      <circle cx={CX} cy={CY} r={MH_INNER}
        fill="url(#floorGrad)" stroke="var(--border2)" strokeWidth="1.5" />
      {[0, 60, 120, 180, 240, 300].map(a => (
        <line key={a}
          x1={CX + Math.cos(deg2rad(a)) * 8} y1={CY + Math.sin(deg2rad(a)) * 8}
          x2={CX + Math.cos(deg2rad(a)) * MH_INNER * .85} y2={CY + Math.sin(deg2rad(a)) * MH_INNER * .85}
          stroke="var(--text3)" strokeWidth="1" opacity="0.4" />
      ))}
      <circle cx={CX} cy={CY} r={7} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={CX} y={CY - 4} textAnchor="middle"
        fill="var(--blue)" fontSize={pozoId && pozoId.length > 5 ? 7 : 9}
        fontWeight="800" className="font-mono" letterSpacing="1">
        {pozoId || "—"}
      </text>
      <text x={CX} y={CY + 6} textAnchor="middle"
        fill="var(--text3)" fontSize="5.5" className="font-mono" letterSpacing="1">
        POZO
      </text>
    </g>
  );
}

function PipeForm({ slotIndex, pipe, pozoId, onSave, onCancel, onDelete }) {
  const [d, setD] = useState({ ...pipe });
  const f = (k, v) => setD(p => ({ ...p, [k]: v }));
  const tc = d.tipo ? TYPE_CFG[d.tipo].color : "var(--blue)";
  const cotaBatea = d.cotaClave && d.diametro
    ? (parseFloat(d.cotaClave) + parseFloat(d.unit === "mm" ? d.diametro / 1000 : d.diametro * 0.0254)).toFixed(3)
    : "—";

  return (
    <div className="card" style={{ borderColor: tc, borderWidth: '1.5px', maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "var(--bg3)", border: `2px solid ${tc}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tc} strokeWidth="2.5">
            <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: tc, letterSpacing: 1 }}>
            RAMAL #{slotIndex + 1}
          </div>
          <div className="font-mono" style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 2 }}>
            POZO: {pozoId || "—"}
          </div>
        </div>
        <button onClick={onCancel} style={{
          marginLeft: "auto", background: "none", border: "none",
          color: "var(--text3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0,
        }}>✕</button>
      </div>

      <div className="field">
        <label>Tipo de ramal</label>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(TYPE_CFG).map(([k, v]) => (
            <button key={k} onClick={() => f("tipo", k)} style={{
              flex: 1, padding: "9px 4px", borderRadius: 7, cursor: "pointer",
              fontSize: 10, fontWeight: 800, letterSpacing: 1,
              background: d.tipo === k ? tc : "var(--bg3)",
              color: d.tipo === k ? "var(--bg)" : tc,
              border: `1.5px solid ${tc}`,
              transition: "all .15s",
            }} className="font-mono">{k}<br />
              <span style={{ fontSize: 7, fontWeight: 400, opacity: .8 }}>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-sep" />

      <div className="field">
        <label>{d.tipo === "E" ? "Viene desde (pozo)" : "Va hacia (pozo)"}</label>
        <input type="text" placeholder="Ej: M-0075" className="font-mono"
          style={{ color: tc }}
          value={d.deHasta} onChange={e => f("deHasta", e.target.value.toUpperCase())} />
      </div>

      <div className="field">
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Diámetro (Ø)</span>
          <span style={{ display: "flex", gap: 4 }}>
            {["mm", "in"].map(u => (
              <button key={u} onClick={() => f("unit", u)} style={{
                background: d.unit === u ? tc : "var(--bg4)",
                color: d.unit === u ? "var(--bg)" : "var(--text3)",
                border: `1px solid ${d.unit === u ? tc : "var(--border)"}`,
                borderRadius: 3, padding: "1px 6px", fontSize: 8,
                cursor: "pointer",
              }} className="font-mono">{u}</button>
            ))}
          </span>
        </label>
        <input className="font-mono" type="number" placeholder="0"
          value={d.diametro} onChange={e => f("diametro", e.target.value)} />
      </div>

      <div className="field">
        <label>Material</label>
        <select value={d.material} onChange={e => f("material", e.target.value)}>
          {MATERIALS.map(m => <option key={m} value={m === "—" ? "" : m}>{m}</option>)}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Estado Tub.</label>
          <select value={d.estado} onChange={e => f("estado", e.target.value)}>
            {ESTADOS.map(s => <option key={s} value={s === "—" ? "" : s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Emboquillado</label>
          <select value={d.emboquillado} onChange={e => f("emboquillado", e.target.value)}>
            <option value="">—</option>
            <option>SI</option><option>NO</option><option>DESC</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Cota Clave Z (m)</label>
          <input className="font-mono" style={{ color: "var(--green)", fontWeight: 700 }}
            type="number" step="0.001" placeholder="0.000"
            value={d.cotaClave} onChange={e => f("cotaClave", e.target.value)} />
        </div>
        <div className="field">
          <label>Cota Batea Z+Ø</label>
          <input className="font-mono" style={{ color: "var(--blue)", opacity: .75, cursor: "not-allowed" }}
            readOnly value={cotaBatea} />
        </div>
      </div>

      <div className="field">
        <label>Pendiente (%)</label>
        <input className="font-mono" style={{ color: "var(--orange)", textAlign: "center", fontWeight: 700 }}
          type="number" step="0.1" placeholder="0.0"
          value={d.pendiente} onChange={e => f("pendiente", e.target.value)} />
      </div>

      <div className="btn-row">
        {pipe.tipo && (
          <button onClick={onDelete} className="btn-danger btn-sm" style={{ padding: '0 12px' }}>🗑</button>
        )}
        <button onClick={onCancel} className="btn btn-ghost btn-sm">CANCELAR</button>
        <button onClick={() => d.tipo && onSave(d)}
          disabled={!d.tipo}
          className="btn btn-blue btn-sm"
          style={{ flex: 2, background: d.tipo ? tc : 'var(--bg4)', color: d.tipo ? 'var(--bg)' : 'var(--text3)' }}>
          ✓ GUARDAR
        </button>
      </div>
      {!d.tipo && (
        <div style={{ textAlign: "center", fontSize: 9, color: "var(--text3)", marginTop: 8 }} className="font-mono">
          Selecciona un tipo de ramal para continuar
        </div>
      )}
    </div>
  );
}

export default function ManholeDiagram() {
  const [pozoId, setPozoId] = useState("M076");
  const [pipes, setPipes] = useState(
    Object.fromEntries(SLOT_ANGLES.map(a => [a, emptyPipe()]))
  );
  const [activeSlot, setActiveSlot] = useState(null);

  function handleSave(data) {
    setPipes(p => ({ ...p, [activeSlot]: data }));
    setActiveSlot(null);
  }
  function handleDelete() {
    setPipes(p => ({ ...p, [activeSlot]: emptyPipe() }));
    setActiveSlot(null);
  }

  // Build E1,E2,S1,SUM1... labels in order
  const typeCount = {};
  const slotLabels = {};
  SLOT_ANGLES.forEach(a => {
    const t = pipes[a].tipo;
    if (!t) return;
    typeCount[t] = (typeCount[t] || 0) + 1;
    slotLabels[a] = `${t}${typeCount[t]}`;
  });

  const filledSlots = SLOT_ANGLES.filter(a => pipes[a].tipo);

  return (
    <div style={{
      background: "var(--bg)", minHeight: "100vh",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "20px 16px 40px",
    }} className="font-mono">

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 8, letterSpacing: 5, color: "var(--text3)", marginBottom: 4 }}>
          ESQUEMA DE ENTRADAS Y SALIDAS
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 2 }}>POZO:</span>
          <input value={pozoId} onChange={e => setPozoId(e.target.value.toUpperCase())}
            className="font-mono"
            style={{
              background: "var(--bg3)", border: "1.5px solid var(--border)", color: "var(--blue)",
              padding: "3px 10px", borderRadius: 6, fontSize: 14, fontWeight: 800,
              textAlign: "center", width: 100,
              letterSpacing: 2, outline: "none",
            }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 16, justifyContent: "center", fontSize: 8.5, color: "var(--text3)" }}>
          <span style={{ color: "var(--blue)" }}>▶ E ENTRADA</span>
          <span style={{ color: "var(--orange)" }}>▶ S SALIDA</span>
          <span style={{ color: "var(--green)" }}>▶ SUM SUMIDERO</span>
        </div>
      </div>

      {activeSlot === null ? (
        <div style={{ width: "100%", maxWidth: 560 }}>
          <svg viewBox="70 70 380 380" style={{ width: "100%", height: "auto", overflow: "visible" }}>
            <defs>
              <radialGradient id="rimGrad" cx="38%" cy="35%">
                <stop offset="0%" stopColor="var(--bg2)" />
                <stop offset="100%" stopColor="var(--border)" />
              </radialGradient>
              <radialGradient id="chamberGrad" cx="40%" cy="35%">
                <stop offset="0%" stopColor="var(--bg4)" />
                <stop offset="100%" stopColor="var(--bg3)" />
              </radialGradient>
              <radialGradient id="floorGrad" cx="45%" cy="40%">
                <stop offset="0%" stopColor="var(--bg2)" />
                <stop offset="100%" stopColor="var(--bg)" />
              </radialGradient>
              <filter id="dropshadow">
                <feDropShadow dx="1" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
              </filter>
            </defs>

            {SLOT_ANGLES.map((angle, i) => (
              <PipeTube key={angle} angle={angle}
                pipe={pipes[angle]} selected={activeSlot === angle}
                tipColor={TIP_COLORS[i]} onClick={() => setActiveSlot(angle)} />
            ))}
            <g filter="url(#dropshadow)">
              <ManholeBody pozoId={pozoId} />
            </g>
          </svg>

          <div style={{ textAlign: "center", fontSize: 8, color: "var(--text3)", marginTop: 2, letterSpacing: 2 }}>
            TOCA CUALQUIER RAMAL PARA ASIGNAR INFORMACIÓN
          </div>

          {filledSlots.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 8, color: "var(--text3)", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                RAMALES INGRESADOS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {filledSlots.map(a => {
                  const tc = TYPE_CFG[pipes[a].tipo].color;
                  return (
                    <button key={a} onClick={() => setActiveSlot(a)} style={{
                      background: "var(--bg3)", border: `1.5px solid ${tc}`,
                      color: tc, padding: "5px 12px", borderRadius: 6,
                      cursor: "pointer", fontSize: 10,
                      fontWeight: 700, letterSpacing: 1,
                    }} className="font-mono">
                      {slotLabels[a]}{pipes[a].deHasta ? ` · ${pipes[a].deHasta}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      ) : (
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div className="card" style={{
            padding: "8px 12px", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width={56} height={56} viewBox={`${CX - 80} ${CY - 80} 160 160`}
              style={{ flex: "0 0 56px", borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--border)" }}>
              {SLOT_ANGLES.map((angle, i) => {
                const r = deg2rad(angle);
                const sx = CX + Math.cos(r) * MH_OUTER, sy = CY + Math.sin(r) * MH_OUTER;
                const ex = CX + Math.cos(r) * (MH_OUTER + 46), ey = CY + Math.sin(r) * (MH_OUTER + 46);
                const isA = angle === activeSlot;
                const p = pipes[angle];
                const c = p.tipo ? TYPE_CFG[p.tipo].color : isA ? TIP_COLORS[i] : "var(--border2)";
                return <line key={angle} x1={sx} y1={sy} x2={ex} y2={ey}
                  stroke={c} strokeWidth={isA ? 3 : 1.5} strokeLinecap="round" />;
              })}
              <circle cx={CX} cy={CY} r={MH_OUTER} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1.5" />
              <circle cx={CX} cy={CY} r={MH_INNER} fill="var(--bg3)" stroke="var(--border)" strokeWidth="1" />
              <text x={CX} y={CY + 3} textAnchor="middle"
                className="font-mono" fill="var(--blue)" fontSize="9" fontWeight="800">{pozoId}</text>
            </svg>
            <div>
              <div style={{ fontSize: 10, color: "var(--text)", fontWeight: 700, letterSpacing: 1 }}>
                {pipes[activeSlot].tipo
                  ? `${slotLabels[activeSlot]} · ${TYPE_CFG[pipes[activeSlot].tipo].label}`
                  : "Nuevo ramal"}
              </div>
              <div style={{ fontSize: 8.5, color: "var(--text3)", marginTop: 2 }}>
                Ramal #{SLOT_ANGLES.indexOf(activeSlot) + 1} de 8
              </div>
            </div>
            <button onClick={() => setActiveSlot(null)} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>← VOLVER</button>
          </div>

          <PipeForm
            slotIndex={SLOT_ANGLES.indexOf(activeSlot)}
            pipe={pipes[activeSlot]}
            pozoId={pozoId}
            onSave={handleSave}
            onCancel={() => setActiveSlot(null)}
            onDelete={handleDelete}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 8, color: "var(--text3)", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
              IR A OTRO RAMAL
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {SLOT_ANGLES.map((a, i) => {
                const p = pipes[a];
                const tc = p.tipo ? TYPE_CFG[p.tipo].color : TIP_COLORS[i];
                const isA = a === activeSlot;
                return (
                  <button key={a} onClick={() => setActiveSlot(a)} style={{
                    background: isA ? tc + "18" : "var(--bg3)",
                    border: `1.5px solid ${isA ? tc : p.tipo ? tc + "88" : "var(--border)"}`,
                    color: p.tipo ? tc : isA ? tc : "var(--text3)",
                    padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    fontSize: 9,
                    fontWeight: p.tipo || isA ? 700 : 400, letterSpacing: 1, minWidth: 52,
                  }} className="font-mono">
                    {p.tipo ? slotLabels[a] : `#${i + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
