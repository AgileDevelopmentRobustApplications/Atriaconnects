const base = import.meta.env.BASE_URL

/** RESQ PAWS logo. On navy slides it sits on a white chip (the wordmark is navy). */
export default function Logo({ chip = false, className = '' }) {
  return (
    <span className={`logo ${chip ? 'logo--chip' : ''} ${className}`}>
      <img src={`${base}images/logo/resq-paws-logo.png`} alt="RESQ PAWS" draggable={false} />
    </span>
  )
}
