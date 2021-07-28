module.exports = {
  presets: [
    '@vue/app',
    [
      '@vue/babel-preset-jsx',
      {
        compositionAPI: true,
        functional: false,
        injectH: false,
        vModel: true,
        vOn: false
      }
    ]
    // ['es2015', { 'modules': false }]
  ],
  'plugins': [
    '@babel/plugin-proposal-optional-chaining',
    [
      'component',
      {
        'libraryName': 'element-ui',
        'styleLibraryName': 'theme-chalk'
      }
    ]
  ]
}
