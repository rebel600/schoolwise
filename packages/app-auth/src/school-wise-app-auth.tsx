// packages/app-auth/src/school-wise-app-auth.tsx
import React from "react";

import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";

import App from "./App";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: App, // Single-spa mounts App into the container automatically
  errorBoundary(err: Error): React.ReactElement {
    return (
      <div className="p-4 text-red-500">Auth App error: {err.message}</div>
    );
  },
});

// Export individual lifestyle targets
export const { bootstrap, mount, unmount } = lifecycles;

// Crucial default export mapping for dynamic runtime loading
export default lifecycles;
