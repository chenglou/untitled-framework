import { msPerAnimationStep } from './spring'

// === generic scheduler & its debugger
export function makeScheduler<K extends keyof WindowEventMap>(
  events: Array<K>,
  render: (
    now: number,
    events: { [K in keyof WindowEventMap]: WindowEventMap[K] | null },
    animationSteps: number,
  ) => boolean,
) {
  let scheduledRender = false

  let initEvents = {} as { [K in keyof WindowEventMap]: WindowEventMap[K] | null }
  for (const key of events) {
    initEvents[key] = null
    window.addEventListener(key, (e) => {
      initEvents[key] = e
      scheduleRender()
    })
  }

  let animatedUntilTime: number | null = null

  function scheduleRender() {
    if (scheduledRender) return
    scheduledRender = true

    requestAnimationFrame(function renderAndMaybeScheduleAnotherRender(now) {
      // eye-grabbing name. No "(anonymous)" function in the debugger & profiler
      scheduledRender = false

      let newAnimatedUntilTime = animatedUntilTime ?? now
      const animationSteps = Math.floor((now - newAnimatedUntilTime) / msPerAnimationStep) // run x animation steps. Decouple physics simulation from framerate!
      newAnimatedUntilTime += animationSteps * msPerAnimationStep
      const stillAnimating = render(now, initEvents, animationSteps)
      animatedUntilTime = stillAnimating ? newAnimatedUntilTime : null

      for (const key of events) initEvents[key] = null
      if (stillAnimating) scheduleRender()
    })
  }

  return scheduleRender
}

// === generic helpers
export function center(containee: number, container: number, containerInsetStart = 0, containerInsetEnd = 0) {
  // assuming container size already includes containerInsetStart and containerInsetEnd
  return containerInsetStart + (container - containerInsetStart - containerInsetEnd - containee) / 2
}

export function remap(value: number, oldMin: number, oldMax: number, newMin: number, newMax: number): number {
  if (oldMin === oldMax) return (newMin + newMax) / 2 // avoid divide by 0
  return ((value - oldMin) / (oldMax - oldMin)) * (newMax - newMin) + newMin
}

export function length(x: number, y: number) {
  return Math.sqrt(x * x + y * y)
}
export function lessEqual(a: number, b: number, c: number) {
  return a <= b && b <= c
}

export function insideInclusive(x1: number, y1: number, x2: number, y2: number, sizeX: number, sizeY: number) {
  return x2 <= x1 && x1 <= x2 + sizeX && y2 <= y1 && y1 <= y2 + sizeY
}

export function overlapInclusive(
  x1: number,
  y1: number,
  sizeX1: number,
  sizeY1: number,
  x2: number,
  y2: number,
  sizeX2: number,
  sizeY2: number,
) {
  return x1 <= x2 + sizeX2 && x2 <= x1 + sizeX1 && y1 <= y2 + sizeY2 && y2 <= y1 + sizeY1
}

// returns the overlapped area size
export function overlap(a: Vec4, b: Vec4): number {
  const left = Math.max(a.x, b.x)
  const right = Math.min(a.z, b.z)
  const top = Math.max(a.y, b.y)
  const bottom = Math.min(a.w, b.w)

  if (right > left && bottom > top) return (right - left) * (bottom - top)
  return 0 // no overlap
}

export function fit(ar: number, containerSizeX: number, containerSizeY: number) {
  // returns max size x that fits in the container without changing aspect ratio
  return Math.min(containerSizeX, containerSizeY * ar) // returns fitted sizeX. Get fitted sizeY with sizeX / ar
}

export function clamp(min: number, v: number, max: number) {
  return (
    v > max ? max
    : v < min ? min
    : v
  )
}

export function easeOutQuad(x: number): number {
  return 1 - (1 - x) ** 2
}
export function easeOutQuart(x: number): number {
  return 1 - (1 - x) ** 4
}

export function rem(x: number) {
  return x * 16
}

export function minIndex(arr: number[]) {
  let min = Infinity
  let minIndex = 0
  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]!
    if (value < min) {
      minIndex = i
      min = value
    }
  }
  return minIndex
}

export function fract(x: number) {
  return x - Math.floor(x)
}

// https://www.shadertoy.com/view/4djSRW
export function hash11(p: number): number {
  p = fract(p * 0.1031)
  p *= p + 33.33
  p *= p + p
  return fract(p)
}

export function hash21(p: number): Vec2 {
  const p3x = fract(p * 0.1031)
  const p3y = fract(p * 0.103)
  const p3z = fract(p * 0.0973)

  const dot = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33)

  const px = p3x + dot
  const py = p3y + dot
  const pz = p3z + dot

  return {
    x: fract((px + py) * pz),
    y: fract((px + pz) * py),
  }
}

export function hash31(p: number): Vec3 {
  const p3x = fract(p * 0.1031)
  const p3y = fract(p * 0.103)
  const p3z = fract(p * 0.0973)

  const dot = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33)

  const px = p3x + dot
  const py = p3y + dot
  const pz = p3z + dot

  return {
    x: fract((px + py) * pz),
    y: fract((px + pz) * py),
    z: fract((py + pz) * px),
  }
}

// export function hash12(a: number, b: number) {
//   let aa = fract(a * .1031)
//   let bb = fract(b * .1031)
//   let p3_0 = aa * .1031, p3_1 = bb * .1031, p3_2 = aa * .1031
//   let q3_0 = p3_0 + 33.33, q3_1 = p3_1 + 33.33, q3_2 = p3_2 + 33.33
//   let dotted = p3_2 * q3_0 + p3_0 * q3_1 + p3_1 * q3_2
//   p3_2 += dotted; p3_0 += dotted; p3_1 += dotted
//   return fract((p3_2 + p3_0) * p3_1)
// }

// convenient types
export type Vec2 = { x: number; y: number }
export type Vec3 = { x: number; y: number; z: number }
export type Vec4 = { x: number; y: number; z: number; w: number }

export function vec2(x: number, y: number): Vec2 {
  return { x, y }
}
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}
export function vec4(x: number, y: number, z: number, w: number): Vec4 {
  return { x, y, z, w }
}
