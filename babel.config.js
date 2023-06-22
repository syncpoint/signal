module.exports = (api) => {
  // Cache configuration is a required option:
  api.cache(false)

  const presets = [
    [
      // @babel/preset-env is a smart preset that allows
      // you to use the latest JavaScript without needing
      // to micromanage which syntax transforms (and
      // optionally, browser polyfills) are needed by your
      // target environment(s). This both makes your life
      // easier and JavaScript bundles smaller!
      //
      '@babel/preset-env',
      {
        // useBuiltIns :: "usage" | "entry" | false (defaults)
        // This option configures how @babel/preset-env
        // handles polyfills.

        // false:
        // Don't add polyfills automatically per file,
        // and don't transform import "core-js" or import
        // "@babel/polyfill" to individual polyfills.
        //
        useBuiltIns: false
      }
    ]
  ]

  return { presets }
}
