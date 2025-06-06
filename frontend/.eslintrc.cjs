// eslint-disable-next-line no-undef
module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:i18next/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint', 'react-hooks', 'i18next'],

  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-param-reassign': 'off',
    'no-var': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'i18next/no-literal-string': [
      'error',
      {
        markupOnly: true,
        ignoreAttribute: [
          'alt',
          'autoComplete',
          'breakpoint',
          'color',
          'data-testid',
          'fill',
          'htmlType',
          'i18nKey',
          'language',
          'layout',
          'loading',
          'mode',
          'name',
          'okType',
          'optionType',
          'orientation',
          'placement',
          'PreTag',
          'rel',
          'shape',
          'size',
          'src',
          'target',
          'theme',
          'to',
          'trigger',
          'valuePropName',
          'variant',
          'viewBox',
          'xmlns',
        ],
      },
    ],
    'react/jsx-key': 'warn',
    'react/no-deprecated': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'typeLike',
        format: ['PascalCase'],
        custom: {
          regex: '^(T|P|Props|[A-Z][a-zA-Z0-9]*(Props|Type))$',
          match: true,
        },
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
        custom: {
          regex: '^[A-Z][a-zA-Z0-9]*Enum$',
          match: true,
        },
      },
      {
        selector: 'enumMember',
        format: ['camelCase'],
      },
    ],
  },
  overrides: [
    {
      files: ['**/generated/**/*.ts', '**/generated/**/*.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': ['off'],
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  globals: {
    IS_DEV: true,
  },
};
