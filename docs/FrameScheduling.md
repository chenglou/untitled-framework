# Frame Scheduling

Reliable website to test your screen's refresh rate: https://www.testufo.com. Usually, a monitor renders from 30 frames per second (fps) to 240fps, which means `1000 / 30 = 33.3` ms to `1000 / 240 = 4.17` ms per frame. On, say, a MacBook (120fps), you've got `1000 / 120 = 8.33` ms to receive input, calculate new state, and render.

Software layers on top of the hardware can also change the fps:

- To save battery, systems like Low Battery Mode (iOS and macOS) might render at a lower fps.
- on iOS, Safari throttles fps to 60 by default (enable 120fps on iPhone Pro [this way](https://apple.stackexchange.com/questions/454421/enabling-120-fps-on-mobile-safari)).
- As of today, after certain gestures like scroll swipe, iOS Safari throttles fps to a lower value for a second or so. (TODO: verify if this is still true, and which gestures).

To schedule the JS logic to happen before the render phase of the frame, the recommended way is generally `requestAnimationFrame` (`rAF`).

Paul Irish has a good article on the life time of a frame, and where `rAF` happens: https://medium.com/@paul_irish/requestanimationframe-scheduling-for-nerds-9c57f7438ef4

Essentially:

- Calling `rAF` inside event callbacks (both browser and react events) schedules the `rAF` callback to the _same_ frame as the event that happened.
- `rAF` inside another `rAF` is executed next frame. This can recurse.

## Gotchas

`rAF`'s parameter is a timestamp which differs from getting the current time with `performance.now()` ([source](https://x.com/nomsternom/status/1853687984266055983)). Use the former. If not available, use `document.timeline.currentTime`. They're always the same value.

Specifically for React:

- As of React 18, all `setState`s are batched (https://github.com/reactwg/react-18/discussions/21).
- Calling `setState` inside a `rAF` inside an event handler makes the state update happen on the _next_ frame. [Demo](https://tinyurl.com/4yz8nes8). [Source](https://github.com/facebook/react/issues/31634#issuecomment-2500890102).

[Extra in-depth article on iOS game frame timing](https://web.archive.org/web/20210513101414/https://www.gamasutra.com/blogs/KwasiMensah/20110211/88949/Game_Loops_on_IOS.php) if you're interested. Generally applicable elsewhere.
