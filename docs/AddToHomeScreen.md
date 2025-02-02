# Add To Home Screen

In e.g. iOS Safari, tapping the Share button → Add to Home Screen bookmarks the webapp to your home. Folks nowadays rarely do so, but it does offer a more native feel. Android has this feature too.

# Remove Browser UI

When your app is bookmarked on home screen, here's how to remove the surrounding browser UI:

- If you have a `manifest.json` file (see Manifest File section below), add `"display": "standalone"` to it (iOS only supports `"standalone"` and `"browser"`).
- Otherwise, add `<meta name="apple-mobile-web-app-capable" content="yes" />` and `<meta name="mobile-web-app-capable" content="yes" />` to your HTML `<head>`.

The latter way has a drawback: for the bookmarked app, the browser UI will only hide when the URL is what the user bookmarked. So if you change URL by navigating to another page (including navigating to some external site for e.g. login, payment), the UI will show up again. There's currently no solution to this.

## Manifest File

The [Web Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) `manifest.json` file declares attributes about the webapp: its name on the phone/tablet's home screen, icon, its starting URL, etc. We specify it with `<link rel="manifest" href="path/to/manifest.json" />`.

Many of the manifest attributes have their HTML `<meta ... />` tag counterparts. Whenever possible, we prefer the `meta` tags for 2 reasons:

- Philosophically, we'd like to preserve as much runtime dynanism as possible. For example, maybe the theme color (status bar) varies depending on the page shown, or scroll position. Then we'd programmatically change that `meta` tag, which wouldn't be possible if we wrote a constant in `manifest.json`. You can technically inline the manifest file like so: `<link rel="manifest" href="data:application/manifest+json,${encodeURIComponent({a: b})" />`, but we don't know if various systems, e.g. Android PWA, picks this up intead of looking for the `manifest` file. Also, NextJS currently doesn't behavior well with this for some reason.
- `manifest.json` is yet another file that's sometime not refreshed due to browser's over-aggressive caching. The fewer attributes we stuff in it, the less development & production stateless we have to deal with.

However, we do _require_ `manifest.json` for one single attribute: `start_url`, which specifies the URL to open when the webapp is opened from the home screen. This one doesn't have a `meta` tag counterpart.

But the simple presence of the manifest file **always overrides** the tag `<meta name="apple-mobile-web-app-capable" content="yes" />` and `<meta name="mobile-web-app-capable" content="yes" />` on iOS. So to ensure our app doesn't have the browser UI when bookmarked, we need to specify `"display": "standalone"` in the manifest too, in which case we should avoid redundancy and remove those 2 meta tags from HTML.

Note that `start_url` and `display`\*, contrary to most others attributes, are only read once, when the webapp's bookmarked on home screen. Even if their value changes, the bookmark won't pick them up.

\* This applies to `name` too (and its `meta` counterpart `apple-mobile-web-app-title` and `mobile-web-app-title`).

## Status Bar (Section Under Construction)

`<meta name="theme-color" content="rgbColorHere">`. Works only in "standalone" display mode.

### What doesn't work:

`-webkit-fill-available`: TODO
`viewport-fit=cover`: TODO maybe

## Screen Sizing (Section Under Construction)

_Section under construction_

### What doesn't work:

- `<meta name="viewport" content="minimal-ui">`: [removed in iOS 8](https://stackoverflow.com/questions/18793072/impossible-to-hide-navigation-bars-in-safari-ios-7-for-iphone-ipod-touch)

Input focus keyboard goes up white part below

Mobile Safari device rotation: https://x.com/_chenglou/status/1605796073829646336/photo/1

(maybe stale info?) proper window sizes: https://x.com/_chenglou/status/1579109784816877568/photo/1

ipad layout: https://x.com/_chenglou/status/1794348409899675870/photo/1

TODO: safe area, sometime doesn't work. Forgot why
