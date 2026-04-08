// === backend/eslint.config.ts ===

import { globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import skipFormatting from 'eslint-config-prettier/flat'

export default tseslint.config(
  {
    name: 'app/files-to-lint',
    files: ['**/*.ts'],
  },

  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/generated/**',
    '**/coverage/**',
    'eslint.config.ts',
    'prisma.config.ts',
  ]),

  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  skipFormatting,
)
