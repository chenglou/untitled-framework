# Untitled Framework

Prerequisite: [Bun](https://bun.sh)

```sh
git clone https://github.com/chenglou/untitled-framework.git
bun install
bun start
```

Then open `localhost:8888`

Check type & lint errors:

```sh
bun check
```

To test on iPhone:

- Get your IP, e.g. from macOS' System Settings -> Wi-Fi -> Details (of your current connection)
- Go to `http://<your-ip-here>:8888` on your phone

Optional: iOS 18 turns on 120fps requestAnimationFrame; for iOS and below, if you got an iPhone Pro, go to Settings → Apps → Safari → Advanced → Feature Flags → Prefer Page Rendering Updates Near 60fps (turn it off).

## Editor Configuration

Any editor works, but VSCode and Cursor are recommended.

- In VSCode/Cursor settings JSON, enable `"typescript.tsserver.experimental.enableProjectDiagnostics": true`. This will make TypeScript report all the errors project-wide, even for unopened files.
- <https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint> shows lint errors in the editor.
