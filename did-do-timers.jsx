import { useState, useEffect, useRef } from "react";

/* ---------- design tokens ----------
   desk      #212A33  dark desk surface
   card      #FBF8F1  index card stock
   rule      #B9CBD8  faint blue ruling
   margin    #C0453E  red margin line (also = running state)
   ink       #232B36  pen
   graphite  #7A8390  pencil / secondary
------------------------------------ */

const DESK = "#212A33";
const CARD = "#FBF8F1";
const RULE = "#B9CBD8";
const MARGIN = "#C0453E";
const INK = "#232B36";
const GRAPHITE = "#7A8390";

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif";

const STORE_KEY = "diddo:timers:v1";

const SEED = [
  { id: "t1", name: "Movement", goalHours: 4, cadence: "week" },
  { id: "t2", name: "Operations", goalHours: 7.5, cadence: "week" },
  { id: "t3", name: "Project", goalHours: 10, cadence: "week" },
];

/* ---------- time helpers ---------- */

const now = () => Date.now();

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function periodKey(cadence, d = new Date()) {
  if (cadence === "none") return "all";
  if (cadence === "day") return "d" + dateKey(d);
  const m = new Date(d);
  const offset = (m.getDay() + 6) % 7; // Monday = 0
  m.setDate(m.getDate() - offset);
  m.setHours(0, 0, 0, 0);
  return "w" + dateKey(m);
}

function elapsedSec(t) {
  const live = t.runningSince ? (now() - t.runningSince) / 1000 : 0;
  return t.accumulated + live;
}

function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function short(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function cadenceWord(c) {
  return c === "day" ? "today" : c === "week" ? "this week" : "all time";
}

function weekLabel() {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function makeTimer(seed) {
  return {
    id: seed.id || "t" + Math.random().toString(36).slice(2, 8),
    name: seed.name,
    goalHours: seed.goalHours,
    cadence: seed.cadence,
    accumulated: 0,
    runningSince: null,
    periodKey: periodKey(seed.cadence),
  };
}

/* roll timers into the current period without losing a running clock */
function rollPeriods(list) {
  let changed = false;
  const next = list.map((t) => {
    const key = periodKey(t.cadence);
    if (key === t.periodKey) return t;
    changed = true;
    return {
      ...t,
      accumulated: 0,
      runningSince: t.runningSince ? now() : null,
      periodKey: key,
    };
  });
  return { next, changed };
}

/* ---------- pieces ---------- */

function RuledProgress({ pct }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: "relative", height: 3, marginTop: 14 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderTop: `2px dotted ${RULE}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${p}%`,
          borderTop: `2px solid ${INK}`,
          transition: "width 600ms ease",
        }}
      />
    </div>
  );
}

