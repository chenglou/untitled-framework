import { center, hash11 } from './martian'
import { msPerAnimationStep, Spring, spring, springGoToEnd, springStep } from './martian/spring'

// === constant layout metrics. The rest is dynamic
const rowSizeX = 320
const windowPaddingTop = 50

type PointerPoint = { x: number; y: number; time: number }
type DraggedInfo = { id: number; deltaX: number; deltaY: number } | null
type DataItem = {
  id: number
  sizeY: number
  x: Spring
  y: Spring
  scale: Spring
  node: HTMLElement
}

type State = {
  dragged: DraggedInfo
  lastDragged: DraggedInfo
  pointerState: 'down' | 'up' | 'firstDown'
  pointer: PointerPoint[]
  data: DataItem[]
}

// === single giant state object. It's a fine pattern especially when LLMs can help refactor nowadays
const state: State = {
  dragged: null,
  lastDragged: null,
  pointerState: 'up',
  pointer: [{ x: 0, y: 0, time: 0 }], // circular buffer. On page load, there's no way to render a first cursor state =(
  data: [],
}
{
  const windowSizeX = document.documentElement.clientWidth // excludes scroll bar & invariant under safari pinch zoom
  for (let i = 0; i < 5; i++) {
    const node = document.createElement('div')
    const sizeY = 50 + hash11(i) * 150 // Deterministic size, Range: [50, 200)
    node.className = 'row'
    node.innerHTML = 'Drag Me ' + i
    node.style.width = `${rowSizeX}px`
    node.style.height = `${sizeY}px`
    node.style.backgroundColor = `hsl(205, 100%, ${90 - i * 5}%)` // lighter blue hue
    const centerX = center(rowSizeX, windowSizeX)
    state.data.push({
      id: i, // gonna drag rows around so we can't refer to a row by index. Assign a stable id
      sizeY,
      x: spring(centerX, centerX, 0, 225, 25),
      y: spring(0, 0, 0, 225, 25),
      scale: spring(1, 1, 0, 225, 25),
      node: node,
    })
    document.body.appendChild(node)
  }
}

// Global events object to capture incoming events. These are reset at the end of every frame
const events: {
  mouseup: MouseEvent | null
  touchend: TouchEvent | null
  mousemove: MouseEvent | null
  touchmove: TouchEvent | null
  pointerdown: PointerEvent | null
} = {
  mouseup: null,
  touchend: null,
  mousemove: null,
  touchmove: null,
  pointerdown: null,
}

// Add event listeners to update the events object and trigger rendering
window.addEventListener('mouseup', (e) => {
  events.mouseup = e
  scheduleRender()
})
window.addEventListener('touchend', (e) => {
  events.touchend = e
  scheduleRender()
})
window.addEventListener('mousemove', (e) => {
  events.mousemove = e
  scheduleRender()
})
window.addEventListener('touchmove', (e) => {
  events.touchmove = e
  scheduleRender()
})
window.addEventListener('pointerdown', (e) => {
  events.pointerdown = e
  scheduleRender()
})

let scheduledRender = false
let animatedUntilTime: number | null = null
function scheduleRender() {
  if (scheduledRender) return
  scheduledRender = true
  requestAnimationFrame(function renderAndMaybeScheduleAnotherRender(now) {
    // eye-grabbing name. No "(anonymous)" function in the debugger & profiler
    scheduledRender = false

    let newAnimatedUntilTime = animatedUntilTime ?? now
    const animationSteps = Math.floor((now - newAnimatedUntilTime) / msPerAnimationStep)
    newAnimatedUntilTime += animationSteps * msPerAnimationStep
    const stillAnimating = render(now, animationSteps)
    animatedUntilTime = stillAnimating ? newAnimatedUntilTime : null

    // Reset events after they've been processed
    events.mouseup = events.touchend = events.mousemove = events.touchmove = events.pointerdown = null
    if (stillAnimating) scheduleRender()
  })
}

function springForEach(f: (s: Spring) => void) {
  for (const d of state.data) {
    f(d.x)
    f(d.y)
    f(d.scale)
  }
}

// === hit testing logic. Boxes' hit area should be static and not follow their current animated state usually (but we can do either). Use the dynamic area here for once
function hitTest(data: DataItem[], pointer: PointerPoint): DataItem | void {
  for (const d of data) {
    const { x, y, sizeY } = d
    if (x.pos <= pointer.x && pointer.x < x.pos + rowSizeX && y.pos <= pointer.y && pointer.y < y.pos + sizeY) return d // pointer on this box
  }
}

