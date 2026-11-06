import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'backend']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      // Without the React plugin, plain no-unused-vars flags every component
      // and icon that is only referenced from JSX.
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react/prop-types': 'off',
    },
  },
  {
    // A context file exporting its provider alongside its `use*` hook is the
    // idiomatic shape; fast refresh handles it fine when the hook is named.
    files: ['src/contexts/*.jsx'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowExportNames: ['useAuth', 'useSite', 'useTheme'] },
      ],
    },
  },
])
