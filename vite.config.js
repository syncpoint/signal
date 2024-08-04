import path from 'node:path'
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const entry = path.resolve(__dirname, 'lib/index.js')
const name = 'signal'
const lib = { entry, name, formats: ['es'] }
const build = { lib, sourcemap: true }

export default defineConfig({ build })