// this means we should only use pointer's global coordinates, which is always right
function render(now: number, animationSteps: number): boolean {
  // === step 0: process events
  // mouseup/touchend
  // move
  // when scrolling (which might schedule a render), a container's pointermove doesn't trigger, so the pointer's local coordinates are stale
  // this means we should only use pointer's global coordinates, which is always right
  if (events.mouseup || events.touchend) state.pointerState = 'up'
  if (events.mousemove)
    state.pointer.push({ x: events.mousemove.pageX, y: events.mousemove.pageY, time: performance.now() })
  if (events.touchmove)
    state.pointer.push({
      x: events.touchmove.touches[0]!.pageX,
      y: events.touchmove.touches[0]!.pageY,
      time: performance.now(),
    })
  if (events.pointerdown) {
    state.pointerState = 'firstDown'
    state.pointer.push({ x: events.pointerdown.pageX, y: events.pointerdown.pageY, time: performance.now() })
  }

  // === step 1: batched DOM reads (to avoid accidental DOM read & write interleaving)
  const windowSizeX = document.documentElement.clientWidth // excludes scroll bar & invariant under safari pinch zoom
  const pointerLast = state.pointer.at(-1)! // guaranteed non-null since pointer.length >= 1

  // === step 2: handle inputs-related state change
  let newDragged: DraggedInfo | null = null
  if (state.pointerState === 'down') newDragged = state.dragged
  else if (state.pointerState === 'up') {
    if (state.dragged != null) {
      // if we just dragged & released an item, give it a bit of flick velocity based on how fast we swiped it away
      const dragIdx = state.data.findIndex((d) => d.id === state.dragged!.id)
      let i = state.pointer.length - 1
      while (i >= 0 && now - state.pointer[i]!.time <= 100) i-- // only consider last ~100ms of movements
      const pointer = state.pointer[i]!
      const deltaTime = now - pointer.time
      const vx = ((pointerLast.x - pointer.x) / deltaTime) * 1000 // speed over ~1s
      const vy = ((pointerLast.y - pointer.y) / deltaTime) * 1000
      state.data[dragIdx]!.x.v += vx
      state.data[dragIdx]!.y.v += vy
    }
    newDragged = null
  } else {
    const hit = hitTest(state.data, pointerLast)
    if (hit) newDragged = { id: hit.id, deltaX: pointerLast.x - hit.x.pos, deltaY: pointerLast.y - hit.y.pos }
  }

  // === step 3: calculate new layout & cursor
  if (newDragged) {
    // first, swap row based on cursor position if needed
    let dragIdx = state.data.findIndex((d) => d.id === newDragged.id) // guaranteed non-null
    const d = state.data[dragIdx]!
    const x = pointerLast.x - newDragged.deltaX
    const y = pointerLast.y - newDragged.deltaY
    d.x.pos = d.x.dest = x + (center(rowSizeX, windowSizeX) - x) / 1.5 // restrict horizontal drag a bit
    d.y.pos = d.y.dest = y
    d.scale.dest = 1.1
    // dragging row upward? Swap it with previous row if cursor is above midpoint of previous row
    while (dragIdx > 0 && pointerLast.y < state.data[dragIdx - 1]!.y.dest + state.data[dragIdx - 1]!.sizeY / 2) {
      ;[state.data[dragIdx], state.data[dragIdx - 1]] = [state.data[dragIdx - 1]!, state.data[dragIdx]!] // swap
      dragIdx--
    }
    // dragging row downward? Swap it with next row if cursor is below midpoint of next row
    while (
      dragIdx < state.data.length - 1 &&
      pointerLast.y > state.data[dragIdx + 1]!.y.dest + state.data[dragIdx + 1]!.sizeY / 2
    ) {
      ;[state.data[dragIdx], state.data[dragIdx + 1]] = [state.data[dragIdx + 1]!, state.data[dragIdx]!] // swap
      dragIdx++
    }
  }
  let top = windowPaddingTop
  for (const d of state.data) {
    if (newDragged && d.id === newDragged.id) {
      // already modified above for the dragged element
    } else {
      d.x.dest = center(rowSizeX, windowSizeX)
      d.y.dest = top
      d.scale.dest = 1
    }
    top += d.sizeY
  }
  const cursor =
    newDragged ?
      'grabbing' // will be "grabbing" even if pointer leaves the card
    : hitTest(state.data, pointerLast) ? 'grab'
    : 'auto'

  // === step 4: run animation
  let stillAnimating = false
  springForEach((s) => {
    for (let i = 0; i < animationSteps; i++) springStep(s)
    if (Math.abs(s.v) < 0.01 && Math.abs(s.dest - s.pos) < 0.01)
      springGoToEnd(s) // close enough, we're done
    else stillAnimating = true
  })

  // === step 5: render. Batch DOM writes
  for (let i = 0; i < state.data.length; i++) {
    const d = state.data[i]!
    const style = d.node.style

    const zIndex =
      d.scale.pos > 1 ?
        // the visual scaling up is to simulate that the item is getting closer to us. They should therefore have a higher z-index than any other item at rest (scale = 1)
        state.data.length + Math.floor(d.scale.pos * 100) // base z is higher than all other item, + scale, mapped from [1, 1.1] to [100, 110]
      : i // otherwise, just use the index. Array order is already the visual y order
    style.zIndex = `${zIndex}`

    style.transform = `translate3d(${d.x.pos}px,${d.y.pos}px,0) scale(${d.scale.pos})`
    if (newDragged && d.id === newDragged.id) {
      style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 16px 32px 0px'
      style.opacity = '0.7'
    } else {
      style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px'
      style.opacity = '1.0'
    }
  }
  document.body.style.cursor = cursor

  // === step 6: update state & prepare for next frame
  if (state.pointerState === 'firstDown') state.pointerState = 'down'
  if (state.dragged && newDragged == null) state.lastDragged = state.dragged
  state.dragged = newDragged
  if (state.pointerState === 'up') state.pointer = [{ x: 0, y: 0, time: 0 }]
  if (state.pointer.length > 20) state.pointer.shift() // keep only the last ~20 pointer events

  return stillAnimating
}

// Start the render loop
scheduleRender()
