import { useCallback, useEffect, useRef, useState } from "react"

const MIN_SCALE = 1
const MAX_SCALE = 5
const SWIPE_THRESHOLD = 50

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
const touchDistance = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

interface UseZoomPanOptions {
  /** Reset zoom/pan whenever this changes (e.g. the current photo key). */
  resetKey: string | undefined
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

/**
 * Encapsulates image zoom + pan for a viewer element:
 * - mouse wheel to zoom (native, non-passive so it can prevent page scroll),
 * - drag / one-finger pan when zoomed, two-finger pinch to zoom,
 * - one-finger horizontal swipe (only when NOT zoomed) to navigate,
 * - double-click / double-tap to toggle 1x <-> 2x.
 * Attach `bindContainer` as the element's `ref` (a callback ref — it wires the
 * non-passive wheel listener), spread `handlers`, apply `transform`, and put
 * `touchAction` on the element's style.
 */
export const useZoomPan = ({ resetKey, onSwipeLeft, onSwipeRight }: UseZoomPanOptions) => {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Mirror of `scale` for stable event handlers to read the latest value.
  const scaleRef = useRef(1)
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const reset = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  // Apply a new scale, recentering when it returns to 1x so a previously-panned
  // image doesn't stay translated off-center once fully zoomed out.
  const applyScale = useCallback((next: number) => {
    const clamped = clampScale(next)
    setScale(clamped)
    if (clamped <= MIN_SCALE) setOffset({ x: 0, y: 0 })
  }, [])

  // Reset zoom/pan when the displayed photo changes, using the render-phase
  // "adjust state when a prop changes" pattern (avoids a setState-in-effect
  // cascade).
  const [lastKey, setLastKey] = useState(resetKey)
  if (resetKey !== lastKey) {
    setLastKey(resetKey)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  // Wheel zoom, wired via a callback ref so the listener can be non-passive
  // (React's onWheel is passive and cannot preventDefault the page scroll).
  const wheelHandler = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      applyScale(scaleRef.current - e.deltaY * 0.0015 * scaleRef.current)
    },
    [applyScale]
  )
  const elRef = useRef<HTMLDivElement | null>(null)
  const bindContainer = useCallback(
    (el: HTMLDivElement | null) => {
      if (elRef.current) elRef.current.removeEventListener("wheel", wheelHandler)
      elRef.current = el
      if (el) el.addEventListener("wheel", wheelHandler, { passive: false })
    },
    [wheelHandler]
  )

  // Mouse drag to pan (only meaningful when zoomed).
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return
      dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    },
    [scale, offset]
  )
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current
    if (!d) return
    setOffset({ x: e.clientX - d.x, y: e.clientY - d.y })
  }, [])
  const endMouse = useCallback(() => {
    dragRef.current = null
  }, [])

  const onDoubleClick = useCallback(() => {
    setScale(s => (s > 1 ? 1 : 2))
    setOffset({ x: 0, y: 0 })
  }, [])

  // Touch: pinch (2 fingers), pan (1 finger while zoomed), swipe (1 finger while not zoomed).
  const touchRef = useRef({
    mode: "none" as "none" | "pan" | "pinch" | "swipe",
    startX: 0,
    startY: 0,
    startDist: 0,
    startScale: 1,
    startOffset: { x: 0, y: 0 }
  })

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches
      if (t.length === 2) {
        touchRef.current = {
          mode: "pinch",
          startX: 0,
          startY: 0,
          startDist: touchDistance(t[0], t[1]),
          startScale: scale,
          startOffset: { ...offset }
        }
      } else if (t.length === 1) {
        touchRef.current = {
          mode: scale > 1 ? "pan" : "swipe",
          startX: t[0].clientX,
          startY: t[0].clientY,
          startDist: 0,
          startScale: scale,
          startOffset: { ...offset }
        }
      }
    },
    [scale, offset]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const st = touchRef.current
      const t = e.touches
      if (st.mode === "pinch" && t.length === 2) {
        applyScale(st.startScale * (touchDistance(t[0], t[1]) / (st.startDist || 1)))
      } else if (st.mode === "pan" && t.length === 1) {
        setOffset({
          x: st.startOffset.x + (t[0].clientX - st.startX),
          y: st.startOffset.y + (t[0].clientY - st.startY)
        })
      }
    },
    [applyScale]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const st = touchRef.current
      if (st.mode === "swipe") {
        const dx = (e.changedTouches[0]?.clientX ?? st.startX) - st.startX
        if (dx <= -SWIPE_THRESHOLD) onSwipeLeft()
        else if (dx >= SWIPE_THRESHOLD) onSwipeRight()
      }
      touchRef.current.mode = "none"
    },
    [onSwipeLeft, onSwipeRight]
  )

  return {
    bindContainer,
    scale,
    isZoomed: scale > 1,
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    // Free vertical page scroll when not zoomed; take full control when zoomed.
    touchAction: scale > 1 ? "none" : "pan-y",
    reset,
    zoomIn: () => applyScale(scaleRef.current + 0.5),
    zoomOut: () => applyScale(scaleRef.current - 0.5),
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp: endMouse,
      onMouseLeave: endMouse,
      onDoubleClick,
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  }
}
