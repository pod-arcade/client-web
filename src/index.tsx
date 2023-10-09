import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import DesktopsPage from './pages/desktops';
import SessionPage from './pages/session';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <DesktopsPage />,
      },
      {
        path: 'desktops/:desktopId',
        element: <SessionPage />,
      },
    ],
  },
  {
    path: '/oidc-callback',
    element: <App />,
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<RouterProvider router={router} />);
