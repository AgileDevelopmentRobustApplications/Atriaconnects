import { SLIDES } from '../data/content'
import { CollapseIcon, ExpandIcon, GridIcon, MotionIcon, NotesIcon } from './Icons'

/**
 * Subtle presenter chrome: slide/step progress on the left of the toolbar,
 * tools on the right. Fades away after a moment of inactivity so the stage
 * stays clean on a projector.
 */
export default function Controls({ slide, step, onGoTo, onOverview, onNotes, notesOpen, onMotion, reduced, onFullscreen, fullscreen, idle }) {
  return (
    <div className={`controls ${idle ? 'is-idle' : ''}`}>
      <nav className="progress" aria-label="Slide progress">
        {SLIDES.map((s, i) => {
          const done = i < slide
          const here = i === slide
          const ratio = here ? (step + 1) / s.steps : done ? 1 : 0
          return (
            <button
              key={s.id}
              type="button"
              className={`progress__seg ${here ? 'is-current' : ''}`}
              aria-label={`Go to slide ${s.no}: ${s.label}`}
              aria-current={here ? 'step' : undefined}
              onClick={() => onGoTo(i)}
            >
              <span className="progress__bar"><span className="progress__fill" style={{ transform: `scaleX(${ratio})` }} /></span>
              <span className="progress__tip">{s.no} · {s.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="tools" role="toolbar" aria-label="Presentation tools">
        <button type="button" className="tool" onClick={onOverview} title="Overview (O)" aria-label="Open overview"><GridIcon /></button>
        <button type="button" className={`tool ${notesOpen ? 'is-on' : ''}`} onClick={onNotes} title="Presenter notes (N)" aria-label="Toggle presenter notes" aria-pressed={notesOpen}><NotesIcon /></button>
        <button type="button" className={`tool ${reduced ? 'is-on' : ''}`} onClick={onMotion} title={reduced ? 'Reduced motion ON (M)' : 'Reduced motion off (M)'} aria-label="Toggle reduced motion" aria-pressed={reduced}><MotionIcon /></button>
        <button type="button" className="tool" onClick={onFullscreen} title="Full screen (F)" aria-label="Toggle full screen">{fullscreen ? <CollapseIcon /> : <ExpandIcon />}</button>
      </div>
    </div>
  )
}
