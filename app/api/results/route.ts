const states: Record<string, string> = { ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão", mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba", pr: "Paraná", pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro", rn: "Rio Grande do Norte", rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima", sc: "Santa Catarina", sp: "São Paulo", se: "Sergipe", to: "Tocantins" };
const governorStates = ["ac", "am", "df", "es", "rn", "to"];
const base = "https://resultados.tse.jus.br/oficial/ele2026";
type Raw = { dt?: string; ht?: string; dg?: string; hg?: string; carg?: Array<{ agr?: Array<{ par?: Array<{ sg?: string; cand?: Array<{ n?: string; nmu?: string; vap?: string }> }> }> }>; s?: { ts?: string; st?: string }; e?: { te?: string; c?: string }; v?: { vv?: string; vb?: string; tvn?: string } };
const count = (value?: string) => Number(value || 0);

function parse(raw: Raw, uf: string, office: "president" | "governor", sourceUrl: string) {
  const candidates = (raw.carg?.[0]?.agr || []).flatMap(agr => (agr.par || []).flatMap(par => (par.cand || []).map(cand => ({ number: cand.n || "", name: cand.nmu || "", party: par.sg || "", votes: count(cand.vap), percent: 0 }))));
  const valid = count(raw.v?.vv) || candidates.reduce((sum, c) => sum + c.votes, 0);
  for (const candidate of candidates) candidate.percent = valid ? candidate.votes / valid * 100 : 0;
  candidates.sort((a, b) => b.votes - a.votes);
  const date = (raw.dt || raw.dg || "").split("/").reverse().join("-");
  return { uf: uf.toUpperCase(), state: uf === "br" ? "Brasil" : states[uf], office, candidates, sections: count(raw.s?.ts), counted: count(raw.s?.st), electorate: count(raw.e?.te), turnout: count(raw.e?.c), valid, blank: count(raw.v?.vb), nullVotes: count(raw.v?.tvn), updatedAt: `${date}T${raw.ht || raw.hg || "00:00:00"}-03:00`, sourceUrl };
}

async function get(uf: string, office: "president" | "governor") {
  const election = office === "president" ? "6258" : "6260";
  const cargo = office === "president" ? "0001" : "0003";
  const url = `${base}/${election}/dados/${uf}/${uf}-c${cargo}-e00${election}-u.json`;
  const response = await fetch(url, { next: { revalidate: 25 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`TSE ${response.status}: ${uf}`);
  return parse(await response.json() as Raw, uf, office, url);
}

export async function GET() {
  const requests = [get("br", "president"), ...Object.keys(states).map(uf => get(uf, "president")), ...governorStates.map(uf => get(uf, "governor"))];
  const settled = await Promise.allSettled(requests);
  const successes = settled.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof get>>> => result.status === "fulfilled").map(result => result.value);
  const national = successes.find(result => result.uf === "BR") || null;
  return Response.json({ national, president: successes.filter(result => result.office === "president" && result.uf !== "BR"), governor: successes.filter(result => result.office === "governor"), fetchedAt: new Date().toISOString(), errors: settled.length - successes.length }, { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=30" } });
}
