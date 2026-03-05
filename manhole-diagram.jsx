import { useState } from "react";

const CX = 260, CY = 260;
const MH_OUTER = 46, MH_INNER = 30;
const PIPE_LEN = 100, PIPE_R = 12;
const SLOT_ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];

const TIP_COLORS = [
  "#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"
];

const TYPE_CFG = {
  E:   { label: "ENTRADA",  color: "#0ea5e9", arrow: "in"  },
  S:   { label: "SALIDA",   color: "#f97316", arrow: "out" },
  SUM: { label: "SUMIDERO", color: "#22c55e", arrow: "out" },
};

const MATERIALS = ["—","CONCRETO","PVC CORRUGADO","PVC LISO","PLÁSTICO",
  "ASBESTO CEMENTO","MAMPOSTERIA","GRES","GRP","METAL","OTRO"];
const ESTADOS = ["—","LIMPIO","INUNDADO","SEDIMENTADO","COLMATADO","CON BASURAS","OTRO"];

function deg2rad(d) { return (d * Math.PI) / 180; }
const emptyPipe = () => ({
  tipo:"", deHasta:"", diametro:"", unit:"mm",
  material:"", estado:"", emboquillado:"", cotaClave:"", pendiente:"",
});

function PipeTube({ angle, pipe, selected, tipColor, onClick }) {
  const r    = deg2rad(angle);
  const perp = r + Math.PI / 2;
  const sx   = CX + Math.cos(r) * MH_OUTER;
  const sy   = CY + Math.sin(r) * MH_OUTER;
  const ex   = CX + Math.cos(r) * (MH_OUTER + PIPE_LEN);
  const ey   = CY + Math.sin(r) * (MH_OUTER + PIPE_LEN);
  const px   = Math.cos(perp) * PIPE_R;
  const py   = Math.sin(perp) * PIPE_R;
  const capRy = Math.max(3, PIPE_R * (0.28 + 0.38 * Math.abs(Math.sin(r))));

  const has  = !!pipe.tipo;
  const tc   = has ? TYPE_CFG[pipe.tipo].color : null;

  const bodyFill  = has ? tc + "22" : selected ? tipColor + "18" : "#f1f5f9";
  const topEdge   = has ? tc        : selected ? tipColor       : "#cbd5e1";
  const botEdge   = has ? tc+"66"   : "#e2e8f0";
  const capStroke = has ? tc        : tipColor;

  const arw     = has ? TYPE_CFG[pipe.tipo].arrow : null;
  const arAngle = arw === "in" ? angle + 180 : angle;
  const arRad   = deg2rad(arAngle);
  const arBase  = MH_OUTER + PIPE_LEN + 14;
  const ax = CX + Math.cos(r) * arBase, ay = CY + Math.sin(r) * arBase;
  const aLen = 12, aW = 5;
  const axT = ax + Math.cos(arRad)*aLen, ayT = ay + Math.sin(arRad)*aLen;
  const arLx = ax + Math.cos(arRad-Math.PI/2)*aW, arLy = ay + Math.sin(arRad-Math.PI/2)*aW;
  const arRx = ax + Math.cos(arRad+Math.PI/2)*aW, arRy = ay + Math.sin(arRad+Math.PI/2)*aW;

  const lDist = MH_OUTER + PIPE_LEN + (has ? 32 : 24);
  const lx = CX + Math.cos(r) * lDist;
  const ly = CY + Math.sin(r) * lDist;

  return (
    <g style={{ cursor:"pointer" }} onClick={onClick}>
      <polygon
        points={`${sx+px},${sy+py} ${ex+px},${ey+py} ${ex-px},${ey-py} ${sx-px},${sy-py}`}
        fill={bodyFill} stroke="none"
      />
      <line x1={sx+px} y1={sy+py} x2={ex+px} y2={ey+py} stroke={topEdge} strokeWidth="1.5" />
      <line x1={sx-px} y1={sy-py} x2={ex-px} y2={ey-py} stroke={botEdge} strokeWidth="1.5" />

      <ellipse cx={ex} cy={ey} rx={PIPE_R} ry={capRy}
        fill={has ? tc+"18" : "#f8fafc"} stroke={capStroke} strokeWidth="2" />
      <ellipse cx={ex} cy={ey} rx={PIPE_R-4} ry={Math.max(1.5,capRy-3)}
        fill={has ? "#fff" : "#f8fafc"}
        stroke={has ? tc+"44" : tipColor+"55"} strokeWidth="1" />

      {!has && (
        <ellipse cx={ex} cy={ey} rx={PIPE_R+7} ry={capRy+5}
          fill="none" stroke={tipColor} strokeWidth="1.2"
          strokeDasharray="4 4" opacity="0.5">
          <animate attributeName="stroke-dashoffset" from="0" to="-24"
            dur="1.4s" repeatCount="indefinite" />
        </ellipse>
      )}

      {selected && (
        <ellipse cx={ex} cy={ey} rx={PIPE_R+11} ry={capRy+8}
          fill={has ? tc+"11" : tipColor+"11"}
          stroke={has ? tc : tipColor} strokeWidth="2" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1s" repeatCount="indefinite" />
        </ellipse>
      )}

      {has && (
        <>
          <polygon points={`${axT},${ayT} ${arLx},${arLy} ${arRx},${arRy}`}
            fill={tc} opacity="0.9" />
          <rect x={lx-16} y={ly-9} width={32} height={13} rx={3}
            fill={tc} opacity={0.9} />
          <text x={lx} y={ly+1} textAnchor="middle"
            fill="#fff" fontSize="8" fontWeight="900"
            fontFamily="'Courier New',monospace">
            {pipe.tipo}
          </text>
          {pipe.deHasta && (
            <text x={lx} y={ly+14} textAnchor="middle"
              fill={tc} fontSize="7.5" fontFamily="'Courier New',monospace">
              {pipe.deHasta}
            </text>
          )}
          {pipe.diametro && (
            <text x={lx} y={ly+23} textAnchor="middle"
              fill="#94a3b8" fontSize="7" fontFamily="'Courier New',monospace">
              Ø{pipe.diametro}{pipe.unit}
            </text>
          )}
        </>
      )}
    </g>
  );
}

