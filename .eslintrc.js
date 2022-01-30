module.exports = {
  root: true,
  env: {
    'node': true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
  ],
  ignorePatterns: ["webpack.config.js"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "no-async-promise-executor": "off",
    "no-useless-escape": ["off"],
    "no-prototype-builtins": ["off"],
    "no-mixed-spaces-and-tabs": 0,
    "@typescript-eslint/no-inferrable-types": ["off", { "args": "none" }]
  }
};
