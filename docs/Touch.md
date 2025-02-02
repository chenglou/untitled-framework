# Touch

Pointer up's slightly faster than mouseup on iOS Safari: https://x.com/_chenglou/status/1666771401729265664

Pointer coordinates are rounded/truncated to integers on iOS Safari. This, along with throttled frame rate, explains why most webapps don't feel smooth on iOS vs their native counterparts.

TODO: good pattern, to document better:

```ts
if (events.mousemove != null) {
  // when scrolling (which might schedule a render), a container's mousemove doesn't trigger, so the pointer's local coordinates are stale
  // this means we should only use pointer's global coordinates, which is always right (thus the subtraction of scroll)
  pointer.x = events.mousemove.pageX - /*toGlobal*/ window.scrollX
  pointer.y = events.mousemove.pageY - /*toGlobal*/ window.scrollY
  // btw, pointer can exceed document bounds, e.g. dragging reports back out-of-bound, legal negative values
}
```
