import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Bar from '../components/Bar';
import '../css/pages/Dashboard.css';

const today = new Date().toISOString().split('T')[0];
const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function pc(p) {
  return p <= 2 ? '#059669' : p <= 5 ? '#d97706' : p <= 7 ? '#ea580c' : '#dc2626';
}
function pb(p) {
  return p <= 2
    ? 'rgba(209,250,229,0.8)'
    : p <= 5
      ? 'rgba(254,243,199,0.8)'
      : p <= 7
        ? 'rgba(255,237,213,0.8)'
        : 'rgba(254,226,226,0.8)';
}

function avg(logs, key) {
  const vals = logs.map((l) => l[key]).filter((v) => v != null);
  return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '—';
}

function symFreq(logs) {
  const map = {};
  logs.forEach((l) =>
    (l.symptoms || []).forEach((s) => {
      map[s] = (map[s] || 0) + 1;
    })
  );
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function calcStreak(logs) {
  const dates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date();
  while (streak < logs.length) {
    const key = d.toISOString().split('T')[0];
    if (!dates.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [meds, setMeds] = useState([]);
  const [adherence, setAdherence] = useState({});

  useEffect(() => {
    fetch('/api/dailylogs', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setLogs(d);
      });

    fetch('/api/medications', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setMeds(d);
      });

    fetch(`/api/medications/adherence?from=${today}&to=${today}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const map = {};
          d.forEach((a) => {
            map[a.medId] = a.taken;
          });
          setAdherence(map);
        }
      });
  }, []);

  const todayLog = logs.find((l) => l.date === today);
  const recentLogs = logs.slice(0, 5);
  const streak = calcStreak(logs);
  const topSyms = symFreq(logs);
  const activeMeds = meds.filter((m) => m.active);
  const takenCount = activeMeds.filter((m) => adherence[m._id?.toString()]).length;
  const adherePct = activeMeds.length ? Math.round((takenCount / activeMeds.length) * 100) : 0;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().split('T')[0];
    const log = logs.find((l) => l.date === date);
    return {
      d: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][d.getDay()],
      mood: log?.mood || 0,
      energy: log?.energy || 0,
      pain: log?.pain || 0,
    };
  });

  const dots28 = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return logs.some((l) => l.date === d.toISOString().split('T')[0]);
  });

  const SYM_COLORS = ['#dc2626', '#e11d48', '#d97706'];

  return (
    <div>
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-greeting">Good morning, {user?.name?.split(' ')[0]}</div>
          <div className="hero-sub">
            {todayLabel} ·{' '}
            {streak > 0
              ? `${streak} day${streak > 1 ? 's' : ''} logged in a row`
              : 'Start your streak today'}
          </div>
          <button className="hero-btn" type="button" onClick={() => navigate('/log')}>
            + Log today
          </button>
        </div>
        <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
          <div className="hero-num">{streak}</div>
          <div className="hero-lbl">Day streak</div>
        </div>
      </div>

      <div className="met-row">
        {[
          [
            todayLog?.mood ?? '—',
            'Mood',
            '#0a6e5c',
            todayLog ? `${todayLog.mood}/10` : 'Not logged',
          ],
          [
            todayLog?.energy ?? '—',
            'Energy',
            '#059669',
            todayLog ? `${todayLog.energy}/10` : 'Not logged',
          ],
          [
            todayLog ? `${todayLog.sleep}h` : '—',
            'Sleep',
            '#7c3aed',
            todayLog ? `${todayLog.sleep} hrs` : 'Not logged',
          ],
          [
            todayLog?.pain ?? '—',
            'Pain',
            '#dc2626',
            todayLog ? `${todayLog.pain}/10` : 'Not logged',
          ],
        ].map(([val, lbl, color, trend]) => (
          <div key={lbl} className="met-card" style={{ borderTopColor: color }}>
            <div className="met-val" style={{ color }}>
              {val}
            </div>
            <div className="met-lbl">{lbl}</div>
            <div className="met-trend" style={{ color: `${color}99` }}>
              {trend}
            </div>
          </div>
        ))}
      </div>

      <div className="g2">
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div className="sec-lbl" style={{ margin: 0 }}>
              This week
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                ['Mood', '#0a6e5c'],
                ['Energy', '#059669'],
                ['Pain', '#dc2626'],
              ].map(([label, color]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10.5,
                    color: '#6a9a8a',
                  }}
                >
                  <div style={{ width: 7, height: 7, background: color }} aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="chart">
            {last7.map((d, i) => (
              <div key={i} className="chart-col">
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
                  {[
                    [d.mood, '#0a6e5c'],
                    [d.energy, '#059669'],
                    [d.pain, '#dc2626'],
                  ].map(([val, color], j) => (
                    <div
                      key={j}
                      className="chart-bar"
                      style={{ height: `${(val / 10) * 60}px`, background: color, opacity: 0.75 }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#6a9a8a', marginTop: 3 }}>{d.d}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              borderTop: '1px solid rgba(10,110,92,0.1)',
              paddingTop: 12,
              marginTop: 14,
            }}
          >
            {[
              ['Avg Mood', avg(logs.slice(0, 7), 'mood'), '#0a6e5c'],
              ['Avg Energy', avg(logs.slice(0, 7), 'energy'), '#059669'],
              ['Avg Sleep', `${avg(logs.slice(0, 7), 'sleep')}h`, '#7c3aed'],
              ['Avg Pain', avg(logs.slice(0, 7), 'pain'), '#dc2626'],
            ].map(([lbl, val, color]) => (
              <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color, letterSpacing: -0.5 }}>
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: '#6a9a8a',
                    marginTop: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {lbl}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div className="sec-lbl" style={{ margin: 0 }}>
                Recent logs
              </div>
              <button className="btn-o" type="button" onClick={() => navigate('/log')}>
                + Log today
              </button>
            </div>
            {recentLogs.length === 0 ? (
              <p style={{ fontSize: 12, color: '#6a9a8a' }}>No logs yet.</p>
            ) : (
              recentLogs.map((l) => (
                <div key={l._id} className="log-row">
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#6a9a8a',
                      width: 36,
                      flexShrink: 0,
                    }}
                  >
                    {l.date.slice(5)}
                  </div>
                  <div className="pain-chip" style={{ background: pb(l.pain), color: pc(l.pain) }}>
                    {l.pain ?? '?'}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: '#4a7a6a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {(l.symptoms || []).join(', ') || 'no symptoms'}
                  </div>
                  <span
                    className="tag"
                    style={{ background: 'rgba(10,110,92,0.08)', color: '#0a6e5c' }}
                    title="Mood score"
                  >
                    Mood {l.mood}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="g3">
        <div className="card">
          <div className="sec-lbl">28-day activity</div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {dots28.map((logged, i) => (
              <div
                key={i}
                className="sdot"
                style={{ background: logged ? '#0a6e5c' : 'rgba(10,110,92,0.1)' }}
                aria-hidden="true"
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            {[
              [streak, 'streak', '#f59e0b'],
              [logs.length, 'total logs', '#0a6e5c'],
            ].map(([val, lbl, color]) => (
              <div key={lbl}>
                <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: -0.5 }}>
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#6a9a8a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {lbl}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="sec-lbl">Top symptoms</div>
          {topSyms.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6a9a8a' }}>No data yet</p>
          ) : (
            topSyms.map(([sym, count], i) => (
              <div
                key={sym}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    background: SYM_COLORS[i] || '#0a6e5c',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div style={{ flex: 1, fontSize: 12.5, color: '#2d4a3e' }}>{sym}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: SYM_COLORS[i] || '#0a6e5c' }}>
                  {count}x
                </span>
                <div style={{ width: 50 }}>
                  <Bar val={count} color={SYM_COLORS[i] || '#0a6e5c'} max={Math.max(7, count)} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="sec-lbl">Medications today</div>
          {activeMeds.slice(0, 3).map((m) => {
            const taken = adherence[m._id?.toString()];
            return (
              <div
                key={m._id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    background: taken ? '#0a6e5c' : 'rgba(10,110,92,0.2)',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d2820' }}>{m.name}</div>
                  <div style={{ fontSize: 10.5, color: '#6a9a8a' }}>{m.dosage}</div>
                </div>
                <span
                  className="tag"
                  style={{
                    background: taken ? 'rgba(209,250,229,0.8)' : 'rgba(10,110,92,0.06)',
                    color: taken ? '#166534' : '#6a9a8a',
                  }}
                >
                  {taken ? '✓' : '—'}
                </span>
              </div>
            );
          })}
          {activeMeds.length === 0 && (
            <p style={{ fontSize: 12, color: '#6a9a8a' }}>No active medications</p>
          )}
          <div
            style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(10,110,92,0.1)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#6a9a8a',
                marginBottom: 5,
              }}
            >
              <span>Adherence</span>
              <span style={{ fontWeight: 700, color: '#0a6e5c' }}>{adherePct}%</span>
            </div>
            <Bar val={adherePct} color="#0a6e5c" max={100} />
          </div>
        </div>
      </div>
    </div>
  );
}
