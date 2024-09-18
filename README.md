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

## Editor Configuration

Any editor works, but VSCode and Cursor are recommended.

- In VSCode/Cursor settings JSON, enable `"typescript.tsserver.experimental.enableProjectDiagnostics": true`. This will make TypeScript report all the errors project-wide, even for unopened files.
- <https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint> shows lint errors in the editor.
