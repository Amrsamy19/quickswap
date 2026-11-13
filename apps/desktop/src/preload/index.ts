import { contextBridge } from 'electron';
import { accountHubAPI } from './api';

// Expose safe, typed API to renderer with strict context isolation
contextBridge.exposeInMainWorld('accountHubAPI', accountHubAPI);
