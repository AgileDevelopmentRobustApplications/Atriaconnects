import { NOTES, SLIDES } from '../data/content'

/** Presenter notes drawer (key N): talking points, builds, proof to have ready, likely questions. */
export default function Notes({ open, slide, step }) {
  const n = NOTES[slide]
  const meta = SLIDES[slide]
  return (
    <aside className={`notes ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open} aria-label="Presenter notes">
      <div className="notes__head">
        <span className="notes__no">{String(meta.no).padStart(2, '0')}</span>
        <h2>{meta.label}</h2>
        <span className="notes__job">{meta.job}</span>
      </div>
      <div className="notes__cols">
        <section>
          <h3>Builds</h3>
          <ol className="notes__builds">
            {n.build.map((b, i) => (<li key={b} className={i === step ? 'is-now' : i < step ? 'is-done' : ''}>{b}</li>))}
          </ol>
          <h3>Tip</h3>
          <p>{n.tip}</p>
        </section>
        <section>
          <h3>Say</h3>
          <ul>{n.say.map((t) => (<li key={t}>{t}</li>))}</ul>
          <h3>Full script · 30–40 s</h3>
          <p className="notes__script">{n.script}</p>
        </section>
        <section>
          <h3>Proof to have ready</h3>
          <ul>{n.proof.map((t) => (<li key={t}>{t}</li>))}</ul>
          <h3>Investors will ask</h3>
          <ul>{n.ask.map((t) => (<li key={t}>{t}</li>))}</ul>
        </section>
      </div>
    </aside>
  )
}
