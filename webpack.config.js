const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const libraryName = '@syncpoint/signal'

module.exports = {
  mode: 'production',
  entry: './lib/signal.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    globalObject: 'this',
    library: {
      name: libraryName,
      type: 'umd'
    }
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({ extractComments: false })
    ]
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: { loader: 'babel-loader' }
      }
    ]
  }
}
