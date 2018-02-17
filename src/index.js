import React from 'react';
import ReactDOM from 'react-dom';
import App from 'components/App';
import { injectGlobal } from 'emotion'

// Global CSS injection
injectGlobal`
  html {
    overflow-y: scroll;
    box-sizing: border-box;
    font-size: 100%;
  }

  *, *:before, *:after {
    box-sizing: border-box;
  }

  body,html {
    overflow-x: hidden;
  }

  body {
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Open Sans","Helvetica Neue",sans-serif;
    letter-spacing: 0;
    font-weight: 400;
    font-style: normal;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -moz-font-feature-settings: "liga" on;
    font-feature-settings: "liga" on;
    color: #333;
    line-height: 1.4;

    margin: 0;
    padding: 1em;
  }
`;

ReactDOM.render(<App />, document.getElementById('root'));
