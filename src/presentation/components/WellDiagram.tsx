import React from 'react';
import { Pipe } from '../../types/catastro';

interface WellDiagramProps {
    diam: number;
    altura: number;
    pipes?: Pipe[];
}

const WellDiagram: React.FC<WellDiagramProps> = ({ diam, altura, pipes = [] }) => {
    const cx = 90;
    const bodyW = Math.min(140, Math.max(60, diam * 80));
    const bodyH = Math.min(160, Math.max(60, altura * 35));
    const coneH = 30;
    const canoH = 15;
    const tapW = 30;
    const tapH = 10;

    const bodyTop = 50;
    const bodyBot = bodyTop + bodyH;
    const canoBot = bodyBot + canoH;
    const coneTop = bodyTop - coneH;
    const tapTop = coneTop - tapH - 2;

    return (
        <svg id="wellSvg" viewBox={`0 0 180 ${canoBot + 20}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1C2230" />
                    <stop offset="50%" stopColor="#2A3347" />
                    <stop offset="100%" stopColor="#1C2230" />
                </linearGradient>
            </defs>
            <text x="4" y={tapTop + 8} fontFamily="DM Mono" fontSize="8" fill="#5B6B8A">TAPA</text>

            {/* Cone / Reducer matching body width */}
            <path d={`M${cx - tapW / 2},${coneTop} L${cx - bodyW / 2},${bodyTop} L${cx + bodyW / 2},${bodyTop} L${cx + tapW / 2},${coneTop} Z`} fill="url(#bodyGrad)" stroke="#334060" />

            {/* Body */}
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill="url(#bodyGrad)" stroke="#334060" />

            {/* Highlighted Diameter Line starting from top (Cone/Tapa level) */}
            <line x1={cx - tapW / 2} y1={coneTop + 4} x2={cx + tapW / 2} y2={coneTop + 4} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" />
            <text x={cx} y={coneTop + 2} textAnchor="middle" fontSize="6" fill="#3b82f6" fontWeight="bold">Ø {diam}m</text>

            {/* Visual Pipes */}
            {pipes.map((p, i) => {
                const isEntrada = p.es === 'ENTRADA';
                const xPos = isEntrada ? cx - bodyW / 2 - 10 : cx + bodyW / 2 - 10;
                const yPos = bodyBot - 10 - (i * 8);
                return (
                    <rect
                        key={p.id}
                        x={xPos}
                        y={yPos}
                        width="20"
                        height="6"
                        fill={isEntrada ? "var(--blue)" : "var(--orange)"}
                        opacity="0.8"
                        rx="1"
                    />
                );
            })}

            <text x={cx} y={bodyTop + bodyH + 18} fontFamily="DM Mono" fontSize="8" fill="#00C896" textAnchor="middle">Ø{diam.toFixed(2)}m</text>
            <text x={cx - bodyW / 2 - 10} y={bodyTop + bodyH / 2} fontFamily="DM Mono" fontSize="8" fill="#0084FF" textAnchor="end">{altura.toFixed(2)}m</text>
        </svg>
    );
};

export default WellDiagram;
