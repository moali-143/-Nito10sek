"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { formatMilliseconds, formatSeconds, type AttemptView } from "@/lib/challenge";

type AdminRow = AttemptView & { placement: number; attempt_count: number; first_qualified_at: string | null };
type HistoryAttempt = { id: string; elapsed_ms: string; deviation_ms: string; absolute_deviation_ms: string; is_qualified: boolean; is_exact_hit: boolean; created_at: string };
type Overview = { stats: { players: number; attempts: number; qualifiedAttempts: number; qualifiedPlayers: number }; results: AdminRow[] };

function signedDeviation(value: number | string) {
  const number = Number(value);
  return `${number > 0 ? "+" : number < 0 ? "−" : ""}${formatMilliseconds(Math.abs(number))} ms`;
}

export default function AdminDashboard({ email }: { email: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("rank");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [histories, setHistories] = useState<Record<string, HistoryAttempt[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: search, filter, sort });
      const response = await fetch(`/api/admin/overview?${params}`, { cache: "no-store" });
      if (response.status === 403) throw new Error("Tilgangen ble avvist.");
      if (!response.ok) throw new Error("Administrasjonsdata kunne ikke lastes.");
      setOverview((await response.json()) as Overview);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "En feil oppstod.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, sort]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function toggleHistory(playerId: string) {
    if (expandedPlayer === playerId) {
      setExpandedPlayer(null);
      return;
    }
    setExpandedPlayer(playerId);
    if (histories[playerId]) return;
    setHistoryLoading(playerId);
    try {
      const response = await fetch(`/api/admin/players/${playerId}/attempts`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const value = (await response.json()) as { attempts: HistoryAttempt[] };
      setHistories((current) => ({ ...current, [playerId]: value.attempts }));
    } catch {
      setMessage("Forsøkshistorikken kunne ikke lastes.");
    } finally {
      setHistoryLoading(null);
    }
  }

  async function remove(kind: "attempts" | "players", id: string, nickname: string) {
    const warning = kind === "players"
      ? `Slette spilleren «${nickname}» og alle tilhørende forsøk? Dette kan ikke angres.`
      : `Slette dette forsøket for «${nickname}»? Dette kan ikke angres.`;
    if (!window.confirm(warning)) return;
    setMessage("");
    const response = await fetch(`/api/admin/${kind}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Slettingen mislyktes. Oppdater siden og prøv igjen.");
      return;
    }
    if (kind === "players") {
      setHistories((current) => { const copy = { ...current }; delete copy[id]; return copy; });
      setExpandedPlayer(null);
    } else {
      setHistories((current) => {
        const copy = { ...current };
        for (const playerId of Object.keys(copy)) delete copy[playerId];
        return copy;
      });
    }
    setMessage(kind === "players" ? "Spilleren og forsøkene er slettet." : "Forsøket er slettet.");
    await refresh();
    window.dispatchEvent(new Event("leaderboard:refresh"));
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  function searchRows(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(query.trim());
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="admin-top">
          <Link href="/" aria-label="Til spillet"><Image className="admin-logo" src="/nito-logo-primary-deep.png" alt="NITO" width={4000} height={1828} /></Link>
          <div className="admin-tools header-tools">
            <span className="admin-subtitle">{email}</span>
            <button className="admin-action secondary" onClick={logout}>Logg ut</button>
          </div>
        </header>
        <p className="eyebrow admin-section-eyebrow">Administrasjon</p>
        <h1 className="admin-title">Resultatoversikt</h1>
        <p className="admin-subtitle">Én beste rad per deltaker. Åpne historikk for å se alle forsøk.</p>

        <div className="admin-stats" aria-label="Statistikk">
          <div className="stat-card"><div className="stat-label">Registrerte deltakere</div><div className="stat-value">{overview?.stats.players ?? "—"}</div></div>
          <div className="stat-card"><div className="stat-label">Alle forsøk</div><div className="stat-value">{overview?.stats.attempts ?? "—"}</div></div>
          <div className="stat-card"><div className="stat-label">Kvalifiserte forsøk</div><div className="stat-value">{overview?.stats.qualifiedAttempts ?? "—"}</div></div>
          <div className="stat-card"><div className="stat-label">Deltakere kvalifisert</div><div className="stat-value">{overview?.stats.qualifiedPlayers ?? "—"}</div></div>
        </div>

        <div className="admin-tools">
          <form className="admin-tools admin-search-form" onSubmit={searchRows}>
            <input className="admin-input admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk på kallenavn" maxLength={24} aria-label="Søk på kallenavn" />
            <button className="admin-action" type="submit">Søk</button>
          </form>
          <select className="admin-select" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filtrer resultater">
            <option value="all">Alle deltakere</option><option value="qualified">Kvalifiserte</option><option value="not_qualified">Ikke kvalifiserte</option>
          </select>
          <select className="admin-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sorter deltakere">
            <option value="rank">Rangering</option><option value="time">Nærmest 10 sekunder</option><option value="date">Nyeste beste forsøk</option>
          </select>
          <a className="admin-action secondary" href="/api/admin/export">Last ned CSV</a>
        </div>

        {message && <p className="admin-status" role="status">{message}</p>}
        {loading ? <p className="admin-status">Laster …</p> : overview?.results.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Plass</th><th>Kallenavn</th><th>Beste tid</th><th>Signert avvik</th><th>Status</th><th>Beste forsøk</th><th>Antall</th><th>Handling</th></tr></thead>
              <tbody>
                {overview.results.map((row) => (
                  <Fragment key={row.player_id}>
                    <tr>
                      <td>{row.placement}</td>
                      <td>{row.nickname}</td>
                      <td>{formatSeconds(row.elapsed_ms)} s <small>({formatMilliseconds(row.elapsed_ms)} ms)</small></td>
                      <td>{signedDeviation(row.deviation_ms)}</td>
                      <td>{row.is_qualified ? (row.is_exact_hit ? "Eksakt 10,000" : "Kvalifisert") : "Ikke kvalifisert"}</td>
                      <td>{new Date(row.created_at).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td>{row.attempt_count}</td>
                      <td>
                        <div className="admin-tools admin-row-actions">
                          <button className="admin-action secondary" aria-expanded={expandedPlayer === row.player_id} onClick={() => void toggleHistory(row.player_id)}>{expandedPlayer === row.player_id ? "Skjul forsøk" : "Vis forsøk"}</button>
                          <button className="admin-action danger" onClick={() => void remove("attempts", row.attempt_id, row.nickname)}>Slett beste</button>
                          <button className="admin-action secondary" onClick={() => void remove("players", row.player_id, row.nickname)}>Slett spiller</button>
                        </div>
                      </td>
                    </tr>
                    {expandedPlayer === row.player_id && (
                      <tr className="history-row"><td colSpan={8}>
                        {historyLoading === row.player_id ? <p className="admin-status">Laster forsøk …</p> : histories[row.player_id]?.length ? (
                          <table className="history-table">
                            <thead><tr><th>Dato</th><th>Målt tid</th><th>Avvik</th><th>Status</th><th>Handling</th></tr></thead>
                            <tbody>{histories[row.player_id].map((attempt) => (
                              <tr key={attempt.id}>
                                <td>{new Date(attempt.created_at).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "medium" })}</td>
                                <td>{formatMilliseconds(attempt.elapsed_ms)} ms</td>
                                <td>{signedDeviation(attempt.deviation_ms)}</td>
                                <td>{attempt.is_qualified ? (attempt.is_exact_hit ? "Eksakt" : "Kvalifisert") : "Ikke kvalifisert"}</td>
                                <td><button className="admin-action danger" onClick={() => void remove("attempts", attempt.id, row.nickname)}>Slett</button></td>
                              </tr>
                            ))}</tbody>
                          </table>
                        ) : <p className="admin-status">Ingen forsøk å vise.</p>}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-status">Ingen resultater samsvarer med dette utvalget.</p>}
      </div>
    </main>
  );
}
