import { useEffect, useRef } from 'react'

export default function LamaMouseGlow() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId

    let width = 0
    let height = 0
    let points = []

    const GAP = 18 // Distance between dot grid points
    const RADIUS = 220 // Mouse influence radius
    const MAX_DISPLACEMENT = 45 // Max displacement force
    const SPRING = 0.07 // Spring elasticity
    const DAMPING = 0.84 // Physics damping

    // Mouse coordinates (default off-screen until mouse moves)
    let mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
    }

    const initPoints = () => {
      if (!canvas.parentElement) return
      width = canvas.width = canvas.parentElement.offsetWidth
      height = canvas.height = canvas.parentElement.offsetHeight

      points = []
      const cols = Math.ceil(width / GAP) + 1
      const rows = Math.ceil(height / GAP) + 1

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const originX = i * GAP
          const originY = j * GAP
          points.push({
            originX,
            originY,
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            force: 0,
          })
        }
      }
    }

    initPoints()

    const handleMouseMove = (e) => {
      const rect = canvas.parentElement.getBoundingClientRect()
      mouse.targetX = e.clientX - rect.left
      mouse.targetY = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.targetX = -1000
      mouse.targetY = -1000
    }

    const handleResize = () => {
      initPoints()
    }

    const parent = canvas.parentElement
    parent.addEventListener('mousemove', handleMouseMove)
    parent.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', handleResize)

    const render = () => {
      // Smoothly interpolate mouse position
      mouse.x += (mouse.targetX - mouse.x) * 0.15
      mouse.y += (mouse.targetY - mouse.y) * 0.15

      ctx.clearRect(0, 0, width, height)

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

      // Update and draw each grid point
      for (let i = 0; i < points.length; i++) {
        const p = points[i]

        const dx = mouse.x - p.originX
        const dy = mouse.y - p.originY
        const dist = Math.sqrt(dx * dx + dy * dy)

        let targetX = p.originX
        let targetY = p.originY
        let currentForce = 0

        if (dist < RADIUS) {
          const normDist = dist / RADIUS
          // Smooth sine-based force falloff
          currentForce = Math.cos(normDist * (Math.PI / 2))
          const angle = Math.atan2(dy, dx)

          // Push points away in a fluid wave vector
          const displacement = currentForce * MAX_DISPLACEMENT
          targetX = p.originX - Math.cos(angle) * displacement
          targetY = p.originY - Math.sin(angle) * displacement
        }

        p.force += (currentForce - p.force) * 0.1

        // Spring physics update
        const ax = (targetX - p.x) * SPRING
        const ay = (targetY - p.y) * SPRING

        p.vx = (p.vx + ax) * DAMPING
        p.vy = (p.vy + ay) * DAMPING

        p.x += p.vx
        p.y += p.vy

        // Dynamic rendering properties based on proximity/force
        const baseRadius = 1.1
        const activeRadius = baseRadius + p.force * 2.6
        const alpha = isDark
          ? 0.15 + p.force * 0.8
          : 0.12 + p.force * 0.75

        ctx.fillStyle = isDark
          ? `rgba(199, 245, 138, ${alpha})`
          : `rgba(11, 30, 19, ${alpha})`

        // Draw dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, activeRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove)
      parent.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="auth-lama-canvas"
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
