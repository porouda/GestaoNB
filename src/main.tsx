import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

// Polyfill drag and drop for touch devices
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

console.log('React: Mounting application...');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
