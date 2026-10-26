"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { absoluteDeviationMs, formatMilliseconds, formatSeconds, type AttemptView } from "@/lib/challenge";
import { clearLocalAttempts, deleteLocalPlayer, getLocalLeaderboard } from "@/lib/local-attempts";

type BoardData = { configured: boolean; qualified: AttemptView[]; notQualified: AttemptView[] };

function deviationLabel(row: AttemptView) {
  return `${formatMilliseconds(absoluteDeviationMs(row))} ms avvik`;
}

function Rows({ rows, qualified, localPreview, onDelete }: {
  rows: AttemptView[];
  qualified: boolean;
  localPreview: boolean;
  onDelete: (playerId: string, nickname: string) => void;
}) {
  return (
    <ol className="leader-table">
      {rows.map((row, index) => (
        <li className={`leader-row ${qualified ? "leader-winner" : ""} ${index < 3 && qualified ? `leader-top-${index + 1}` : ""}`} key={row.player_id}>
          <span className="leader-rank" aria-label={`Plass ${row.placement ?? index + 1}`}>{String(row.placement ?? index + 1).padStart(2, "0")}</span>
          <span className="leader-name">{row.nickname}<span className="leader-sub">{row.attempt_count ?? 0} {(row.attempt_count ?? 0) === 1 ? "forsøk" : "forsøk"}</span></span>
          <span className="leader-time">{formatSeconds(row.elapsed_ms)} s<span className="leader-sub">{deviationLabel(row)}</span></span>
          <span className={`leader-status ${qualified ? "qualified" : "not-qualified"}`}>{qualified ? "Kvalifisert" : "Ikke kvalifisert"}</span>
          {localPreview && <button className="leader-delete" type="button" onClick={() => onDelete(row.player_id, row.nickname)} aria-label={`Slett testdeltaker ${row.nickname}`} title="Slett testdeltaker">×</button>}
        </li>
      ))}
    </ol>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState<BoardData>({ configured: true, qualified: [], notQualified: [] });
  const [loadError, setLoadError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestInFlightRef = useRef(false);

  const removeLocalParticipant = useCallback((playerId: string, nickname: string) => {
    if (data.configured) return;
    const confirmed = window.confirm(`Slette «${nickname}» og alle lokale testforsøk fra denne nettleseren? Dette påvirker ikke permanente serverdata.`);
    if (!confirmed) return;
    if (deleteLocalPlayer(playerId) === 0) return;
    setData(getLocalLeaderboard());
  }, [data.configured]);

  const resetLocalLeaderboard = useCallback(() => {
    if (data.configured) return;
    const participantCount = data.qualified.length + data.notQualified.length;
    if (!participantCount) return;
    const confirmed = window.confirm("Nullstille topplista og slette alle lokalt lagrede testresultater fra denne nettleseren? Dette gjelder alle deltakere og forsøk og kan ikke angres.");
    if (!confirmed) return;
    clearLocalAttempts();
    setData(getLocalLeaderboard());
  }, [data]);

  const refresh = useCallback(async () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Leaderboard unavailable");
      const value = (await response.json()) as BoardData;
      setData(value.configured ? value : getLocalLeaderboard());
      setLoadError(false);
    } catch {
      setData(getLocalLeaderboard());
      setLoadError(false);
    } finally {
      requestInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        setIsOpen(false);
      }
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
    const interval = window.setInterval(refresh, 5_000);
    window.addEventListener("leaderboard:refresh", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("leaderboard:refresh", refresh);
    };
  }, [isOpen, refresh]);

  return (
    <>
      <button className="leaderboard-trigger" type="button" onClick={() => setIsOpen(true)} aria-haspopup="dialog">
        <span className="leaderboard-trigger-icon" aria-hidden="true">↗</span>
        <span><strong>TOPPLISTE</strong><small>Se dagens resultater</small></span>
      </button>
      <dialog
        className="leaderboard-dialog"
        ref={dialogRef}
        aria-labelledby="leaderboard-title"
        onClose={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}
      >
        <div className="board-card">
          <header className="board-heading">
            <div>
              <p className="eyebrow">Dagens utfordring</p>
              <h2 className="board-title" id="leaderboard-title">Topplisten</h2>
              <p className="board-intro">
                {data.qualified.length + data.notQualified.length} {data.qualified.length + data.notQualified.length === 1 ? "deltaker vises" : "deltakere vises"} (maks 100), hver med sitt beste forsøk.
              </p>
            </div>
            <div className="board-header-actions">
              <span className="live-dot">Live</span>
              <button className="dialog-close" type="button" onClick={() => setIsOpen(false)} aria-label="Lukk topplisten">×</button>
            </div>
          </header>

          {loadError ? <div className="empty-note">Topplisten kunne ikke lastes akkurat nå.</div> : (
            <>
              <section className="leader-section" aria-labelledby="qualified-title">
                <h3 className="leader-section-title" id="qualified-title"><span>Godkjente treff</span><span>{data.qualified.length}</span></h3>
                {data.qualified.length ? <Rows rows={data.qualified} qualified localPreview={!data.configured} onDelete={removeLocalParticipant} /> : (
                  <div className="empty-note winner-empty">
                    {data.notQualified.length ? "Ingen godkjente treff ennå. Her er de nærmeste resultatene." : "Ingen resultater ennå. Start utfordringen for å komme på listen."}
                  </div>
                )}
              </section>
              {data.notQualified.length > 0 && (
                <section className="leader-section" aria-labelledby="not-qualified-title">
                  <h3 className="leader-section-title near" id="not-qualified-title"><span>Nærmest målet · ikke kvalifisert</span><span>{data.notQualified.length}</span></h3>
                  <Rows rows={data.notQualified} qualified={false} localPreview={!data.configured} onDelete={removeLocalParticipant} />
                </section>
              )}
            </>
          )}
          <footer className="board-footer">
            Godkjent treff: mellom 9,900 og 10,100 sekunder. Jo nærmere 10,000 sekunder, desto bedre resultat.
            {!data.configured && <>
              <br />Lokal testvisning: forsøkene vises bare i denne nettleseren og lagres ikke permanent. Du kan slette testdeltakere med ×. Koble til Supabase for en felles toppliste.
              <button className="leader-reset" type="button" onClick={resetLocalLeaderboard}>Nullstill hele testlista</button>
            </>}
          </footer>
        </div>
      </dialog>
    </>
  );
}