function ManholeBody({ pozoId }) {
  return (
    <g>
      <circle cx={CX+2} cy={CY+3} r={MH_OUTER+8} fill="#00000012" />
      <circle cx={CX} cy={CY} r={MH_OUTER+8}
        fill="url(#rimGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={MH_OUTER}
        fill="url(#chamberGrad)" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={MH_INNER+10}
        fill="none" stroke="#e2e8f0" strokeWidth="8" opacity="0.5" />
      <circle cx={CX} cy={CY} r={MH_INNER}
        fill="url(#floorGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
      {[0,60,120,180,240,300].map(a=>(
        <line key={a}
          x1={CX+Math.cos(deg2rad(a))*8} y1={CY+Math.sin(deg2rad(a))*8}
          x2={CX+Math.cos(deg2rad(a))*MH_INNER*.85} y2={CY+Math.sin(deg2rad(a))*MH_INNER*.85}
          stroke="#d1d5db" strokeWidth="1" opacity="0.6" />
      ))}
      <circle cx={CX} cy={CY} r={7} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      <text x={CX} y={CY-4} textAnchor="middle"
        fill="#1e40af" fontSize={pozoId && pozoId.length > 5 ? 7 : 9}
        fontWeight="800" fontFamily="'Courier New',monospace" letterSpacing="1">
        {pozoId || "—"}
      </text>
      <text x={CX} y={CY+6} textAnchor="middle"
        fill="#94a3b8" fontSize="5.5" fontFamily="'Courier New',monospace" letterSpacing="1">
        POZO
      </text>
    </g>
  );
}

