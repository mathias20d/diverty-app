import React from 'react';
import { createRoot } from 'react-dom/client';
import WebAdmin from '../../src/modules/web/WebAdmin.jsx';

createRoot(document.getElementById('root')).render(<WebAdmin db={{}} appId="diverty-oficial" currentUser={{uid:'test-admin'}} showAlert={message=>window.__messages.push(message)}/>);
