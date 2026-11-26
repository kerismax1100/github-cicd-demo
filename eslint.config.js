import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      eqeqeq: 'error', // Thực thi các phép so sánh bằng nghiêm ngặt
      'prefer-const': 'error', // Khuyến khích sử dụng const thay vì let khi biến không được gán lại
    },
  },
];
