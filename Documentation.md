# Screen Sizing

What doesn't work:

- `<meta name="viewport" content="minimal-ui">`: [removed in iOS 8](https://stackoverflow.com/questions/18793072/impossible-to-hide-navigation-bars-in-safari-ios-7-for-iphone-ipod-touch)

Input focus keyboard goes up white part below

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

- Philosophically, we'd like to preserve as much runtime dynanism as possible (aka "late binding"). For example, maybe the theme color (status bar) varies depending on the page shown, or scroll position. Then we'd programmatically change that `meta` tag, which wouldn't be possible if we wrote a constant in `manifest.json`.
- `manifest.json` is yet another file that's sometime not refreshed due to browser's over-aggressive caching. The fewer attributes we stuff in it, the less development & production stateless we have to deal with.

However, we do need `manifest.json` for one single attribute: `start_url`, which specifies the URL to open when the webapp is opened from the home screen. This one doesn't have a `meta` tag counterpart.

But the simple presence of the manifest file overrides/ignores the tag `<meta name="apple-mobile-web-app-capable" content="yes" />` and `<meta name="mobile-web-app-capable" content="yes" />` on iOS. So to ensure our app doesn't have the browser UI when bookmarked, we need to specify `"display": "standalone"` in the manifest too, in which case we should avoid redundancy and remove those 2 meta tags.

Note that `start_url` and `display`\*, contrary to most others attributes, are only read once, when the webapp's bookmarked on home screen. Even if their value changes, the bookmark won't pick them up.

\* This applies to `name` too (and its `meta` counterpart `apple-mobile-web-app-title` and `mobile-web-app-title`).
