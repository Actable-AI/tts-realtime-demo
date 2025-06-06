import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
	:root {
		font-family: Nato Sans, Inter, Avenir, Helvetica, Arial, sans-serif;
		font: var(--font-m);

		color-scheme: light;
		color: var(--secondary-color);
		background-color: var(--bg-color);

		font-synthesis: none;
		text-rendering: optimizeLegibility;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		-webkit-text-size-adjust: 100%;
	}


	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	* ::-webkit-scrollbar {
		width: 5px;
		height: 5px;
	}

	* ::-webkit-scrollbar-track {
		background: transparent;
	}

	* ::-webkit-scrollbar-thumb {
		background: #c2c2c2;
		border-radius: 5px;
	}

	* ::-webkit-scrollbar-thumb:hover {
		background: #555555;
	}

	textarea,
	select,
	input,
	button {
		background: none;
		border: none;
		outline: none;
		margin: 0;
		font: inherit;
	}

	body {
		min-height: 100dvh;
	}


	a {
		text-decoration: none;
		color: var(--link-color);
		transition: var(--timing-s);

		&:hover {
			color: var(--link-hover-color)
		}

		&:active {
			color: var(--link-color);
		}
	}

	::selection {
		color: var(--secondary-inverted-color);
		background: var(--primary-color);
	}

	:root {
		--font-family-primary: 'Nato Sans', sans-serif;

		--font-size-xs: 0.6rem;
		--font-line-height-xs: 1.2rem;
		--font-xs: var(--font-size-xs) / var(--font-line-height-xs) var(--font-family-primary);

		--font-size-s: 0.8rem;
		--font-line-height-s: 1.4rem;
		--font-s: var(--font-size-s) / var(--font-line-height-s) var(--font-family-primary);

		--font-size-m: 1rem;
		--font-line-height-m: 1.6rem;
		--font-m: var(--font-size-m) / var(--font-line-height-m) var(--font-family-primary);

		--font-size-l: 1.2rem;
		--font-line-height-l: 1.8rem;
		--font-l: var(--font-size-l) / var(--font-line-height-l) var(--font-family-primary);

		--font-size-xl: 1.8rem;
		--font-line-height-xl: 2.4rem;
		--font-xl: var(--font-size-xl) / var(--font-line-height-xl) var(--font-family-primary);

		--font-size-xxl: 2rem;
		--font-line-height-xxl: 2.6rem;
		--font-xxl: var(--font-size-xxl) / var(--font-line-height-xxl) var(--font-family-primary);

		--font-size-xxxl: 3.5rem;
		--font-line-height-xxxl: 4.1rem;
		--font-xxxl: var(--font-size-xxxl) / var(--font-line-height-xxxl) var(--font-family-primary);

		--font-size-xxxxl: 4rem;
		--font-line-height-xxxxl: 4.6rem;
		--font-xxxxl: var(--font-size-xxxl) / var(--font-line-height-xxxl) var(--font-family-primary);


		--spacing-xxs: 0.1rem;
		--spacing-xs: 0.4rem;
		--spacing-s: 0.8rem;
		--spacing-m: 1.2rem;
		--spacing-l: 1.6rem;
		--spacing-xl: 2.5rem;
		--spacing-xxl: 3.2rem;

		--border-radius-xs: 2px;
		--border-radius-s: 4px;
		--border-radius-m: 8px;
		--border-radius-l: 20px;
		--border-radius-xl: 40px;

		--timing-s: 0.1s;
		--timing-m: 0.2s;
		--timing-l: 0.6s;
		--timing-xl: 1s;
		--timing-xxl: 3s;

		--header-z-index: 9;
		--island-z-index: 10;
		--microphone-z-index: 10;
		--microphone-element-z-index: 11;

		/* @media (prefers-color-scheme: light) { */
		--bg-color: #ffffff;
		--bg-dark-color: #121212;
		--bg-ghost-color: #0000005e;
		--bg-dark-secondary-color: #222222;
		--paper-bg-color: #eeeeee;
		--paper-bg-secondary-color: #fafafa;
		--paper-border-color: #c0c0c0;
		--nav-bar-bg-color: #ffffff6b;

		--paper-shadow: 0 0 5px 1px var(--ghost-inverted-color);

		--primary-color: #00CAE7;
		--primary-color-dark: #0085A0;

		--secondary-color: #111111;
		--secondary-inverted-color: #ffffff;

		--tertiary-color: #7a7a7a;
		--tertiary-inverted-color: #ffffffa6;

		--ghost-color: #ffffff47;
		--ghost-inverted-color: #00000047;

		--warning-color: #c48900;
		--danger-color: #ff4d4f;
		
		--input-bg-color: transparent;
		--input-bg-hover-color: #cacaca18;
		--input-bg-active-color: #cacaca34;
		
		--input-border-color: #e4e4e7;
		--input-border-focus-color: #d3d3d3;
		--input-border-hover-color: #e4e4e7;
		
		--input-disabled-color: #11111140;

		--link-color: #00CAE7;
		--link-hover-color: #00a6c0;

		--message-bg-first-color: #5c43205e;
		--message-bg-second-color: #1d285a5e;

		/* } */
	}
`;

export { GlobalStyles };
