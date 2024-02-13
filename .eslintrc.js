module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'prettier',
	],
	extends: [
		'airbnb-base',
		'airbnb-typescript/base',
		"prettier"
	],
	env: {
		"es6": true,
		"node": true
	},
	parserOptions: {
		project: ['./tsconfig.json'],
		project: ['./tests/tsconfig.json'],
	},
	rules: {
		"prettier/prettier": "error",
		"import/prefer-default-export": "off",
		"no-bitwise": "off",
		"arrow-body-style": "off",
		"no-restricted-syntax": "off",
		"no-underscore-dangle": ["error", { "allowAfterThis": true }],
		"no-trailing-spaces": "error",
		"class-methods-use-this": "off",
		"no-return-await": "off",
		"@typescript-eslint/return-await": "off",
		"no-await-in-loop": "off",
		'no-plusplus': "off",
		'@typescript-eslint/no-throw-literal': 'off',
		"spaced-comment": ["error", "always", {
			"line": {
				"markers": ["#region", "#endregion"]
			}
		}],
	},

};