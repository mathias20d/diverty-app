import React from 'react';
import { createRoot } from 'react-dom/client';
import BusinessGate from './modules/business/BusinessGate.jsx';
import './index.css';
import './modules/business/business.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><BusinessGate /></React.StrictMode>);
