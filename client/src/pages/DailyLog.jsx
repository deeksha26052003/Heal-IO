import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SliderField from '../components/SliderField';
import '../css/pages/DailyLog.css';

const d0 = new Date();
const today = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const SYMPTOMS = [
  'Fatigue',
  'Headache',
  'Cramps',
  'Bloating',
  'Nausea',
  'Brain fog',
  'Joint pain',
  'Anxiety',
  'Insomnia',
  'Skin flare',
];
const FLOW_OPTIONS = ['None', 'Light', 'Medium', 'Heavy', 'Spotting', 'N/A'];

const EMPTY = {
  mood: 5,
  energy: 5,
  sleep: 7,
  pain: 3,
  cramp: 3,
  symptoms: [],
  meals: [],
  flow: 'None',
  notes: '',
};

export default function DailyLog() {
  const { user } = useAuth();
  const isFemale = user?.gender === 'female';

  const [date, setDate] = useState(today);
  const [form, setForm] = useState(EMPTY);
  const [mealInput, setMealInput] = useState('');
  const [symInput, setSymInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(false);
    setError('');
    fetch(`/api/dailylogs/${date}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setForm({
            mood: data.mood ?? EMPTY.mood,
            energy: data.energy ?? EMPTY.energy,
            sleep: data.sleep ?? EMPTY.sleep,
            pain: data.pain ?? EMPTY.pain,
            cramp: data.cramp ?? EMPTY.cramp,
            symptoms: data.symptoms ?? [],
            meals: Array.isArray(data.meals) ? data.meals : data.meals ? [data.meals] : [],
            flow: data.flow ?? 'None',
            notes: data.notes ?? '',
          });
        } else {
          setForm(EMPTY);
        }
      });
  }, [date]);

  function set(k, val) {
    setForm((f) => ({ ...f, [k]: val }));
  }

  function addMeal() {
    if (mealInput.trim()) {
      setForm((f) => ({ ...f, meals: [...f.meals, mealInput.trim()] }));
      setMealInput('');
    }
  }

  function removeMeal(i) {
    setForm((f) => ({ ...f, meals: f.meals.filter((_, j) => j !== i) }));
  }

  function toggleSym(s) {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(s) ? f.symptoms.filter((x) => x !== s) : [...f.symptoms, s],
    }));
  }

  function addCustomSym() {
    const val = symInput.trim();
    if (val && !form.symptoms.includes(val)) {
      setForm((f) => ({ ...f, symptoms: [...f.symptoms, val] }));
    }
    setSymInput('');
  }

  function removeCustomSym(s) {
    setForm((f) => ({ ...f, symptoms: f.symptoms.filter((x) => x !== s) }));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dailylogs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...form }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="pg-title">Daily Log</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 26,
        }}
      >
        <div className="pg-sub" style={{ margin: 0 }}>
          {date === today ? todayLabel : date}
        </div>
        <input
          type="date"
          className="inp"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: 'auto', margin: 0 }}
        />
      </div>

      {saved && (
        <div className="toast" role="status">
          Log saved successfully.
        </div>
      )}
      {error && (
        <div className="toast error" role="alert">
          {error}
        </div>
      )}

      <div className="g2e">
        {/* ── Left column ── */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="sec-lbl">How are you feeling?</div>
            <SliderField
              label="Mood"
              name="mood"
              value={form.mood}
              onChange={set}
              color="#0a6e5c"
            />
            <SliderField
              label="Energy"
              name="energy"
              value={form.energy}
              onChange={set}
              color="#059669"
            />
            <SliderField
              label="Pain level"
              name="pain"
              value={form.pain}
              onChange={set}
              color="#dc2626"
            />
            <SliderField
              label="Sleep hours"
              name="sleep"
              value={form.sleep}
              onChange={set}
              max={12}
              color="#7c3aed"
            />
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="sec-lbl">Meals and diet</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="inp"
                style={{ margin: 0, flex: 1 }}
                placeholder="e.g. oatmeal with berries"
                value={mealInput}
                onChange={(e) => setMealInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMeal()}
              />
              <button className="btn" type="button" onClick={addMeal}>
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {form.meals.map((m, i) => (
                <span
                  key={i}
                  className="tag"
                  style={{ background: 'rgba(209,250,229,0.8)', color: '#166534', gap: 5 }}
                >
                  {m}
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: 0.6,
                      padding: '0 0 0 4px',
                      color: 'inherit',
                    }}
                    onClick={() => removeMeal(i)}
                    aria-label={`Remove ${m}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="sec-lbl">Notes</div>
            <textarea
              className="inp"
              rows={3}
              placeholder="Anything else worth noting…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="sec-lbl">Symptoms today</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`sym${form.symptoms.includes(s) ? ' on' : ''}`}
                  onClick={() => toggleSym(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {form.symptoms.filter((s) => !SYMPTOMS.includes(s)).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {form.symptoms
                  .filter((s) => !SYMPTOMS.includes(s))
                  .map((s) => (
                    <span key={s} className="sym on" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {s}
                      <button
                        type="button"
                        onClick={() => removeCustomSym(s)}
                        aria-label={`Remove ${s}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', color: 'inherit', opacity: 0.7 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="inp"
                style={{ margin: 0, flex: 1 }}
                placeholder="Add your own symptom…"
                value={symInput}
                onChange={(e) => setSymInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomSym()}
              />
              <button className="btn" type="button" onClick={addCustomSym}>
                +
              </button>
            </div>
          </div>

          {isFemale && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="sec-lbl">Cycle tracking</div>
              <div className="lbl" style={{ marginBottom: 8 }}>
                Flow today
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {FLOW_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`cyc${form.flow === f ? ' on' : ''}`}
                    onClick={() => set('flow', f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <SliderField
                label="Cramping"
                name="cramp"
                value={form.cramp}
                onChange={set}
                color="#e11d48"
              />
            </div>
          )}

          <button className="btn-full" type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save log'}
          </button>
        </div>
      </div>
    </div>
  );
}
