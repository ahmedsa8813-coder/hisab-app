import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ForemanSystem, ForemanManagePage } from './App6';

function Root() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("foreman") === "1") return <ForemanSystem />;
  if (params.get("manager") === "1") return <ForemanManagePage />;
  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
