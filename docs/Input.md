# Input

## Events Handling

Traditional webapp patterns recommend putting your event handling logic right inside the event callback

```tsx
function handleClick(e) {
  /* everything here */
}
;<div onClick={handleClick}> ... </div>
```

This is convenient for simple cases, built around the assumption that events are:

- sparse (happens only once in a while)
- precise (e.g. a mouse click on some exact pixel position)
- discrete (a click's a click; no input's _dragged_ out over time)
- rarely concurrent (e.g. no other input happens while mouse is down)

As event handling requirements grow, you can refactor to such pattern:

```ts
const events = {
  pointerdown: null,
  keydown: null,
}
window.addEventListener('pointerdown', (e) => {
  events.pointerdown = e
  scheduleRender()
})
window.addEventListener('keydown', (e) => {
  events.keydown = e
  scheduleRender()
})

function scheduleRender() {
  if (renderAlreadyScheduled) return
  renderAlreadyScheduled = true

  // ...actual render logic here.
  if (events.pointerdown) doSomething1()
  if (events.keydown) doSomething2()
  calculateSomeOtherState(events.pointerdown, events.keydown) // this is now possible

  // Then near the end, reset events after this render, or keep some if needed for the next frame
  events.pointerdown = null
  events.keydown = null
}
```

Instead of handling a particular event's logic inside its event callback, we _only_ retain the event payload (`e`), then _only_ schedule a render, then process all events holistically inside the render. For the cost of this tiny indirection, logic requiring knowing various event states at the same time (`calculateSomeOtherState`) can happen, enabling cool new UX (or cleaner code for existing UX):

- you get to order the importance of a key press relative to a concurrent (potentially conflicting) mouse click
- resolve one tap while another finger is held down
- Press a key while mouse's hovering over a special section for pro user actions
- Two directional controls on a game pad composing into a new action

This colocation of disparate events costs so little that we should default to this pattern, for easier code evolution.

## Timing

Events contain a `timeStamp` property, the high-precision time when the event occurred. Use this over `performance.now()` and others, when relevant event-related calculations are involved.

## Touch

Pointer up's slightly faster than mouseup on iOS Safari: https://x.com/_chenglou/status/1666771401729265664

Pointer coordinates are rounded/truncated to integers on iOS Safari. This, along with throttled frame rate, explains why most webapps don't feel smooth on iOS vs their native counterparts.

## Miscellaneous

- On page load, there's no way to render a first cursor state.
- `pointermove` doesn't work on android
- `pointerdown` isn't fired on Safari on the first left click after dismissing context menus
- `mousedown` doesn't trigger properly on mobile
- `pointerup` isn't triggered when pointer panned (at least on iOS), don't forget contextmenu event
- (Not a bug, but careful) when scrolling, a container's pointermove doesn't trigger; some stored `event.offsetX/Y` (coordinates local to container) would be stale
- pointer can exceed document bounds, thus have legal negative values

From some of the above points, there's no pointer event that works cross-browser that can replace mouse & touch events.

TODO: good pattern, to document better:

```ts
if (events.mousemove != null) {
  pointer.x = events.mousemove.pageX - /*toGlobal*/ window.scrollX
  pointer.y = events.mousemove.pageY - /*toGlobal*/ window.scrollY
}
```
