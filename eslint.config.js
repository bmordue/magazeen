import globals from "globals";
import pluginJs from "@eslint/js";
import pluginJest from "eslint-plugin-jest";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        performance: "readonly",
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  pluginJs.configs.recommended,
  {
    files: ["test/**/*.js"],
    ...pluginJest.configs["flat/recommended"],
    rules: {
        ...pluginJest.configs["flat/recommended"].rules,
        // Allow skipped tests during development
        'jest/no-disabled-tests': 'off',
    },
     languageOptions: {
        globals: {
            ...globals.jest,
            performance: "readonly",
        }
     }
  }
];
