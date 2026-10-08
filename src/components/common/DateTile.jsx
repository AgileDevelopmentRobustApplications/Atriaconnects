import { format } from 'date-fns'

// Calendar tile (month band + day number) used for events across the app.
export default function DateTile({ date }) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return (
    <div className="date-tile" aria-hidden="true">
      <span className="date-tile-month">{format(d, 'MMM')}</span>
      <span className="date-tile-day">{format(d, 'd')}</span>
    </div>
  )
}
