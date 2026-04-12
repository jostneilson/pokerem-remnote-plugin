const { resolve } = require('path');
const path = require('path');
const fs = require('fs');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const { ProvidePlugin, BannerPlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const CopyPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';
const isDevelopment = !isProd;

const fastRefresh = isDevelopment ? new ReactRefreshWebpackPlugin() : null;

const SANDBOX_SUFFIX = '-sandbox';

/**
 * Explicit widget entrypoints only — do not use a directory glob.
 * A glob would bundle any stray `.tsx` under `src/widgets/` (e.g. old Ankimon-era files
 * someone still has locally) and ship them in `dist/` / `PluginZip.zip`.
 */
const WIDGET_ENTRY_FILES = [
  'index.tsx',
  'pokerem_sidebar.tsx',
  'pokerem_queue_strip.tsx',
  'pokerem_encounter_popup.tsx',
];

function buildWidgetEntries() {
  const widgetsDir = resolve(__dirname, 'src/widgets');
  const obj = {};
  for (const file of WIDGET_ENTRY_FILES) {
    const abs = path.join(widgetsDir, file);
    if (!fs.existsSync(abs)) {
      throw new Error(`[webpack] Missing required widget entry: ${file} (expected ${abs})`);
    }
    const rel = file.replace(/\.[tj]sx?$/i, '').replace(/\\/g, '/');
    obj[rel] = abs;
    obj[`${rel}${SANDBOX_SUFFIX}`] = abs;
  }
  return obj;
}

const config = {
  mode: isProd ? 'production' : 'development',
  entry: buildWidgetEntries(),

  output: {
    path: resolve(__dirname, 'dist'),
    filename: `[name].js`,
    publicPath: '',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|jsx|js)?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2020',
          minify: false,
        },
      },
      {
        test: /\.css$/i,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { url: false } },
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: [
    isDevelopment
      ? undefined
      : new MiniCssExtractPlugin({
          filename: '[name].css',
        }),
    new HtmlWebpackPlugin({
      templateContent: `
      <body></body>
      <script type="text/javascript">
      const urlSearchParams = new URLSearchParams(window.location.search);
      const queryParams = Object.fromEntries(urlSearchParams.entries());
      const widgetName = queryParams["widgetName"];
      if (widgetName == undefined) {document.body.innerHTML+="Widget ID not specified."}

      const s = document.createElement('script');
      s.type = "module";
      s.src = widgetName+"${SANDBOX_SUFFIX}.js";
      document.body.appendChild(s);
      </script>
    `,
      filename: 'index.html',
      inject: false,
    }),
    new ProvidePlugin({
      React: 'react',
      reactDOM: 'react-dom',
    }),
    new BannerPlugin({
      banner: (file) => {
        // html-webpack-plugin and other assets may call this with no chunk — avoid null.includes
        const name = file.chunk?.name;
        if (name == null || typeof name !== 'string') return '';
        return !name.includes(SANDBOX_SUFFIX) ? 'const IMPORT_META=import.meta;' : '';
      },
      raw: true,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'public',
          to: '',
          globOptions: {
            // Avoid shipping macOS metadata into dist/ (parity with clean CI checkouts).
            ignore: ['**/.DS_Store', '.DS_Store'],
          },
        },
        { from: 'README.md', to: '' },
      ],
    }),
    fastRefresh,
  ].filter(Boolean),
};

if (isProd) {
  config.optimization = {
    minimize: isProd,
    minimizer: [new ESBuildMinifyPlugin()],
  };
} else {
  // for more information, see https://webpack.js.org/configuration/dev-server
  config.devServer = {
    port: 8080,
    open: true,
    hot: true,
    compress: true,
    // Include public/ so logo.svg / logo.png edits reload without restarting dev server.
    watchFiles: ['src/**/*', 'public/**/*'],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'baggage, sentry-trace',
    },
  };
}

module.exports = config;
