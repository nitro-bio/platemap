# Nitro Platemap

![CleanShot 2025-01-28 at 14 52 05@2x](https://github.com/user-attachments/assets/92be9bcd-1069-40d0-a73e-b69512d715fd)

## Quickstart

This component requires the `@nitro-bio/platemap` package. Install it via:

```sh
npm i @nitro-bio/platemap@latest
```

And either add it to your tailwind config

```js
const colors = require("tailwindcss/colors");
export default {
  darkMode: "class",
  content: [
	...
    "./node_modules/@nitro-bio/platemap/dist/nitro-platemap.es.js",
  ],
  theme: {
	...
    extend: {
	  ...
      colors: {
	    ...
        brand: colors.emerald,
        noir: colors.zinc,
      },
    },
  },
  plugins: [],
};
```

or import the css file

```js
import "path/to/node_modules/@nitro-bio/platemap/dist/nitro-platemap.css";
```
