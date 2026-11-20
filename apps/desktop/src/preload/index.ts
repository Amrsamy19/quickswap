import { contextBridge } from 'electron';
import { quickswapAPI } from './api';

// Expose safe, typed API to renderer with strict context isolation
contextBridge.exposeInMainWorld('quickswapAPI', quickswapAPI);
contextBridge.exposeInMainWorld('accountHubAPI', quickswapAPI);
