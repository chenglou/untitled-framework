# Screen Sizing

What doesn't work:

- `<meta name="viewport" content="minimal-ui">`: [removed in iOS 8](https://stackoverflow.com/questions/18793072/impossible-to-hide-navigation-bars-in-safari-ios-7-for-iphone-ipod-touch)

Input focus keyboard goes up white part below

TODO: safe area, sometime doesn't work. Forgot why

# Remove Browser UI

When your app is bookmarked on home screen, here's how to remove the surrounding browser UI:

- If you have a `manifest.json` file (see Manifest File section below), add `"display": "standalone"` to it (iOS only supports `"standalone"` and `"browser"`).
- Otherwise, add `<meta name="apple-mobile-web-app-capable" content="yes" />` and `<meta name="mobile-web-app-capable" content="yes" />` to your HTML `<head>`.

The latter way has a drawback: for the bookmarked app, the browser UI will only hide when the URL is what the user bookmarked. So if you change URL by navigating to another page (including navigating to some external site for e.g. login, payment), the UI will show up again. There's currently no solution to this.

Addendum: with the latter `meta` tags method, technically, with our routing system, we can detect whether we're in bookmarked mode with `window.navigator.standalone === true`, and simply never switch URL again apart from the needed third-party URLs. Since our URL source of truth is our internal data structure and not the address bar, this doesn't break things (the one time we treat address bar as source of truth is when the user operates on it, which isn't possible in browser UI-less mode).

# Status Bar

`<meta name="theme-color" content="rgbColorHere">`. Works only in standalone display mode.

## What doesn't work:

`-webkit-fill-available`: TODO
`viewport-fit=cover`: TODO maybe

How to get rid of the iOS Safari browser UI: if you use the Share button → Add to Home Screen, you can bookmark the webapp to Home.

# Routing

TODO

# Scrolling

TODO scrollTop, async, interpolation

# Frame Rate

TODO safari, iphone, iphone pro, frame catchup, scrolling, pointer fuzziness, web animation/css

# Manifest File

The [Web Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) `manifest.json` file declares attributes about the webapp: its name on the phone/tablet's home screen, icon, its starting URL, etc. We specify it with `<link rel="manifest" href="path/to/manifest.json" />`.

Many of the manifest attributes have their HTML `<meta ... />` tag counterparts. Whenever possible, we prefer the `meta` tags for 2 reasons:

- Philosophically, we'd like to preserve as much runtime dynanism as possible. For example, maybe the theme color (status bar) varies depending on the page shown, or scroll position. Then we'd programmatically change that `meta` tag, which wouldn't be possible if we wrote a constant in `manifest.json`. You can technically inline the manifest file like so: `<link rel="manifest" href="data:application/manifest+json,${encodeURIComponent({a: b})" />`, but we don't know if various systems, e.g. Android PWA, picks this up intead of looking for the `manifest` file. Also, NextJS currently doesn't behavior well with this for some reason.
- `manifest.json` is yet another file that's sometime not refreshed due to browser's over-aggressive caching. The fewer attributes we stuff in it, the less development & production stateless we have to deal with.

However, we do need `manifest.json` for one single attribute: `start_url`, which specifies the URL to open when the webapp is opened from the home screen. This one doesn't have a `meta` tag counterpart.

But the simple presence of the manifest file **always overrides** the tag `<meta name="apple-mobile-web-app-capable" content="yes" />` and `<meta name="mobile-web-app-capable" content="yes" />` on iOS. So to ensure our app doesn't have the browser UI when bookmarked, we need to specify `"display": "standalone"` in the manifest too, in which case we should avoid redundancy and remove those 2 meta tags.

Note that `start_url` and `display`\*, contrary to most others attributes, are only read once, when the webapp's bookmarked on home screen. Even if their value changes, the bookmark won't pick them up.

\* This applies to `name` too (and its `meta` counterpart `apple-mobile-web-app-title` and `mobile-web-app-title`).

# Render Frame Scheduling

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

`rAF`'s parameter is a timestamp which differs from getting the current time with `performance.now()` ([source](https://x.com/nomsternom/status/1853687984266055983)). Use the former.

Specifically for React:

- As of React 18, all `setState`s are batched (https://github.com/reactwg/react-18/discussions/21).
- Calling `setState` inside a `rAF` inside an event handler makes the state update happen on the _same_ frame too, thankfully. [Demo](https://tinyurl.com/5n6cku67).

[Extra in-depth article on iOS game frame timing](https://web.archive.org/web/20210513101414/https://www.gamasutra.com/blogs/KwasiMensah/20110211/88949/Game_Loops_on_IOS.php) if you're interested. Generally applicable elsewhere.

# Events

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

This colocation of disparate events costs so little that we default to this pattern, for easier code evolution.
