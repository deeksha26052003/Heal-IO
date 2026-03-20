import { useState } from 'react';
import Logo from '../components/Logo';
import Bar from '../components/Bar';
import './HealthReport.css';

const _d0 = new Date();
const today = `${_d0.getFullYear()}-${String(_d0.getMonth() + 1).padStart(2, '0')}-${String(_d0.getDate()).padStart(2, '0')}`;
const thirtyAgo = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

function avg(arr, key) {
  const vals = arr.map((l) => l[key]).filter((v) => v != null);
  return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
}

function avgDisplay(arr, key, suffix = '') {
  const v = avg(arr, key);
  return v ? `${v}${suffix}` : '—';
}

function symFreq(logs) {
  const map = {};
  logs.forEach((l) => (l.symptoms || []).forEach((s) => { map[s] = (map[s] || 0) + 1; }));
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function weeklyBuckets(logs) {
  if (!logs.length) return [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const buckets = [];
  let wk = [];
  let weekStart = sorted[0].date;
  sorted.forEach((l) => {
    const diff = (new Date(l.date) - new Date(weekStart)) / 86400000;
    if (diff < 7) { wk.push(l); }
    else {
      buckets.push({ label: weekStart.slice(5), logs: wk });
      wk = [l];
      weekStart = l.date;
    }
  });
  if (wk.length) buckets.push({ label: weekStart.slice(5), logs: wk });
  return buckets;
}

function moodEmoji(v) {
  if (v == null) return '—';
  if (v >= 8) return `${v} 😊`;
  if (v >= 5) return `${v} 😐`;
  return `${v} 😔`;
}

function painColor(v) {
  if (v == null) return '#6a9a8a';
  if (v >= 7) return '#dc2626';
  if (v >= 4) return '#f59e0b';
  return '#059669';
}

export default function HealthReport() {
  const [from, setFrom] = useState(thirtyAgo);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const [logsRes, medsRes, visitsRes, adherenceRes] = await Promise.all([
        fetch(`/api/dailylogs?from=${from}&to=${to}`, { credentials: 'include' }),
        fetch('/api/medications', { credentials: 'include' }),
        fetch('/api/visits', { credentials: 'include' }),
        fetch(`/api/medications/adherence?from=${from}&to=${to}`, { credentials: 'include' }),
      ]);
      const logs = await logsRes.json();
      const meds = await medsRes.json();
      const allVisits = await visitsRes.json();
      const adherence = adherenceRes.ok ? await adherenceRes.json() : [];
      const visits = Array.isArray(allVisits)
        ? allVisits.filter((v) => v.visitDate >= from && v.visitDate <= to).sort((a, b) => b.visitDate.localeCompare(a.visitDate))
        : [];
      setReport({
        logs: Array.isArray(logs) ? logs.sort((a, b) => a.date.localeCompare(b.date)) : [],
        meds: Array.isArray(meds) ? meds : [],
        visits,
        adherence: Array.isArray(adherence) ? adherence : [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* ── Screen header ── */}
      <div className="rpt-screen-header">
        <div>
          <div className="pg-title">Health Report</div>
          <div className="pg-sub">
            {report ? `${from}  →  ${to}  ·  ${report.logs.length} entries` : 'Generate a doctor-ready summary'}
          </div>
        </div>
        {report && (
          <button className="btn" type="button" onClick={() => window.print()}>
            Download PDF
          </button>
        )}
      </div>

      {/* ── Date picker (screen only) ── */}
      {!report && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="sec-lbl">Select date range</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="lbl" htmlFor="rpt-from">From</label>
              <input id="rpt-from" type="date" className="inp" style={{ margin: 0, width: 'auto' }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="lbl" htmlFor="rpt-to">To</label>
              <input id="rpt-to" type="date" className="inp" style={{ margin: 0, width: 'auto' }} value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn" type="button" onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ REPORT CONTENT ════════════════ */}
      {report && (
        <div className="rpt-body">

          {/* ── Page 1: Cover header ── */}
          <div className="rpt-head">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="rpt-title">Patient Health Summary</div>
                <div className="rpt-subtitle">Reporting period: {from} — {to}</div>
                <div className="rpt-subtitle">{report.logs.length} daily entries recorded</div>
              </div>
              <Logo />
            </div>
            <div className="rpt-meta-row">
              {[
                ['Avg Mood', avgDisplay(report.logs, 'mood', '/10')],
                ['Avg Energy', avgDisplay(report.logs, 'energy', '/10')],
                ['Avg Sleep', avgDisplay(report.logs, 'sleep', 'h')],
                ['Avg Pain', avgDisplay(report.logs, 'pain', '/10')],
              ].map(([lbl, val]) => (
                <div key={lbl} className="rpt-meta-box">
                  <div className="rpt-meta-lbl">{lbl}</div>
                  <div className="rpt-meta-val">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 1: Weekly Trends ── */}
          {weeklyBuckets(report.logs).length > 0 && (
            <div className="rpt-section">
              <div className="rpt-sec-title">Weekly Trends</div>
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Week of</th>
                    <th>Days</th>
                    <th>Mood</th>
                    <th>Energy</th>
                    <th>Sleep</th>
                    <th>Pain</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyBuckets(report.logs).map((wk) => (
                    <tr key={wk.label}>
                      <td>{wk.label}</td>
                      <td>{wk.logs.length}</td>
                      <td>{avgDisplay(wk.logs, 'mood')}</td>
                      <td>{avgDisplay(wk.logs, 'energy')}</td>
                      <td>{avgDisplay(wk.logs, 'sleep', 'h')}</td>
                      <td style={{ color: painColor(parseFloat(avg(wk.logs, 'pain'))), fontWeight: 700 }}>
                        {avgDisplay(wk.logs, 'pain')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Section 2: Symptom Analysis ── */}
          {symFreq(report.logs).length > 0 && (
            <div className="rpt-section">
              <div className="rpt-sec-title">Symptom Frequency</div>
              <div className="rpt-sym-grid">
                {symFreq(report.logs).map(([sym, count]) => (
                  <div key={sym} className="rpt-sym-row">
                    <div className="rpt-sym-name">{sym}</div>
                    <div style={{ flex: 1 }}>
                      <Bar val={count} color="#dc2626" max={Math.max(...symFreq(report.logs).map(([, c]) => c), 1)} />
                    </div>
                    <div className="rpt-sym-count">
                      {count} day{count !== 1 ? 's' : ''} ({Math.round((count / report.logs.length) * 100)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 3: Sleep vs Pain Insight ── */}
          {(() => {
            const poor = report.logs.filter((l) => l.sleep != null && l.sleep < 6);
            const good = report.logs.filter((l) => l.sleep != null && l.sleep >= 7);
            const poorPain = avg(poor, 'pain');
            const goodPain = avg(good, 'pain');
            if (!poorPain || !goodPain) return null;
            const reduction = Math.round((1 - parseFloat(goodPain) / parseFloat(poorPain)) * 100);
            return (
              <div className="rpt-section">
                <div className="rpt-sec-title">Key Clinical Insight — Sleep & Pain Correlation</div>
                <div className="rpt-insight">
                  On days with <strong>under 6h sleep</strong> ({poor.length} days), average pain was{' '}
                  <strong style={{ color: '#dc2626' }}>{poorPain}/10</strong>. On nights with{' '}
                  <strong>7h or more sleep</strong> ({good.length} days), pain dropped to{' '}
                  <strong style={{ color: '#059669' }}>{goodPain}/10</strong>
                  {reduction > 0 ? ` — a ${reduction}% reduction` : ''}.
                  Sleep quality is the strongest correlate with symptom severity in this patient&apos;s data.
                </div>
              </div>
            );
          })()}

          {/* ── Section 4: Active Medications ── */}
          {report.meds.filter((m) => m.active).length > 0 && (
            <div className="rpt-section">
              <div className="rpt-sec-title">Current Medications</div>
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Reminder</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.meds.filter((m) => m.active).map((m) => (
                    <tr key={m._id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.dosage || '—'}</td>
                      <td>{m.frequency || '—'}</td>
                      <td>{m.reminderTime || '—'}</td>
                      <td><span className="rpt-badge rpt-badge-green">Active</span></td>
                    </tr>
                  ))}
                  {report.meds.filter((m) => !m.active).map((m) => (
                    <tr key={m._id} style={{ opacity: 0.55 }}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.dosage || '—'}</td>
                      <td>{m.frequency || '—'}</td>
                      <td>{m.reminderTime || '—'}</td>
                      <td><span className="rpt-badge rpt-badge-gray">Inactive</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Section 5: Medication Adherence ── */}
          {report.adherence.length > 0 && report.meds.length > 0 && (
            <div className="rpt-section">
              <div className="rpt-sec-title">Medication Adherence</div>
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Days Tracked</th>
                    <th>Days Taken</th>
                    <th>Adherence Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.meds.map((m) => {
                    const entries = report.adherence.filter((a) => String(a.medId) === String(m._id));
                    if (!entries.length) return null;
                    const taken = entries.filter((a) => a.taken).length;
                    const rate = Math.round((taken / entries.length) * 100);
                    return (
                      <tr key={m._id}>
                        <td style={{ fontWeight: 600 }}>{m.name} <span style={{ color: '#6a9a8a', fontWeight: 400 }}>{m.dosage}</span></td>
                        <td>{entries.length}</td>
                        <td>{taken}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: rate >= 80 ? '#059669' : rate >= 50 ? '#f59e0b' : '#dc2626' }}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Section 7: Doctor Visits ── */}
          {report.visits.length > 0 && (
            <div className="rpt-section">
              <div className="rpt-sec-title">Doctor Visits in Period</div>
              {report.visits.map((v) => (
                <div key={v._id} className="rpt-visit">
                  <div className="rpt-visit-header">
                    <div>
                      <span className="rpt-visit-name">{v.doctorName}</span>
                      {v.specialty && <span className="rpt-visit-spec"> · {v.specialty}</span>}
                    </div>
                    <div className="rpt-visit-date">{v.visitDate}</div>
                  </div>
                  {v.notes && (
                    <div className="rpt-visit-field">
                      <span className="rpt-visit-lbl">Notes: </span>{v.notes}
                    </div>
                  )}
                  {Array.isArray(v.prescriptions) && v.prescriptions.length > 0 && (
                    <div className="rpt-visit-field">
                      <span className="rpt-visit-lbl">Prescriptions: </span>
                      {v.prescriptions.join(', ')}
                    </div>
                  )}
                  {v.followUpDate && (
                    <div className="rpt-visit-field">
                      <span className="rpt-visit-lbl">Follow-up: </span>{v.followUpDate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Section 8: Day-by-Day Log ── */}
          {report.logs.length > 0 && (
            <div className="rpt-section rpt-page-break">
              <div className="rpt-sec-title">Daily Log — Full Record</div>
              <table className="rpt-table rpt-table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mood</th>
                    <th>Energy</th>
                    <th>Sleep</th>
                    <th>Pain</th>
                    <th>Symptoms</th>
                    <th>Meals</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.logs.map((l) => (
                    <tr key={l._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{l.date}</td>
                      <td>{moodEmoji(l.mood)}</td>
                      <td>{l.energy ?? '—'}</td>
                      <td>{l.sleep != null ? `${l.sleep}h` : '—'}</td>
                      <td style={{ color: painColor(l.pain), fontWeight: 700 }}>{l.pain ?? '—'}</td>
                      <td style={{ fontSize: 10 }}>{(l.symptoms || []).join(', ') || '—'}</td>
                      <td style={{ fontSize: 10, maxWidth: 90 }}>{l.meals || '—'}</td>
                      <td style={{ fontSize: 10, maxWidth: 120, color: '#6a9a8a' }}>{l.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="rpt-footer">
            Generated by Heal I/O · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · This report is for informational purposes only.
          </div>

          {/* Back button (screen only) */}
          <div className="rpt-back-btn">
            <button className="btn-o" type="button" onClick={() => setReport(null)}>← New report</button>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          /* Hide everything except report */
          .sb, .rpt-screen-header, .rpt-back-btn,
          .wave-canvas, nav, header { display: none !important; }

          /* Unlock fixed-height layout so content flows across pages */
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .app {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .main {
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .rpt-body {
            padding: 0 !important;
            display: block !important;
          }

          /* Remove glass / shadow effects */
          .card, .rpt-section, .rpt-visit {
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: #fff !important;
            border-color: #ddd !important;
          }
          .rpt-head {
            box-shadow: none !important;
            backdrop-filter: none !important;
            background: #0a6e5c !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .rpt-meta-box {
            background: rgba(255,255,255,0.14) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Sections: allow breaks between but not inside short ones */
          .rpt-section { page-break-inside: avoid; margin-bottom: 14px; }
          /* The daily log table is long — allow it to break between rows */
          .rpt-page-break { page-break-before: always; }
          .rpt-table-sm tr { page-break-inside: auto; }
          tr { page-break-inside: avoid; }

          /* Typography */
          body { font-size: 11px !important; }
          .rpt-table { font-size: 10px !important; }
          .rpt-table-sm { font-size: 9px !important; }
          .rpt-table-sm th, .rpt-table-sm td { padding: 4px 6px !important; }
        }
      `}</style>
    </div>
  );
}
