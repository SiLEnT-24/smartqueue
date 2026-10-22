import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider, ToastProvider } from './context/ThemeToast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider><ToastProvider><AuthProvider><SocketProvider><App /></SocketProvider></AuthProvider></ToastProvider></ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
