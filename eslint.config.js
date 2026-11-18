// ESLint (TypeScript del frontend y del admin). Uso: npm run lint
// El formato sigue el estilo de WordPress (espacios dentro de paréntesis), que Prettier no produce:
// por eso no hay reglas de formato aquí.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: [ '**/dist/**', '**/node_modules/**', 'assets/**', 'vendor/**', 'admin/dist/**' ] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: [ 'frontend/src/**/*.ts' ],
		languageOptions: { globals: globals.browser },
		rules: {
			// Nunca innerHTML ni eval en el frontend (docs/06-seguridad.md).
			'no-restricted-properties': [ 'error', { property: 'innerHTML' }, { property: 'outerHTML', object: 'document' } ],
			'no-eval': 'error',
			'no-implied-eval': 'error',
		},
	},
	{
		files: [ 'admin/src/**/*.{ts,tsx}' ],
		languageOptions: { globals: globals.browser },
		plugins: { 'react-hooks': reactHooks },
		rules: {
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
		},
	},
	{
		rules: {
			'no-empty': [ 'error', { allowEmptyCatch: true } ],
			'@typescript-eslint/no-unused-vars': [ 'error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' } ],
		},
	}
);
