import { center, makeScheduler } from './martian'
import { Spring, spring, springGoToEnd, springStep } from './martian/spring'

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

// === initialize data
{
  const windowSizeX = document.documentElement.clientWidth // excludes scroll bar & invariant under safari pinch zoom
  for (let i = 0; i < 5; i++) {
    const node = document.createElement('div')
    const sizeY = 30 + Math.random() * 150 // [30, 180)
    node.className = 'row'
    node.innerHTML = 'Drag Me ' + i
    node.style.width = `${rowSizeX}px`
    node.style.height = `${sizeY}px`
    const rand = Math.random() * 40 + 40 // Range: [40, 80]
    node.style.outline = `1px solid hsl(205, 100%, ${rand}%)` // blue hue
    node.style.backgroundColor = `hsl(205, 100%, ${rand + 10}%)` // lighter blue hue
    state.data.push({
      id: i, // gonna drag rows around so we can't refer to a row by index. Assign a stable id
      sizeY,
      x: spring(center(rowSizeX, windowSizeX)),
      y: spring(0),
      scale: spring(1),
      node: node,
    })
    document.body.appendChild(node)
  }
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

// pointermove doesn't work on android, pointerdown isn't fired on Safari on the first left click after dismissing context menus, mousedown doesn't trigger properly on mobile, pointerup isn't triggered when pointer panned (at least on iOS), don't forget contextmenu event. Tldr there's no pointer event that works cross-browser that can replace mouse & touch events.
const scheduleRender = makeScheduler(
  ['mouseup', 'touchend', 'mousemove', 'touchmove', 'pointerdown'],
  (now, events, animationSteps) => {
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
      while (dragIdx > 0 && pointerLast.y < state.data[dragIdx - 1].y.dest + state.data[dragIdx - 1].sizeY / 2) {
        ;[state.data[dragIdx], state.data[dragIdx - 1]] = [state.data[dragIdx - 1], state.data[dragIdx]] // swap
        dragIdx--
      }
      // dragging row downward? Swap it with next row if cursor is below midpoint of next row
      while (
        dragIdx < state.data.length - 1 &&
        pointerLast.y > state.data[dragIdx + 1].y.dest + state.data[dragIdx + 1].sizeY / 2
      ) {
        ;[state.data[dragIdx], state.data[dragIdx + 1]] = [state.data[dragIdx + 1], state.data[dragIdx]] // swap
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
      style.transform = `translate3d(${d.x.pos}px,${d.y.pos}px,0) scale(${d.scale.pos})`
      const zIndex =
        newDragged && d.id === newDragged.id ? state.data.length + 2
        : state.lastDragged && d.id === state.lastDragged.id ?
          state.data.length + 1 // last dragged and released row still needs to animate into place; keep its z-index high
        : i
      style.zIndex = `${zIndex}`
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
  },
)

scheduleRender()
