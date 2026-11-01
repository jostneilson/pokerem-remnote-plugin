// Host simulator: real widgets + a fake SDK, in iframes using RemNote's real sandbox flags.
const fs = require('fs');
const path = require('path');
const { optimize } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const original = require('../../webpack.config.js');

const PORT = 8082;
const widgets = path.resolve(__dirname, '../../src/widgets');

module.exports = {
  ...original,
  entry: {
    index: path.join(widgets, 'index.tsx'),
    pokerem_sidebar: path.join(widgets, 'pokerem_sidebar.tsx'),
    pokerem_queue_strip: path.join(widgets, 'pokerem_queue_strip.tsx'),
    pokerem_encounter_popup: path.join(widgets, 'pokerem_encounter_popup.tsx'),
  },
  resolve: {
    ...original.resolve,
    alias: { '@remnote/plugin-sdk': path.resolve(__dirname, 'sdk-shim.tsx') },
  },
  output: {
    path: path.resolve(__dirname, '../../.preview-dist/hostsim'),
    filename: '[name].js',
    // Lazy chunks must load by absolute URL: srcdoc iframes have no base URL of their own.
    publicPath: `http://127.0.0.1:${PORT}/`,
  },
  plugins: original.plugins
    .filter((p) => !['HtmlWebpackPlugin', 'BannerPlugin', 'ReactRefreshPlugin'].includes(p.constructor.name))
    .concat(
      new HtmlWebpackPlugin({ templateContent: fs.readFileSync(path.resolve(__dirname, 'host.html'), 'utf8'), inject: false, minify: false }),
      // Bundles are inlined into srcdoc frames, so lazy screens cannot be separate files.
      new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ),
  devServer: {
    host: '127.0.0.1',
    port: PORT,
    hot: false,
    liveReload: false,
    client: false,
    open: false,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  devtool: false,
  optimization: { minimize: false },
  performance: { hints: false },
};
