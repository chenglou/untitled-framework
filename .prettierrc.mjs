/** @type {import('prettier').Config} */
export default {
  printWidth: 120,
  semi: false,
  singleQuote: true,
  experimentalTernaries: true, // prettier v3 broke multi-ternaries. Enable this to fix it: https://prettier.io/blog/2023/11/13/curious-ternaries
}
