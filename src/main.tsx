import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { bootstrapFromLaunch } from './services/managerApi';
import './index.css';

// If launched from a Manager.io Custom Button, establish a session from the
// business/entity/key in the URL before the app renders. No-ops otherwise.
bootstrapFromLaunch().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
