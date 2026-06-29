module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@/components': './src/presentation/components',
            '@/services': './src/infrastructure',
            '@/hooks': './src/presentation/hooks',
            '@/store': './src/presentation/store',
            '@/types': './src/core/types',
            '@': './src',
          },
        },
      ],
    ],
  };
};
