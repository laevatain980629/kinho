import { defineConfig } from '@tarojs/cli'
import path from 'path'

export default defineConfig({
  projectName: 'kinho-mobile',
  date: '2026-05-02',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false,
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
    'react': path.resolve(__dirname, '..', 'node_modules', 'react'),
    '@kinho/shared-types': path.resolve(__dirname, '..', '..', '..', 'packages', 'shared-types', 'src'),
    '@kinho/workflow': path.resolve(__dirname, '..', '..', '..', 'packages', 'workflow', 'src'),
  },
  mini: {
    outputRoot: 'dist-weapp',
    webpackChain(chain) {
      chain.module
        .rule('script')
        .include
          .add(path.resolve(__dirname, '..', '..', '..', 'packages'))
          .end()
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    outputRoot: 'dist-h5',
    publicPath: '/',
    staticDirectory: 'static',
    router: {
      mode: 'hash',
    },
    webpackChain(chain) {
      chain.module
        .rule('script')
        .include
          .add(path.resolve(__dirname, '..', '..', '..', 'packages'))
          .end()
    },
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
})