function Card({ t, onToggle, onEdit, editing, onPatch, onDelete, onClose }) {
  const sec = elapsedSec(t);
  const goalSec = t.goalHours * 3600;
  const pct = goalSec > 0 ? (sec / goalSec) * 100 : 0;
  const done = goalSec > 0 && sec >= goalSec;
  const running = !!t.runningSince;

  return (
    <div
      style={{
        background: CARD,
        borderRadius: 2,
        boxShadow: "0 1px 0 rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.22)",
        display: "flex",
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      {/* red margin rule doubles as the running indicator */}
      <div
        className={running ? "livebar" : ""}
        style={{
          width: running ? 8 : 3,
          background: running ? MARGIN : "rgba(192,69,62,0.45)",
          flexShrink: 0,
          transition: "width 200ms ease",
        }}
      />

      <div style={{ flex: 1, padding: "16px 16px 18px 18px", minWidth: 0 }}>
        {editing ? (
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={t.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              style={inputStyle}
              aria-label="Timer name"
            />
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ ...labelStyle, flex: 1 }}>
                Goal (hours)
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={t.goalHours}
                  onChange={(e) =>
                    onPatch({ goalHours: parseFloat(e.target.value) || 0 })
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                Resets
                <select
                  value={t.cadence}
                  onChange={(e) =>
                    onPatch({
                      cadence: e.target.value,
                      periodKey: periodKey(e.target.value),
                    })
                  }
                  style={inputStyle}
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="none">Never</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() =>
                  onPatch({ accumulated: t.accumulated + 900 })
                }
                style={ghostBtn}
              >
                +15m
              </button>
              <button
                onClick={() =>
                  onPatch({ accumulated: 0, runningSince: null })
                }
                style={ghostBtn}
              >
                Clear time
              </button>
              <button onClick={onDelete} style={{ ...ghostBtn, color: MARGIN }}>
                Delete
              </button>
              <button onClick={onClose} style={{ ...ghostBtn, marginLeft: "auto" }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: GRAPHITE,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.name}
              </span>
              <button
                onClick={onEdit}
                style={{
                  ...ghostBtn,
                  padding: "2px 6px",
                  fontSize: 11,
                  flexShrink: 0,
                }}
                aria-label={`Edit ${t.name}`}
              >
                Edit
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 34,
                  lineHeight: 1,
                  color: INK,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {clock(sec)}
              </span>
              <button
                onClick={onToggle}
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "10px 16px",
                  minWidth: 84,
                  border: `1px solid ${running ? MARGIN : INK}`,
                  background: running ? MARGIN : "transparent",
                  color: running ? CARD : INK,
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              >
                {running ? "Stop" : "Start"}
              </button>
            </div>

            <RuledProgress pct={pct} />

            <div
              style={{
                fontFamily: SANS,
                fontSize: 12,
                color: done ? INK : GRAPHITE,
                marginTop: 8,
              }}
            >
              {t.goalHours > 0
                ? `${short(sec)} of ${short(t.goalHours * 3600)} ${cadenceWord(
                    t.cadence
                  )}${done ? " — met" : ""}`
                : `${short(sec)} ${cadenceWord(t.cadence)}`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  fontFamily: SANS,
  fontSize: 16, // ≥16px stops iOS from zooming on focus
  padding: "8px 10px",
  border: `1px solid ${RULE}`,
  borderRadius: 1,
  background: "#fff",
  color: INK,
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle = {
  fontFamily: SANS,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: GRAPHITE,
  display: "grid",
  gap: 4,
};

const ghostBtn = {
  fontFamily: SANS,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "6px 10px",
  border: `1px solid ${RULE}`,
  background: "transparent",
  color: GRAPHITE,
  borderRadius: 1,
};

/* ---------- app ---------- */

export default function DidDo() {
  const [timers, setTimers] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", goalHours: 3, cadence: "week" });
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const loaded = useRef(false);

  /* load */
  useEffect(() => {
    (async () => {
      let list = null;
      try {
        const res = await window.storage.get(STORE_KEY);
        if (res && res.value) list = JSON.parse(res.value);
      } catch {
        list = null; // no saved state yet
      }
      if (!Array.isArray(list) || list.length === 0) {
        list = SEED.map(makeTimer);
      }
      const { next } = rollPeriods(list);
      setTimers(next);
      loaded.current = true;
    })();
  }, []);

  /* save (only on real state changes — the clock itself is derived from timestamps) */
  useEffect(() => {
    if (!loaded.current || !timers) return;
    (async () => {
      try {
        await window.storage.set(STORE_KEY, JSON.stringify(timers));
        setError(null);
      } catch {
        setError("Couldn't save. Your time is still counting on screen.");
      }
    })();
  }, [timers]);

  /* repaint once a second while anything runs */
  useEffect(() => {
    if (!timers || !timers.some((t) => t.runningSince)) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timers]);

  /* roll into a new day/week when the app has been left open or reopened */
  useEffect(() => {
    if (!timers) return;
    const id = setInterval(() => {
      setTimers((cur) => {
        const { next, changed } = rollPeriods(cur);
        return changed ? next : cur;
      });
    }, 30000);
    return () => clearInterval(id);
  }, [timers]);

  if (!timers) {
    return (
      <div style={{ ...shell, color: GRAPHITE, fontFamily: SANS, fontSize: 13 }}>
        Opening the card…
      </div>
    );
  }

  const toggle = (id) =>
    setTimers((cur) =>
      cur.map((t) => {
        if (t.id !== id) return t;
        if (t.runningSince) {
          return {
            ...t,
            accumulated: t.accumulated + (now() - t.runningSince) / 1000,
            runningSince: null,
          };
        }
        return { ...t, runningSince: now() };
      })
    );

  const patch = (id, fields) =>
    setTimers((cur) => cur.map((t) => (t.id === id ? { ...t, ...fields } : t)));

  const remove = (id) => {
    setTimers((cur) => cur.filter((t) => t.id !== id));
    setEditingId(null);
  };

  const add = () => {
    const name = draft.name.trim();
    if (!name) return;
    setTimers((cur) => [...cur, makeTimer({ ...draft, name })]);
    setDraft({ name: "", goalHours: 3, cadence: "week" });
    setAdding(false);
  };

  const weekTotal = timers
    .filter((t) => t.cadence === "week")
    .reduce((s, t) => s + elapsedSec(t), 0);

  return (
    <div style={shell}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        button { cursor: pointer; }
        button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid ${MARGIN}; outline-offset: 2px;
        }
        @keyframes breathe { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
        .livebar { animation: breathe 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .livebar { animation: none; }
        }
      `}</style>

      <header style={{ padding: "26px 4px 18px" }}>
        <h1
          style={{
            fontFamily: MONO,
            fontSize: 15,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: CARD,
            margin: 0,
            fontWeight: 500,
          }}
        >
          Did&nbsp;Do
        </h1>
        <p
          style={{
            fontFamily: SANS,
            fontSize: 12,
            color: GRAPHITE,
            margin: "6px 0 0",
          }}
        >
          Week of {weekLabel()} · {short(weekTotal)} logged
        </p>
      </header>

      {error && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: MARGIN, padding: "0 4px 12px" }}>
          {error}
        </p>
      )}

      {timers.map((t) => (
        <Card
          key={t.id}
          t={t}
          editing={editingId === t.id}
          onToggle={() => toggle(t.id)}
          onEdit={() => setEditingId(t.id)}
          onClose={() => setEditingId(null)}
          onPatch={(f) => patch(t.id, f)}
          onDelete={() => remove(t.id)}
        />
      ))}

      {adding ? (
        <div
          style={{
            background: CARD,
            borderLeft: `3px solid rgba(192,69,62,0.45)`,
            padding: "16px 16px 18px",
            display: "grid",
            gap: 12,
            borderRadius: 2,
          }}
        >
          <input
            autoFocus
            placeholder="What are you tracking?"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              Goal (hours)
              <input
                type="number"
                step="0.5"
                min="0"
                value={draft.goalHours}
                onChange={(e) =>
                  setDraft({ ...draft, goalHours: parseFloat(e.target.value) || 0 })
                }
                style={inputStyle}
              />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              Resets
              <select
                value={draft.cadence}
                onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}
                style={inputStyle}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="none">Never</option>
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={add} style={{ ...ghostBtn, borderColor: INK, color: INK }}>
              Add timer
            </button>
            <button onClick={() => setAdding(false)} style={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            width: "100%",
            fontFamily: SANS,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: GRAPHITE,
            padding: "14px",
            border: `1px dashed ${GRAPHITE}`,
            background: "transparent",
            borderRadius: 2,
          }}
        >
          New timer
        </button>
      )}

      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          color: GRAPHITE,
          lineHeight: 1.5,
          padding: "22px 4px 40px",
        }}
      >
        Timers keep counting while the app is closed — they run on start times, not
        ticks. Forgot to start one? Edit it and add time by hand.
      </p>
    </div>
  );
}

const shell = {
  background: DESK,
  minHeight: "100vh",
  padding: "0 14px",
  maxWidth: 520,
  margin: "0 auto",
  boxSizing: "border-box",
};
