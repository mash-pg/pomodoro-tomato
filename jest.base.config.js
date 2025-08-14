module.exports = {
  // Jestを実行する環境を指定。'jsdom'はブラウザ環境をエミュレートする
  // (例: Reactコンポーネントのテストに最適)
  testEnvironment: 'jsdom',

  // 各テストファイルの実行前に実行されるセットアップファイルを指定
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // モジュール名のエイリアスを設定
  // '@/'で始まるパスを'<rootDir>/src/'にマップする
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // 'isows'を特定のファイルパスにマップする
    '^isows$': '<rootDir>/node_modules/isows/_cjs/index.js',
  },

  // Jestがテストファイルと見なすファイルを指定
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx)',
    '<rootDir>/src/**/*.test.(ts|tsx)',
  ],

  // テストファイルの変換ルールを設定
  // .js, .jsx, .ts, .tsxファイルを'babel-jest'で変換し、
  // 'next/babel'プリセットを使用する
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // 変換をスキップするモジュールを指定
  // isows, @supabase, firebase 以外のnode_modules内のファイルは変換しない
  transformIgnorePatterns: [
    '/node_modules/(?!isows|@supabase|firebase|selenium-webdriver)', // selenium-webdriverを追加
  ],
};