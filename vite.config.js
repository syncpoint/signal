import path from 'path'
import { defineConfig } from 'vite'

const libraryName = 'signal'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'lib/signal.js'),
      name: libraryName,
      fileName: (format) => `${libraryName}.${format}.js`
    }
  }
})
