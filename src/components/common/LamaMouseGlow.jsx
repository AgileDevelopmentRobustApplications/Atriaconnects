import { useEffect, useRef } from 'react'

// Interactive dot field behind the auth card. Dots spring away from the
// cursor. The loop sleeps once every dot has settled and wakes on mouse move,
// so an idle login page costs nothing; reduced-motion users get a static grid.
export default function LamaMouseGlow() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const parent = canvas.parentElement
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let animationFrameId = null

    let width = 0
    let height = 0
    let points = []

    const GAP = 20 // Distance between dot grid points
    const RADIUS = 220 // Mouse influence radius
    const MAX_DISPLACEMENT = 40 // Max displacement force
    const SPRING = 0.07 // Spring elasticity
    const DAMPING = 0.84 // Physics damping

    // Mouse coordinates (default off-screen until mouse moves)
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 }

    const initPoints = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.offsetWidth
      height = parent.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      points = []
      const cols = Math.ceil(width / GAP) + 1
      const rows = Math.ceil(height / GAP) + 1
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const originX = i * GAP
          const originY = j * GAP
          points.push({ originX, originY, x: originX, y: originY, vx: 0, vy: 0, force: 0 })
        }
      }
    }

    // Returns true while anything is still moving.
    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.15
      mouse.y += (mouse.targetY - mouse.y) * 0.15

      ctx.clearRect(0, 0, width, height)
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      let moving = Math.abs(mouse.targetX - mouse.x) > 0.5 || Math.abs(mouse.targetY - mouse.y) > 0.5

      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const dx = mouse.x - p.originX
        const dy = mouse.y - p.originY
        const dist = Math.sqrt(dx * dx + dy * dy)

        let targetX = p.originX
        let targetY = p.originY
        let currentForce = 0

        if (dist < RADIUS) {
          // Smooth cosine falloff, pushing points away in a fluid wave
          currentForce = Math.cos((dist / RADIUS) * (Math.PI / 2))
          const angle = Math.atan2(dy, dx)
          const displacement = currentForce * MAX_DISPLACEMENT
          targetX = p.originX - Math.cos(angle) * displacement
          targetY = p.originY - Math.sin(angle) * displacement
        }

        p.force += (currentForce - p.force) * 0.1
        p.vx = (p.vx + (targetX - p.x) * SPRING) * DAMPING
        p.vy = (p.vy + (targetY - p.y) * SPRING) * DAMPING
        p.x += p.vx
        p.y += p.vy

        if (!moving && (Math.abs(p.vx) > 0.01 || Math.abs(p.vy) > 0.01 || p.force > 0.01)) {
          moving = true
        }

        const activeRadius = 1 + p.force * 2.4
        const alpha = (isDark ? 0.13 : 0.1) + p.force * (isDark ? 0.75 : 0.6)
        ctx.fillStyle = isDark ? `rgba(199, 245, 138, ${alpha})` : `rgba(59, 84, 66, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, activeRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      return moving
    }

    const loop = () => {
      animationFrameId = render() ? requestAnimationFrame(loop) : null
    }

    const wake = () => {
      if (animationFrameId === null) animationFrameId = requestAnimationFrame(loop)
    }

    const handleMouseMove = (e) => {
      const rect = parent.getBoundingClientRect()
      mouse.targetX = e.clientX - rect.left
      mouse.targetY = e.clientY - rect.top
      wake()
    }

    const handleMouseLeave = () => {
      mouse.targetX = -1000
      mouse.targetY = -1000
      wake()
    }

    const handleResize = () => {
      initPoints()
      render()
    }

    // Redraw when the theme flips so dot colour follows it.
    const themeObserver = new MutationObserver(() => render())
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    initPoints()
    render()
    if (!reduceMotion) {
      parent.addEventListener('mousemove', handleMouseMove)
      parent.addEventListener('mouseleave', handleMouseLeave)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove)
      parent.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', handleResize)
      themeObserver.disconnect()
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="auth-lama-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}
