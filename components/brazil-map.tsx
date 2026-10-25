"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import geographyJson from "../data/br-ufs.json";

type Result = { uf: string; state: string; candidates: { name: string; party: string; votes: number; percent: number }[]; sections: number; counted: number; valid: number };
type Props = { results: Result[]; selected: string; onSelect: (uf: string) => void };

const geography = geographyJson as FeatureCollection;
const codes: Record<string, string> = { "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF" };
const partyColors: Record<string, string> = { PT: "#c82032", PL: "#2359a3" };
const noData = "#e9e5df";
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");

export function BrazilMap({ results, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byUf = useMemo(() => new Map(results.map(result => [result.uf, result])), [results]);
  const projection = useMemo(() => geoMercator().fitExtent([[14, 14], [590, 516]], geography), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const activeUf = hovered || (selected === "BR" ? null : selected);
  const active = activeUf ? byUf.get(activeUf) : null;
  const leader = active?.valid ? active.candidates[0] : null;
  const margin = active?.valid && active.candidates.length > 1 ? active.candidates[0].percent - active.candidates[1].percent : null;
  const counts = results.reduce((acc, result) => {
    if (result.valid > 0 && result.candidates[0]?.party === "PT") acc.PT++;
    if (result.valid > 0 && result.candidates[0]?.party === "PL") acc.PL++;
    return acc;
  }, { PT: 0, PL: 0 });

  return <section className="map-panel" aria-labelledby="map-title">
    <div className="map-visual">
      <div className="map-heading"><div><span className="section-index">MAPA ELEITORAL</span><h3 id="map-title">Quem está à frente em cada UF</h3></div><span className="map-hint">Selecione um estado</span></div>
      <svg className="brazil-map" viewBox="0 0 604 530" role="group" aria-label="Mapa do Brasil com as unidades federativas coloridas pelo partido do candidato à presidência que está à frente na apuração">
        {geography.features.map(feature => {
          const uf = codes[String(feature.properties?.codarea)];
          if (!uf) return null;
          const result = byUf.get(uf);
          const winningParty = result && result.valid > 0 ? result.candidates[0]?.party : undefined;
          const fill = winningParty ? partyColors[winningParty] || "#a38d79" : noData;
          const isActive = activeUf === uf;
          const description = result && result.valid > 0 ? `${result.state}: ${result.candidates[0]?.name} (${winningParty}) à frente com ${percent.format(result.candidates[0]?.percent || 0)}% dos votos válidos; ${percent.format(result.sections ? result.counted / result.sections * 100 : 0)}% das seções totalizadas` : `${result?.state || uf}: sem dados de votos`;
          return <path key={uf} d={path(feature) || ""} fill={fill} className={`map-state ${isActive ? "is-active" : ""}`} role="button" tabIndex={0} aria-label={description} aria-pressed={selected === uf} onMouseEnter={() => setHovered(uf)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(uf)} onBlur={() => setHovered(null)} onClick={() => onSelect(uf)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(uf); } }}><title>{description}</title></path>;
        })}
      </svg>
      <p className="map-credit">Contornos: IBGE · Malha simplificada das UFs</p>
    </div>
    <div className="map-information">
      <div className="map-info-label">LEITURA DO MAPA</div>
      {active && leader ? <div className="map-selection"><div className="map-selection-uf">{active.uf}</div><h4>{active.state}</h4><p>À frente neste momento</p><div className="map-leader"><span className="map-leader-dot" style={{ background: partyColors[leader.party] || "#a38d79" }} /><strong>{leader.name}</strong><span>{leader.party}</span></div><div className="map-selection-stat"><strong>{percent.format(leader.percent)}%</strong><span>dos votos válidos · {number.format(leader.votes)} votos</span></div>{margin !== null && <div className="map-selection-stat"><strong>{percent.format(margin)} p.p.</strong><span>de diferença para o segundo colocado</span></div>}<div className="map-selection-stat"><strong>{percent.format(active.sections ? active.counted / active.sections * 100 : 0)}%</strong><span>das seções totalizadas</span></div></div> : <div className="map-selection"><h4>Brasil por estado</h4><p>Passe o cursor ou toque em uma UF para ver os números. A cor mostra o partido do candidato à frente na apuração presidencial.</p></div>}
      <div className="map-legend"><div><span className="legend-swatch" style={{ background: partyColors.PT }} /> PT · Lula <strong>{counts.PT} UFs</strong></div><div><span className="legend-swatch" style={{ background: partyColors.PL }} /> PL · Flávio Bolsonaro <strong>{counts.PL} UFs</strong></div><div><span className="legend-swatch" style={{ background: noData }} /> Sem votos apurados</div></div>
      <p className="map-disclaimer">Liderança parcial por UF. O mapa não representa o resultado nacional nem uma projeção de vitória.</p>
    </div>
  </section>;
}
