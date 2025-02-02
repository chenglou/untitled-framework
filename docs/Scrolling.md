# Scrolling

This doc details as much as we know about scrolling on the web, so that folks don't trip on its longstanding pitfalls when programming trying to scroll and preventing scroll.

## Scroll Rubberbanding (Elastic Bounceback)

iOS, macOS and a few other platforms produce a pleseant bounce effect when a container scrolls past its bounds, to indicate the end of the content. This is a large, silent differentiator in making your app feel native, and a large, silent reason why a vocal minority dislikes Electron and other non-native apps. This UX, along with the now-famous "green bubble" effect, is one of the many premium-feeling Apple subtleties one has to familiarize themselves with in order to cross the chasm for Apple platform adoptions, especially when your app differentiates itself through premium feels.

Safari and Firefox (nowadays) both do rubberbanding on page and container scrolling. Chrome only does it for page scrolling. [Here's a very stale Chromium issue](https://issues.chromium.org/issues/41102897).

## Scroll Value & Quirks

`scrollTop` and others properties are the primary ways to get the content's scroll position. However:

1. The scroll event is fired asynchronously; by the time your JavaScript executes and you read `scrollTop`, the actual scroll position has already changed. Most hacky scroll logic assume the change isn't too bad and side-step this through design. \*
2. Despite rubberbanding, you can't programmatically set scrolling to a negative value to simulate scrolling past the beginning/end of content.
3. The scrolling value can be a floating point, but `scrollTop` exposed to us is a rounded-down integer on Safari & Firefox. On Chrome, it's a floating point rounded down to `0.5` (e.g. `1.4` → `1`, `1.6` → `1.5`). \*\*
4. Setting `scrollTop` to the same value doesn't trigger a scroll event. However, "same value" seem to mean the final read value of `scrollTop`. Aka setting scrollTop to `10.4` then `10.5` don't trigger a second scroll event for Safari & Firefox (since they both become `10`), but will on Chrome (becomes `10.5`). This also means that programmatically scrolling smoothly over time is janky, as we're setting a scroll value that's a coarser than what the browser natively does.
5. Scroll event's source can be: user scroll, dragging the scroll bar, pressing space/up/down, dragging in an item and auto scrolling, tabbing, programmatic, etc. There's no way to disambiguate them; if e.g. you're scrolling programmatically, you can set a state like `programmaticScroll = true`, call `scrollTo`, then in the scroll event check `programmaticScroll`. But this doesn't mean a native user scroll didn't happen!
6. Careful that the max `scrollTop` value, on some platform UIs, is influenced by, say, the presence of a horizontal scrollbar, since that might or might not take permanent space.

\* In fact, on certain platforms, such as macOS and iOS, JavaScript's execution is capped to 60fps (lower in certain cases, e.g. after some touches, low battery mode, etc.) while native scrolling happens at potentially 120fps, on GPU. So by the time JS reads that `scrollTop`, it might be way late.

\*\* This means preferrably, only _read_ `scrollTop` and don't use it to set a new scroll position. This is almost unavoidable for scroll anchoring, as you'd need the current scrollTop, the delta to adjust, then do `scrollTo({top: scrollTop + delta})`. Notice that if `delta` is some floating point, you'll end up with some anchor jitter if the user resizes browser smoothly/continuously, as the final scroll value is truncated and would keep jitter. E.g. continuously resizing might nudge the anchor lower and lower.

## Other Considerations

The scroll physics on various platforms, especially Apple, are intricate. For example, the scroll momentum accelerates the more you scroll. Compare that to Chrome's emulated scrolling, which doesn't.

If you try to reproduce the scrolling physics, you'd usually fall short (e.g. early React Native, Flutter, Zynga scroll). To this day there are only a handful of apps that reproduce them almost perfectly: Facebook Paper (RIP), Reeder, Chrome, etc.

## Use-Cases

Despite all this, some effects are only possible through programmatic manipulation of scrolling:

- Occlusion culling/virtualization, where we read `scrollTop` and determine only the elements that need to be shown on screen. `IntersectionObserver` is the usual proposed alternative, but it's also capped at JS framerate (see earlier) and is a bit yuckier in terms of API architecture, among other flaws.
- Scroll anchoring, where we keep a certain element stable while resizing container, when things above and below potentially change size and jitter said element around otherwise. `overflow-anchor` isn't yet a satisfying solution (no Safari support, etc.).
- Rendering to canvas, where you're reading `scrollTop`from a transparent DOM container somewhere else in order not to recreate your own scrolling logic. Keep in mind the `scrollTop` quirks above. You can try keeping an old & new `scrollTop` value and interpolate between them into a smoother one.

## Recreate Apple Scroll Physics

**Again, highly disrecommended**. But if you're gonna try (don't), might as well try properly.

iOS and macOS' scrolling physics have changed over time, but nowadays settled. The original scrolling decay & rubberbanding were done by Bas Ording on Macromedia Director, with roughly `0.99` multiplier per 1 milisecond (yep) for decay velocity and a series of exponentials for rubberbanding (**not a spring**). The implementation's [here](https://github.com/grp/XNAnimation/blob/508e6aa093765c214500ef022e4f34f3ea5653c0/Animations/XNScrollView.m). An idiomatic spring physics during rubberbanding would be more elegant & correct, but would feel slightly off vs folks' decade-long expectations.

## The Case For Main Thread Scrolling

The reason why browsers give you wrong & async `scrollTop` values is because, for smoothness, scrolling happens off-main-thread, separated from JS, so that userland JS doesn't jank scrolling. This approach made bad webapps not too bad, at the invisible, and (imo) heavy cost of:

- Preventing userland innovation on scroll-driven effects
- Causing folks to wrongly assume that `scrollTop` is correct, and make bad UI/UX using it anyway
- Causing standard committee to add a tremendous amount of hard-coded scroll effects in CSS, most of which only cater to particular scroll-driven effects.

This is the equivalent of standardizing fixed shader pipeline for WebGL/WebGPU, where standard decides what shapes you get to make, and how. For scrolling, the web's too far gone to fix this, but hopefully this serves as a lesson for future APIs.
