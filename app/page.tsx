"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ArrowUpRight, Clock3, ExternalLink, RefreshCw, Search } from "lucide-react";
import { BrazilMap } from "../components/brazil-map";

type Candidate = { number: string; name: string; party: string; votes: number; percent: number };
type Result = { uf: string; state: string; office: "president" | "governor"; candidates: Candidate[]; sections: number; counted: number; valid: number; blank: number; nullVotes: number; updatedAt: string; sourceUrl: string };
type Payload = { national: Result | null; president: Result[]; governor: Result[]; fetchedAt: string; errors: number };
type Tab = "president" | "governor";
type Sort = "name" | "counted" | "margin";
const nf = new Intl.NumberFormat("pt-BR");
const pf = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const colors: Record<string, string> = { "13": "#c82032", "22": "#2359a3" };
const candidateColor = (number: string, index: number, office: Tab) => office === "president" ? colors[number] || "#7c6b60" : ["#c82032", "#2359a3"][index] || "#7c6b60";
const fmt = (n: number) => nf.format(n);
const pct = (n: number) => `${pf.format(n)}%`;
const sectionPercent = (r: Result) => r.sections ? r.counted / r.sections * 100 : 0;
const time = (date: string) => date ? date.slice(11, 16) : "—";

function ResultBars({ result, compact = false }: { result: Result; compact?: boolean }) {
  const candidates = [...result.candidates].sort((a, b) => b.votes - a.votes);
  return <div className={compact ? "result-bars compact" : "result-bars"}>
    {candidates.map((candidate, i) => <div className="candidate-row" key={candidate.number}>
      <div className="candidate-line"><span className="candidate-name"><span className="candidate-dot" style={{ background: candidateColor(candidate.number, i, result.office) }} />{candidate.name} <span className="party">{candidate.party}</span></span><strong>{pct(candidate.percent)}</strong></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, candidate.percent))}%`, background: candidateColor(candidate.number, i, result.office) }} /></div>
      {!compact && <span className="vote-count">{fmt(candidate.votes)} votos</span>}
    </div>)}
  </div>;
}

export default function Home() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("president");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [selected, setSelected] = useState("BR");
  const [next, setNext] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/results", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível consultar o TSE agora.");
      const payload = await response.json() as Payload;
      if (!payload.national && !payload.president.length && !payload.governor.length) throw new Error("A apuração ainda não está disponível.");
      setData(payload);
      setError("");
      setNext(30);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na atualização.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    const countdown = window.setInterval(() => setNext(value => value <= 1 ? 30 : value - 1), 1_000);
    return () => { window.clearInterval(interval); window.clearInterval(countdown); };
  }, [refresh]);

  const results = tab === "president" ? data?.president || [] : data?.governor || [];
  const filtered = useMemo(() => results.filter(r => `${r.state} ${r.uf}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).sort((a, b) => {
    if (sort === "counted") return sectionPercent(b) - sectionPercent(a);
    if (sort === "margin") return Math.abs((b.candidates[0]?.percent || 0) - (b.candidates[1]?.percent || 0)) - Math.abs((a.candidates[0]?.percent || 0) - (a.candidates[1]?.percent || 0));
    return a.state.localeCompare(b.state, "pt-BR");
  }), [results, query, sort]);
  const active = selected === "BR" && tab === "president" ? data?.national : results.find(r => r.uf === selected) || null;
  const featured = active || (tab === "governor" ? results[0] : data?.national) || null;

  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><span /><span /><span /></span><span>APURAÇÃO<span className="brand-year">/ 2026</span></span></div><div className="topbar-right"><span className="source-tag">FONTE OFICIAL · TSE</span><a className="official-link" href="https://resultados.tse.jus.br/" target="_blank" rel="noreferrer">Portal do TSE <ArrowUpRight size={15} /></a></div></header>
    <section className="intro"><div className="eyebrow"><span className="live-dot" /> SEGUNDO TURNO · 25 OUT 2026</div><div className="intro-grid"><div><h1>O Brasil, <em>voto a voto.</em></h1><p>Acompanhe a totalização oficial para presidente em cada estado e para governador onde há segundo turno.</p></div><div className="live-panel"><div className="live-title"><span className="live-dot" /> APURAÇÃO EM TEMPO REAL</div><div className="live-time">{data?.national?.updatedAt ? time(data.national.updatedAt) : "--:--"}<span> horário de Brasília</span></div><div className="live-meta">{refreshing ? "Consultando o TSE..." : `Nova consulta em ${next}s`}</div></div></div></section>
    {error && <div className="alert" role="alert">{error} {data && "Os últimos dados recebidos continuam visíveis."} <button onClick={refresh}>Tentar novamente</button></div>}
    {data?.errors ? <div className="notice" role="status">Alguns arquivos estaduais não responderam à última consulta ({data.errors}). Os demais resultados continuam disponíveis.</div> : null}
    <div className="content">
      <div className="section-heading"><div><span className="section-index">01 / VISÃO GERAL</span><h2>{tab === "president" ? "Disputa presidencial" : "Governos estaduais"}</h2></div><div className="updated"><Clock3 size={15} /> Última consulta: {data ? new Date(data.fetchedAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</div></div>
      <div className="tabs" role="tablist" aria-label="Cargo"><button role="tab" aria-selected={tab === "president"} className={tab === "president" ? "active" : ""} onClick={() => { setTab("president"); setSelected("BR"); }}>Presidente <span>Brasil + 27 UFs</span></button><button role="tab" aria-selected={tab === "governor"} className={tab === "governor" ? "active" : ""} onClick={() => { setTab("governor"); setSelected(""); }}>Governador <span>Estados com 2º turno</span></button></div>
      {loading ? <div className="loading" role="status">Carregando resultados oficiais do TSE…</div> : featured ? <div className="overview"><div className="overview-main"><div className="overview-kicker"><span>{featured.uf === "BR" ? "RESULTADO NACIONAL" : featured.state.toLocaleUpperCase("pt-BR")}</span><span className="preliminary">TOTALIZAÇÃO PARCIAL</span></div><h3>{featured.uf === "BR" ? "Brasil" : featured.state}<span>{featured.office === "president" ? " · Presidente" : " · Governador"}</span></h3><ResultBars result={featured} /><div className="overview-foot"><span><strong>{pct(sectionPercent(featured))}</strong> das seções totalizadas</span><span>Boletim TSE: {time(featured.updatedAt)}</span></div></div><div className="stats"><div className="stat"><span>SEÇÕES TOTALIZADAS</span><strong>{fmt(featured.counted)} <small>/ {fmt(featured.sections)}</small></strong><div className="stat-meter"><span style={{ width: `${sectionPercent(featured)}%` }} /></div></div><div className="stat"><span>VOTOS VÁLIDOS</span><strong>{fmt(featured.valid)}</strong></div><div className="stat-grid"><div className="stat"><span>BRANCOS</span><strong>{fmt(featured.blank)}</strong></div><div className="stat"><span>NULOS</span><strong>{fmt(featured.nullVotes)}</strong></div></div><a className="source-detail" href={featured.sourceUrl} target="_blank" rel="noreferrer">Abrir arquivo oficial <ExternalLink size={14} /></a></div></div> : <div className="loading">Ainda não há resultados para este cargo.</div>}
      <div className="section-heading states-heading"><div><span className="section-index">02 / POR UNIDADE FEDERATIVA</span><h2>{tab === "president" ? "Todos os estados" : "Disputas para governador"}</h2></div><span className="state-total">{results.length} {tab === "president" ? "UFs" : "disputas"} com dados</span></div>
      {tab === "president" && <BrazilMap results={results} selected={selected} onSelect={setSelected} />}
      <div className="toolbar"><label className="search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar estado ou UF" aria-label="Buscar estado ou UF" /></label><label className="sort"><ArrowDownUp size={16} /><span>Ordenar</span><select value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="name">Nome</option><option value="counted">Mais apuradas</option><option value="margin">Maior diferença</option></select></label><button className="refresh" onClick={refresh} disabled={refreshing} aria-label="Atualizar resultados"><RefreshCw size={17} className={refreshing ? "spinning" : ""} /> Atualizar</button></div>
      <div className="state-list">{filtered.map(r => <button className={`state-item ${selected === r.uf ? "selected" : ""}`} key={r.uf} onClick={() => { setSelected(r.uf); window.scrollTo({ top: 240, behavior: "smooth" }); }}><div className="state-identity"><span className="uf">{r.uf}</span><div><strong>{r.state}</strong><small>{pct(sectionPercent(r))} das seções</small></div></div><div className="state-candidates"><ResultBars result={r} compact /></div><div className="state-trailing"><span>{time(r.updatedAt)}</span><ArrowUpRight size={16} /></div></button>)}</div>
      {!loading && !filtered.length && <div className="empty">{query ? "Nenhum estado encontrado para essa busca." : "Aguardando dados do TSE para estas disputas."}</div>}
      <footer><div><strong>Apuração 2026</strong><p>Dados oficiais publicados pelo Tribunal Superior Eleitoral. Percentuais calculados sobre votos válidos. A liderança durante a apuração não representa vitória confirmada.</p></div><div><span>ATUALIZAÇÃO AUTOMÁTICA · 30 SEGUNDOS</span><a href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados" target="_blank" rel="noreferrer">Sobre os dados <ArrowUpRight size={14} /></a></div></footer>
    </div>
  </main>;
}
