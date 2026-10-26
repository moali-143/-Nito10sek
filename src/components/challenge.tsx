"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Leaderboard from "@/components/leaderboard";
import { formatMilliseconds, formatSeconds, isQualified, normalizeNickname, TARGET_MS } from "@/lib/challenge";
import { clearLocalAttemptsForDate, getLocalPersonalBest, saveLocalAttempt } from "@/lib/local-attempts";

type Phase = "ready" | "running" | "result";
type Preparation = "idle" | "preparing" | "ready" | "offline";
type PersonalBest = { elapsed_ms: string; deviation_ms: string; is_qualified: boolean; placement: number; attempt_count: number };
type Result = { elapsedMs: number; qualified: boolean; saved: "saving" | "saved" | "local" | "failed" };

const PLAYER_KEY = "nito10sek-player-id";
const NICKNAME_KEY = "nito10sek-nickname";
const PLAYER_LIST_KEY = "nito10sek-player-list";
const RESET_DATE_KEY = "nito10sek-local-reset-2026-10-26";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SavedParticipant = { id: string; nickname: string };

function readSavedParticipants(): SavedParticipant[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PLAYER_LIST_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): SavedParticipant[] => {
      if (typeof item !== "object" || item === null) return [];
      const profile = item as { id?: unknown; nickname?: unknown };
      const name = normalizeNickname(profile.nickname);
      return typeof profile.id === "string" && uuidPattern.test(profile.id) && name ? [{ id: profile.id, nickname: name }] : [];
    });
  } catch {
    return [];
  }
}

function saveParticipantProfile(id: string, nickname: string): SavedParticipant[] {
  const name = normalizeNickname(nickname);
  if (!name) return readSavedParticipants();
  const profiles = readSavedParticipants().filter((profile) => profile.id !== id);
  const next = [{ id, nickname: name }, ...profiles].slice(0, 1000);
  localStorage.setItem(PLAYER_LIST_KEY, JSON.stringify(next));
  return next;
}

