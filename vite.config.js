import path from 'path'
import { defineConfig } from 'vite'

const entry = path.resolve(__dirname, 'lib/index.js')
const name = 'signal'
const lib = { entry, name, formats: ['es'] }
const build = { lib, sourcemap: true }

export default defineConfig({ build })
