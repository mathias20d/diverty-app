import '../../src/index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import WebAdmin from '../../src/modules/web/WebAdmin.jsx';

const root = createRoot(document.getElementById('root'));
const db = {};
window.__renderAdmin = (uid = 'test-admin') => root.render(<WebAdmin db={db} appId="diverty-oficial" currentUser={{uid}} showAlert={message=>window.__messages.push(message)}/>);
window.__unmountAdmin = () => root.render(null);
window.__renderAdmin();