function signedMsText(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatMilliseconds(Math.abs(value))} ms`;
}

export default function Challenge() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [nickname, setNickname] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [savedParticipants, setSavedParticipants] = useState<SavedParticipant[]>([]);
  const [preparation, setPreparation] = useState<Preparation>("idle");
  const [localPreview, setLocalPreview] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const renderStateRef = useRef({ phase, nickname, elapsedMs, result });
  renderStateRef.current = { phase, nickname, elapsedMs, result };
  const startRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const sessionRequestRef = useRef<Promise<string | null> | null>(null);
  const generationRef = useRef(0);
  const testOffsetRef = useRef(0);
  const testClockRef = useRef<number | null>(null);

  useEffect(() => {
    if (localStorage.getItem(RESET_DATE_KEY) !== "done") {
      clearLocalAttemptsForDate("2026-10-26");
      localStorage.setItem(RESET_DATE_KEY, "done");
    }
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id || !uuidPattern.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_KEY, id);
    }
    const profiles = readSavedParticipants();
    setSavedParticipants(profiles);
    setPlayerId(id);
    const savedNickname = localStorage.getItem(NICKNAME_KEY) ?? "";
    setNickname(savedNickname);
    const normalized = normalizeNickname(savedNickname);
    if (normalized) setSavedParticipants(saveParticipantProfile(id, normalized));
  }, []);

  useEffect(() => {
    if (!playerId) return;
    const name = normalizeNickname(nickname);
    if (!name) {
      setPreparation("idle");
      setPersonalBest(null);
      return;
    }
    const generation = ++generationRef.current;
    setPreparation("preparing");
    setSavedParticipants(saveParticipantProfile(playerId, name));
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/game/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, nickname: name }),
        });
        if (generation !== generationRef.current) return;
        const data = (await response.json()) as { ready?: unknown; configured?: unknown; personalBest?: PersonalBest | null };
        if (response.ok && data.ready === true) {
          setLocalPreview(false);
          setPreparation("ready");
          setPersonalBest(data.personalBest ?? null);
          setSavedParticipants(saveParticipantProfile(playerId, name));
        } else if (response.ok && data.configured === false) {
          setLocalPreview(true);
          setPreparation("offline");
          setPersonalBest(getLocalPersonalBest(playerId));
        } else {
          setLocalPreview(false);
          setPreparation("offline");
        }
      } catch {
        if (generation === generationRef.current) {
          setLocalPreview(false);
          setPreparation("offline");
        }
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [nickname, playerId]);

  const gameNow = useCallback(() => testClockRef.current ?? performance.now(), []);

  const tick = useCallback(() => {
    if (startRef.current === null) return;
    setElapsedMs(Math.max(0, gameNow() - startRef.current));
    animationRef.current = requestAnimationFrame(tick);
  }, [gameNow]);

  useEffect(() => {
    if (phase === "running") animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [phase, tick]);

  const resetResult = useCallback(() => {
    startRef.current = null;
    sessionRequestRef.current = null;
    testClockRef.current = null;
    testOffsetRef.current = 0;
    setResult(null);
    setElapsedMs(0);
    setPhase("ready");
  }, []);

  const startNextParticipant = useCallback(() => {
    const nextId = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY, nextId);
    localStorage.removeItem(NICKNAME_KEY);
    startRef.current = null;
    sessionRequestRef.current = null;
    testClockRef.current = null;
    testOffsetRef.current = 0;
    setPlayerId(nextId);
    setNickname("");
    setPreparation("idle");
    setPersonalBest(null);
    setResult(null);
    setElapsedMs(0);
    setPhase("ready");
  }, []);

  const resumeParticipant = useCallback((id: string) => {
    const profile = savedParticipants.find((item) => item.id === id);
    if (!profile || phase === "running") return;
    localStorage.setItem(PLAYER_KEY, profile.id);
    localStorage.setItem(NICKNAME_KEY, profile.nickname);
    startRef.current = null;
    sessionRequestRef.current = null;
    testClockRef.current = null;
    testOffsetRef.current = 0;
    setPlayerId(profile.id);
    setNickname(profile.nickname);
    setPreparation("preparing");
    setPersonalBest(null);
    setResult(null);
    setElapsedMs(0);
    setPhase("ready");
  }, [phase, savedParticipants]);

  const start = useCallback(() => {
    const safeNickname = normalizeNickname(nickname);
    if (!playerId || !safeNickname || phase !== "ready") return;
    localStorage.setItem(NICKNAME_KEY, safeNickname);
    setResult(null);
    setElapsedMs(0);
    testOffsetRef.current = 0;
    testClockRef.current = null;
    startRef.current = performance.now();
    sessionRequestRef.current = localPreview ? Promise.resolve(null) : fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    }).then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as { token?: unknown };
      return typeof data.token === "string" ? data.token : null;
    }).catch(() => null);
    setPhase("running");
  }, [localPreview, nickname, phase, playerId]);

  const stop = useCallback(async () => {
    if (startRef.current === null) return;
    const stoppedAt = gameNow();
    const measured = Math.max(0, stoppedAt - startRef.current);
    startRef.current = null;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    setElapsedMs(measured);
    setPhase("result");
    setResult({ elapsedMs: measured, qualified: isQualified(measured), saved: "saving" });
    if (localPreview) {
      const savedAttempt = saveLocalAttempt({ playerId, nickname, elapsedMs: measured });
      if (!savedAttempt) {
        setResult({ elapsedMs: measured, qualified: isQualified(measured), saved: "failed" });
        return;
      }
      setPersonalBest(getLocalPersonalBest(playerId));
      setResult({ elapsedMs: measured, qualified: savedAttempt.is_qualified, saved: "local" });
      window.dispatchEvent(new Event("leaderboard:refresh"));
      return;
    }
    try {
      const token = await sessionRequestRef.current;
      if (!token) throw new Error("No signed session token");
      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, elapsedMs: measured }),
      });
      if (!response.ok) throw new Error("Attempt not accepted");
      const saved = (await response.json()) as { isQualified?: unknown; personalBest?: PersonalBest };
      setResult({ elapsedMs: measured, qualified: saved.isQualified === true, saved: "saved" });
      if (saved.personalBest) setPersonalBest(saved.personalBest);
      window.dispatchEvent(new Event("leaderboard:refresh"));
    } catch {
      setResult((current) => current ? { ...current, saved: "failed" } : current);
    }
  }, [gameNow, localPreview, nickname, playerId]);

  const toggleFullscreen = useCallback(async () => {
    setFullscreenError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError("Fullskjerm kunne ikke åpnes her. Konkurransen fungerer fortsatt i vanlig visning.");
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onKeyDown = (event: KeyboardEvent) => {
      const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
      if (key === "f" && !(event.target instanceof HTMLInputElement)) void toggleFullscreen();
      if (event.key === "Enter" && phase === "ready" && event.target instanceof HTMLInputElement && event.target.id === "nickname") {
        if (normalizeNickname(nickname) && playerId && preparation !== "preparing") {
          event.preventDefault();
          start();
        }
      } else if (event.key === "Enter" && startRef.current !== null && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        void stop();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [nickname, phase, playerId, preparation, start, stop, toggleFullscreen]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const testWindow = window as Window & { advanceTime?: (ms: number) => void; render_game_to_text?: () => string };
      testWindow.advanceTime = (ms) => {
        const startAt = startRef.current;
        if (startAt === null || !Number.isFinite(ms)) return;
        testOffsetRef.current += Math.max(0, ms);
        testClockRef.current = startAt + Math.round(testOffsetRef.current * 1000) / 1000;
        setElapsedMs(Math.max(0, testClockRef.current - startAt));
      };
      testWindow.render_game_to_text = () => {
        const current = renderStateRef.current;
        return JSON.stringify({
          phase: current.phase,
          nickname: current.nickname,
          elapsedMs: current.phase === "running" ? current.elapsedMs : current.result?.elapsedMs ?? current.elapsedMs,
          qualified: current.result?.qualified ?? false,
        });
      };
      return () => {
        delete testWindow.advanceTime;
        delete testWindow.render_game_to_text;
      };
    }
  }, []);

  const validNickname = normalizeNickname(nickname);
  const canStart = Boolean(playerId && validNickname && phase === "ready" && preparation !== "preparing");
  const displayed = phase === "result" && result ? result.elapsedMs : elapsedMs;
  const seconds = formatSeconds(displayed);
  const [wholeSeconds, decimalSeconds] = seconds.split(",");
  const statusText = !validNickname
    ? "Velg et kallenavn før du starter."
    : preparation === "preparing"
      ? "Klargjør spiller …"
      : preparation === "offline"
        ? localPreview
          ? "Lokal testmodus: forsøk vises bare i topplisten i denne nettleseren."
          : "Frakoblet visning: forsøk kan ikke lagres akkurat nå."
        : "Klar for start. Kallenavnet følger samme spiller-ID i denne nettleseren.";

  const handleAction = () => {
    if (phase === "ready") start();
    else if (phase === "running") void stop();
    else resetResult();
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">
          <Image className="brand-logo" src="/nito-logo-primary-deep.png" alt="NITO" width={4000} height={1828} priority />
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-caption">Standutgave</span>
        </div>
        <div className="topbar-actions">
          <div className="top-note">Klarer du å stoppe mellom 9,900 og 10,100?</div>
          <button className="fullscreen-button" type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Avslutt fullskjerm" : "Start konkurransen i fullskjerm"} title="Fullskjerm (F)">
            {isFullscreen ? "Avslutt fullskjerm" : "Start i fullskjerm"}
          </button>
        </div>
      </header>

      <div className="main-grid">
        <section className="game-column" aria-labelledby="page-title">
          <div className="game-heading">
            <p className="eyebrow">Test tidsfølelsen din</p>
            <h1 className="hero-title" id="page-title">10 sekunder <span>på instinkt.</span></h1>
            <p className="hero-description">Start klokken. Stopp den så nær 10,000 sekunder du klarer.</p>
          </div>

          <div className={`timer-panel ${phase === "running" ? "timer-running" : ""}`} aria-live="off">
            <div className="timer-label">Din tid</div>
            <div className="timer-center">
              <div className="timer-display" aria-label={`${seconds} sekunder`}>
                <span>{wholeSeconds}</span><span className="separator" aria-hidden="true">,</span><span className="decimal">{decimalSeconds}</span>
              </div>
              <div className="target-line"><span>Mål</span><strong>10,000 s</strong><span className="target-tolerance">Godkjent innen ±0,100 s</span></div>
            </div>
            <div className="timer-controls">
              {phase === "ready" && (
                <div className="name-block">
                  <label className="name-label" htmlFor="nickname">
                    <span>Kallenavn</span><span>{[...nickname.trim()].length}/24</span>
                  </label>
                  <input
                    className="name-input"
                    id="nickname"
                    type="text"
                    autoComplete="nickname"
                    maxLength={48}
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="Skriv inn et kallenavn"
                    aria-describedby="setup-status"
                    aria-invalid={Boolean(nickname && !validNickname)}
                  />
                  <div className="setup-note" id="setup-status" aria-live="polite">{statusText}</div>
                  {savedParticipants.length > 0 && (
                    <div className="participant-switcher">
                      <label htmlFor="saved-participant">Fortsett som tidligere deltaker</label>
                      <select id="saved-participant" value={savedParticipants.some((profile) => profile.id === playerId) ? playerId : ""} onChange={(event) => resumeParticipant(event.target.value)}>
                        <option value="">Velg en deltaker</option>
                        {savedParticipants.map((profile) => <option key={profile.id} value={profile.id}>{profile.nickname}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                className={`play-button ${phase === "running" ? "stop" : ""}`}
                type="button"
                onClick={handleAction}
                disabled={phase === "ready" && !canStart}
                aria-label={phase === "running" ? "Stopp timer" : phase === "result" ? "Nytt forsøk" : "Start timer"}
              >
                {phase === "running" ? "STOPP" : phase === "result" ? "NYTT FORSØK" : "START"}
                <span aria-hidden="true">{phase === "running" ? "■" : "▶"}</span>
              </button>

              {phase === "result" && result && (
                <div className={`result-card ${result.qualified ? "qualified-result" : ""}`} role="status" aria-live="polite">
                  <div className="result-heading">
                    <span className={result.qualified ? "result-qualified-title" : "result-near-title"}>
                      {result.qualified ? "Godkjent treff — du er kvalifisert" : "Forsøket er utenfor godkjent område"}
                    </span>
                    <strong className="result-time">{formatSeconds(result.elapsedMs)} s</strong>
                  </div>
                  <div className="result-readout">
                    <span>Avvik: <strong>{signedMsText(result.elapsedMs - TARGET_MS)}</strong></span>
                    {result.qualified && personalBest?.placement ? <span>Plassering: <strong>#{personalBest.placement}</strong></span> : null}
                  </div>
                  <div className="save-note" aria-live="polite">
                    {result.saved === "saving"
                      ? "Lagrer resultatet …"
                      : result.saved === "saved"
                        ? `Resultatet er registrert${personalBest?.attempt_count ? ` · forsøk nr. ${personalBest.attempt_count}` : ""}.`
                        : result.saved === "local"
                          ? `Lokal test: forsøket vises i topplisten på denne nettleseren${personalBest?.attempt_count ? ` · forsøk nr. ${personalBest.attempt_count}` : ""}. Det er ikke lagret permanent.`
                          : "Resultatet vises her, men kunne ikke lagres. Kontroller nett- og databaseoppsett."}
                  </div>
                  <button className="restart-link" type="button" onClick={resetResult}>Gjør klart for nytt forsøk</button>
                  <button className="next-player-link" type="button" onClick={startNextParticipant} disabled={result.saved === "saving"}>
                    {result.saved === "saving" ? "Lagrer før neste deltaker …" : "Neste deltaker · nytt kallenavn"}
                  </button>
                </div>
              )}

              <div className="player-summary" aria-live="polite">
                <span className="personal-best-label">DIN BESTE TID</span>
                <strong>{personalBest ? `${formatSeconds(personalBest.elapsed_ms)} s` : "–"}</strong>
                {personalBest && <small>{signedMsText(Number(personalBest.deviation_ms))} avvik · {personalBest.attempt_count} forsøk</small>}
              </div>
              {phase === "ready" && (
                <button className="new-player-link" type="button" onClick={startNextParticipant}>
                  Jeg er en ny deltaker
                </button>
              )}
            </div>
          </div>

          <div className="game-tools">
            <Leaderboard />
          </div>
          <p className="trust-note">
            Avgjørelsen bruker den nøyaktige nettlesermålingen, ikke avrundet visning. Nettlesermåling kan ikke garantere en fysisk hendelse på nøyaktig 10,000 sekunder og er ikke fullstendig beskyttet mot manipulering. Spiller-ID lagres i denne nettleseren; en annen enhet eller slettet lagring kan ikke automatisk gjenkjennes.
          </p>
          {fullscreenError && <p className="trust-note" role="status">{fullscreenError}</p>}
        </section>
      </div>

      <footer className="site-footer">
        <span>En frittstående standaktivitet. Ingen konto kreves.</span>
        <Link className="admin-link" href="/admin/login">Administrasjon</Link>
      </footer>
    </main>
  );
}
