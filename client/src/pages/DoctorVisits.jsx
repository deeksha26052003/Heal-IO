import { useEffect, useState } from 'react';
import './DoctorVisits.css';

function getTodayLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DoctorVisits() {
  const [visits, setVisits] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(() => ({
    date: getTodayLocalDate(),
    doctor: '',
    spec: '',
    notes: '',
    rx: '',
    fu: '',
  }));
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    loadVisits();
  }, []);

  async function loadVisits() {
    const r = await fetch('/api/visits', { credentials: 'include' });
    const d = await r.json();
    if (Array.isArray(d)) setVisits(d);
  }

  async function saveVisit() {
    if (!form.doctor || !form.date) return;
    const payload = {
      doctorName: form.doctor,
      specialty: form.spec,
      visitDate: form.date,
      notes: form.notes,
      prescriptions: form.rx
        ? form.rx
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      followUpDate: form.fu || null,
    };
    const r = await fetch('/api/visits', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      await loadVisits();
      setShow(false);
      setForm({ date: getTodayLocalDate(), doctor: '', spec: '', notes: '', rx: '', fu: '' });
      showToast('Visit logged');
    }
  }

  async function deleteVisit(id) {
    if (!confirm('Delete this visit?')) return;
    await fetch(`/api/visits/${id}`, { method: 'DELETE', credentials: 'include' });
    await loadVisits();
    showToast('Visit deleted');
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <div className="pg-title">Doctor Visits</div>
          <div className="pg-sub">Complete medical visit history.</div>
        </div>
        <button className="btn" type="button" onClick={() => setShow(!show)}>
          + Log visit
        </button>
      </div>

      {show && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="sec-lbl">New visit</div>
          <div className="g2e">
            <div>
              <label className="lbl" htmlFor="v-date">
                Date
              </label>
              <input
                id="v-date"
                className="inp"
                type="date"
                value={form.date}
                onChange={set('date')}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="v-doctor">
                Doctor
              </label>
              <input
                id="v-doctor"
                className="inp"
                placeholder="Dr. Smith"
                value={form.doctor}
                onChange={set('doctor')}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="v-spec">
                Specialty
              </label>
              <input
                id="v-spec"
                className="inp"
                placeholder="Endocrinologist, GP…"
                value={form.spec}
                onChange={set('spec')}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="v-fu">
                Follow-up
              </label>
              <input id="v-fu" className="inp" type="date" value={form.fu} onChange={set('fu')} />
            </div>
          </div>
          <label className="lbl" htmlFor="v-notes">
            Notes
          </label>
          <textarea
            id="v-notes"
            className="inp"
            rows={2}
            placeholder="What did the doctor say?"
            value={form.notes}
            onChange={set('notes')}
          />
          <label className="lbl" htmlFor="v-rx">
            Prescriptions (comma separated)
          </label>
          <input
            id="v-rx"
            className="inp"
            placeholder="Metformin 500mg, Vitamin D 1000IU"
            value={form.rx}
            onChange={set('rx')}
          />
          <button className="btn" type="button" onClick={saveVisit}>
            Save
          </button>
        </div>
      )}

      {visits.length === 0 && !show && (
        <p style={{ fontSize: 12.5, color: '#6a9a8a' }}>No visits logged yet.</p>
      )}

      {visits.map((v) => (
        <div key={v._id} className="visit">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0d2820' }}>
                {v.doctorName}
                {v.specialty && (
                  <span
                    style={{ fontWeight: 400, color: '#6a9a8a', fontSize: 11.5, marginLeft: 6 }}
                  >
                    · {v.specialty}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#6a9a8a', marginTop: 2 }}>
                {v.visitDate}
                {v.followUpDate && ` · Follow-up: ${v.followUpDate}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {v.followUpDate && (
                <span
                  className="tag"
                  style={{ background: 'rgba(10,110,92,0.08)', color: '#0a6e5c' }}
                >
                  Follow-up {v.followUpDate}
                </span>
              )}
              <button
                type="button"
                className="taken"
                style={{
                  background: 'rgba(254,226,226,0.7)',
                  borderColor: '#fca5a5',
                  color: '#b91c1c',
                  fontSize: 11,
                }}
                onClick={() => deleteVisit(v._id)}
              >
                Delete
              </button>
            </div>
          </div>
          {v.notes && (
            <div style={{ fontSize: 12.5, color: '#2d4a3e', lineHeight: 1.6, marginBottom: 10 }}>
              {v.notes}
            </div>
          )}
          {(v.prescriptions || []).length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {v.prescriptions.map((p) => (
                <span
                  key={p}
                  className="tag"
                  style={{ background: 'rgba(124,58,237,0.07)', color: '#6d28d9' }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {toast && (
        <div
          className="toast"
          role="status"
          style={{ position: 'fixed', bottom: 24, right: 24, margin: 0 }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
