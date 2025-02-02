import app from './index.html'

const manifest = JSON.stringify({
  start_url: '/',
  display: 'standalone',
  name: 'fack',
})

const manifestHTML = `
<link rel="manifest" href="data:application/manifest+json,${encodeURIComponent(manifest)}">
`

const projectRoot = `${import.meta.dir}/..`

const server = Bun.serve({
  port: 8888,
  development: true,
  static: {
    '/': app,
  },
  async fetch(req) {
    return new Response(`Hit fetch ${req.url}`)
    // console.log(`Fetching: ${req.url}`)

    // const requestPath = new URL(req.url).pathname

    // switch (requestPath) {
    //   case '/':
    //     return new Response(Bun.file(`${projectRoot}/dist/index.html`))
    //   default:
    //     return new Response(Bun.file(`${projectRoot}/dist/${requestPath}`))
    // }
  },
})

console.log(`Serving at http://localhost:${server.port}`)
