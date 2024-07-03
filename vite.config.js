import path from 'path'
import { defineConfig } from 'vite'

const entry = path.resolve(__dirname, 'lib/index.js')
const name = 'signal'
const fileName = format =>
  format === 'umd'
    ? `${name}.umd.cjs`
    : `${name}.es.js`

const lib = { entry, name, fileName }
const build = { lib }

export default defineConfig({ build })