function PipeForm({ slotIndex, pipe, pozoId, onSave, onCancel, onDelete }) {
  const [d, setD] = useState({ ...pipe });
  const f = (k,v) => setD(p=>({...p,[k]:v}));
  const tc = d.tipo ? TYPE_CFG[d.tipo].color : "#3b82f6";
  const cotaBatea = d.cotaClave && d.diametro
    ? (parseFloat(d.cotaClave) + parseFloat(d.unit==="mm" ? d.diametro/1000 : d.diametro*0.0254)).toFixed(3)
    : "—";

  const inp = {
    width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0",
    color:"#1e293b", padding:"8px 10px", borderRadius:6,
    fontFamily:"'Courier New',monospace", fontSize:13,
    boxSizing:"border-box", outline:"none",
  };
  const lbl = {
    display:"block", fontSize:9, letterSpacing:1.5, color:"#64748b",
    textTransform:"uppercase", marginBottom:4, fontFamily:"'Courier New',monospace",
  };
  const row = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 };
  const col = { marginBottom:10 };

  return (
    <div style={{
      background:"#ffffff", border:`1.5px solid ${tc}55`,
      borderRadius:14, padding:"18px 18px 20px",
      boxShadow:`0 4px 32px ${tc}18, 0 2px 8px #0000000f`,
      width:"100%", maxWidth:400,
    }}>
      <style>{`.fi:focus { border-color:${tc} !important; box-shadow:0 0 0 3px ${tc}22 !important; }`}</style>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{
          width:38, height:38, borderRadius:"50%",
          background:tc+"18", border:`2px solid ${tc}`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tc} strokeWidth="2.5">
            <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:tc, letterSpacing:1, fontFamily:"Courier New" }}>
            RAMAL #{slotIndex+1}
          </div>
          <div style={{ fontSize:9, color:"#94a3b8", letterSpacing:2, fontFamily:"Courier New" }}>
            POZO: {pozoId||"—"}
          </div>
        </div>
        <button onClick={onCancel} style={{
          marginLeft:"auto", background:"none", border:"none",
          color:"#94a3b8", cursor:"pointer", fontSize:18, lineHeight:1, padding:0,
        }}>✕</button>
      </div>

      <div style={{ marginBottom:14 }}>
        <span style={lbl}>Tipo de ramal</span>
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(TYPE_CFG).map(([k,v])=>(
            <button key={k} onClick={()=>f("tipo",k)} style={{
              flex:1, padding:"9px 4px", borderRadius:7, cursor:"pointer",
              fontFamily:"Courier New", fontSize:10, fontWeight:800, letterSpacing:1,
              background: d.tipo===k ? v.color : "#f8fafc",
              color: d.tipo===k ? "#fff" : v.color,
              border:`1.5px solid ${d.tipo===k ? v.color : v.color+"55"}`,
              transition:"all .15s",
            }}>{k}<br/>
              <span style={{ fontSize:7, fontWeight:400, opacity:.8 }}>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ height:1, background:"#f1f5f9", marginBottom:14 }} />

      <div style={col}>
        <label style={lbl}>{d.tipo==="E" ? "Viene desde (pozo)" : "Va hacia (pozo)"}</label>
        <input className="fi" style={inp} placeholder="Ej: M-0075"
          value={d.deHasta} onChange={e=>f("deHasta",e.target.value)} />
      </div>

      <div style={col}>
        <label style={{ ...lbl, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Diámetro (Ø)</span>
          <span style={{ display:"flex", gap:4 }}>
            {["mm","in"].map(u=>(
              <button key={u} onClick={()=>f("unit",u)} style={{
                background: d.unit===u ? tc : "#f1f5f9",
                color: d.unit===u ? "#fff" : "#64748b",
                border:`1px solid ${d.unit===u ? tc : "#e2e8f0"}`,
                borderRadius:3, padding:"1px 6px", fontSize:8,
                cursor:"pointer", fontFamily:"Courier New",
              }}>{u}</button>
            ))}
          </span>
        </label>
        <input className="fi" style={inp} type="number" placeholder="0"
          value={d.diametro} onChange={e=>f("diametro",e.target.value)} />
      </div>

      <div style={col}>
        <label style={lbl}>Material</label>
        <select className="fi" style={inp} value={d.material} onChange={e=>f("material",e.target.value)}>
          {MATERIALS.map(m=><option key={m} value={m==="—"?"":m}>{m}</option>)}
        </select>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>Estado Tub.</label>
          <select className="fi" style={inp} value={d.estado} onChange={e=>f("estado",e.target.value)}>
            {ESTADOS.map(s=><option key={s} value={s==="—"?"":s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Emboquillado</label>
          <select className="fi" style={inp} value={d.emboquillado} onChange={e=>f("emboquillado",e.target.value)}>
            <option value="">—</option>
            <option>SI</option><option>NO</option><option>DESC</option>
          </select>
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>Cota Clave Z (m)</label>
          <input className="fi" style={{ ...inp, color:"#16a34a", fontWeight:600 }}
            type="number" step="0.001" placeholder="0.000"
            value={d.cotaClave} onChange={e=>f("cotaClave",e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Cota Batea Z+Ø</label>
          <input style={{ ...inp, color:"#2563eb", opacity:.75, cursor:"not-allowed", background:"#f1f5f9" }}
            readOnly value={cotaBatea} />
        </div>
      </div>

      <div style={{ ...col, marginBottom:18 }}>
        <label style={lbl}>Pendiente (%)</label>
        <input className="fi" style={{ ...inp, color:"#d97706", textAlign:"center", fontWeight:600 }}
          type="number" step="0.1" placeholder="0.0"
          value={d.pendiente} onChange={e=>f("pendiente",e.target.value)} />
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {pipe.tipo && (
          <button onClick={onDelete} style={{
            padding:"10px 14px", background:"#fff5f5", border:"1px solid #fecaca",
            color:"#dc2626", borderRadius:7, cursor:"pointer", fontSize:13,
          }}>🗑</button>
        )}
        <button onClick={onCancel} style={{
          flex:1, padding:"10px", background:"#f8fafc",
          border:"1px solid #e2e8f0", color:"#64748b",
          borderRadius:7, cursor:"pointer", fontSize:11, fontFamily:"Courier New",
        }}>CANCELAR</button>
        <button onClick={()=>d.tipo && onSave(d)} style={{
          flex:2, padding:"10px",
          background: d.tipo ? tc : "#e2e8f0", border:"none",
          color: d.tipo ? "#fff" : "#94a3b8",
          borderRadius:7, cursor: d.tipo ? "pointer" : "not-allowed",
          fontSize:12, fontWeight:800, fontFamily:"Courier New", letterSpacing:1,
          boxShadow: d.tipo ? `0 4px 14px ${tc}44` : "none", transition:"all .2s",
        }}>✓ GUARDAR</button>
      </div>
      {!d.tipo && (
        <div style={{ textAlign:"center", fontSize:9, color:"#94a3b8", marginTop:8, fontFamily:"Courier New" }}>
          Selecciona un tipo de ramal para continuar
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [pozoId, setPozoId] = useState("M076");
  const [pipes, setPipes]   = useState(
    Object.fromEntries(SLOT_ANGLES.map(a=>[a, emptyPipe()]))
  );
  const [activeSlot, setActiveSlot] = useState(null);

  function handleSave(data) {
    setPipes(p=>({...p,[activeSlot]:data}));
    setActiveSlot(null);
  }
  function handleDelete() {
    setPipes(p=>({...p,[activeSlot]:emptyPipe()}));
    setActiveSlot(null);
  }

  // Build E1,E2,S1,SUM1... labels in order
  const typeCount = {};
  const slotLabels = {};
  SLOT_ANGLES.forEach(a=>{
    const t = pipes[a].tipo;
    if (!t) return;
    typeCount[t] = (typeCount[t]||0)+1;
    slotLabels[a] = `${t}${typeCount[t]}`;
  });

  const filledSlots = SLOT_ANGLES.filter(a=>pipes[a].tipo);

  return (
    <div style={{
      background:"#ffffff", minHeight:"100vh",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"20px 16px 40px", fontFamily:"'Courier New',monospace",
    }}>

      <div style={{ textAlign:"center", marginBottom:14 }}>
        <div style={{ fontSize:8, letterSpacing:5, color:"#94a3b8", marginBottom:4 }}>
          ESQUEMA DE ENTRADAS Y SALIDAS
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ fontSize:9, color:"#94a3b8", letterSpacing:2 }}>POZO:</span>
          <input value={pozoId} onChange={e=>setPozoId(e.target.value)}
            style={{
              background:"#f8fafc", border:"1.5px solid #e2e8f0", color:"#1e40af",
              padding:"3px 10px", borderRadius:6, fontSize:14, fontWeight:800,
              fontFamily:"Courier New", textAlign:"center", width:100,
              letterSpacing:2, outline:"none",
            }} />
        </div>
        <div style={{ marginTop:8, display:"flex", gap:16, justifyContent:"center", fontSize:8.5, color:"#94a3b8" }}>
          <span style={{ color:"#0ea5e9" }}>▶ E ENTRADA</span>
          <span style={{ color:"#f97316" }}>▶ S SALIDA</span>
          <span style={{ color:"#22c55e" }}>▶ SUM SUMIDERO</span>
        </div>
      </div>

      {activeSlot === null ? (
        <div style={{ width:"100%", maxWidth:560 }}>
          <svg viewBox="70 70 380 380" style={{ width:"100%", height:"auto", overflow:"visible" }}>
            <defs>
              <radialGradient id="rimGrad" cx="38%" cy="35%">
                <stop offset="0%" stopColor="#e2e8f0"/>
                <stop offset="100%" stopColor="#cbd5e1"/>
              </radialGradient>
              <radialGradient id="chamberGrad" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#f1f5f9"/>
                <stop offset="100%" stopColor="#e2e8f0"/>
              </radialGradient>
              <radialGradient id="floorGrad" cx="45%" cy="40%">
                <stop offset="0%" stopColor="#ffffff"/>
                <stop offset="100%" stopColor="#f1f5f9"/>
              </radialGradient>
              <filter id="dropshadow">
                <feDropShadow dx="1" dy="2" stdDeviation="4" floodColor="#00000018"/>
              </filter>
            </defs>

            {SLOT_ANGLES.map((angle,i)=>(
              <PipeTube key={angle} angle={angle}
                pipe={pipes[angle]} selected={activeSlot===angle}
                tipColor={TIP_COLORS[i]} onClick={()=>setActiveSlot(angle)} />
            ))}
            <g filter="url(#dropshadow)">
              <ManholeBody pozoId={pozoId} />
            </g>
          </svg>

          <div style={{ textAlign:"center", fontSize:8, color:"#cbd5e1", marginTop:2, letterSpacing:2 }}>
            TOCA CUALQUIER RAMAL PARA ASIGNAR INFORMACIÓN
          </div>

          {filledSlots.length > 0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:8, color:"#cbd5e1", letterSpacing:2, marginBottom:6, textAlign:"center" }}>
                RAMALES INGRESADOS
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
                {filledSlots.map(a=>{
                  const tc = TYPE_CFG[pipes[a].tipo].color;
                  return (
                    <button key={a} onClick={()=>setActiveSlot(a)} style={{
                      background:"#f8fafc", border:`1.5px solid ${tc}`,
                      color:tc, padding:"5px 12px", borderRadius:6,
                      cursor:"pointer", fontSize:10, fontFamily:"Courier New",
                      fontWeight:700, letterSpacing:1,
                    }}>
                      {slotLabels[a]}{pipes[a].deHasta ? ` · ${pipes[a].deHasta}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      ) : (
        <div style={{ width:"100%", maxWidth:420 }}>
          <div style={{
            background:"#f8fafc", border:"1px solid #e2e8f0",
            borderRadius:10, padding:"8px 12px", marginBottom:12,
            display:"flex", alignItems:"center", gap:10,
          }}>
            <svg width={56} height={56} viewBox={`${CX-80} ${CY-80} 160 160`}
              style={{ flex:"0 0 56px", borderRadius:6, background:"#fff", border:"1px solid #f1f5f9" }}>
              {SLOT_ANGLES.map((angle,i)=>{
                const r  = deg2rad(angle);
                const sx = CX+Math.cos(r)*MH_OUTER, sy = CY+Math.sin(r)*MH_OUTER;
                const ex = CX+Math.cos(r)*(MH_OUTER+46), ey = CY+Math.sin(r)*(MH_OUTER+46);
                const isA = angle===activeSlot;
                const p  = pipes[angle];
                const c  = p.tipo ? TYPE_CFG[p.tipo].color : isA ? TIP_COLORS[i] : "#e2e8f0";
                return <line key={angle} x1={sx} y1={sy} x2={ex} y2={ey}
                  stroke={c} strokeWidth={isA?3:1.5} strokeLinecap="round" />;
              })}
              <circle cx={CX} cy={CY} r={MH_OUTER} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
              <circle cx={CX} cy={CY} r={MH_INNER} fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
              <text x={CX} y={CY+3} textAnchor="middle"
                fill="#1e40af" fontSize="9" fontFamily="Courier New" fontWeight="800">{pozoId}</text>
            </svg>
            <div>
              <div style={{ fontSize:10, color:"#1e293b", fontWeight:700, letterSpacing:1 }}>
                {pipes[activeSlot].tipo
                  ? `${slotLabels[activeSlot]} · ${TYPE_CFG[pipes[activeSlot].tipo].label}`
                  : "Nuevo ramal"}
              </div>
              <div style={{ fontSize:8.5, color:"#94a3b8", marginTop:2 }}>
                Ramal #{SLOT_ANGLES.indexOf(activeSlot)+1} de 8
              </div>
            </div>
            <button onClick={()=>setActiveSlot(null)} style={{
              marginLeft:"auto", background:"#f1f5f9", border:"1px solid #e2e8f0",
              color:"#64748b", padding:"5px 10px", borderRadius:6,
              cursor:"pointer", fontSize:9, letterSpacing:1, fontFamily:"Courier New",
            }}>← VOLVER</button>
          </div>

          <PipeForm
            slotIndex={SLOT_ANGLES.indexOf(activeSlot)}
            pipe={pipes[activeSlot]}
            pozoId={pozoId}
            onSave={handleSave}
            onCancel={()=>setActiveSlot(null)}
            onDelete={handleDelete}
          />

          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:8, color:"#cbd5e1", letterSpacing:2, marginBottom:6, textAlign:"center" }}>
              IR A OTRO RAMAL
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {SLOT_ANGLES.map((a,i)=>{
                const p   = pipes[a];
                const tc  = p.tipo ? TYPE_CFG[p.tipo].color : TIP_COLORS[i];
                const isA = a===activeSlot;
                return (
                  <button key={a} onClick={()=>setActiveSlot(a)} style={{
                    background: isA ? tc+"18" : "#f8fafc",
                    border:`1.5px solid ${isA ? tc : p.tipo ? tc+"88" : "#e2e8f0"}`,
                    color: p.tipo ? tc : isA ? tc : "#94a3b8",
                    padding:"5px 10px", borderRadius:6, cursor:"pointer",
                    fontSize:9, fontFamily:"Courier New",
                    fontWeight: p.tipo||isA ? 700 : 400, letterSpacing:1, minWidth:52,
                  }}>
                    {p.tipo ? slotLabels[a] : `#${i+1}`}
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
