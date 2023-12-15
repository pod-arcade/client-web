import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
} from 'react-router-dom';
import DesktopsPage from './pages/desktops';
import SessionPage from './pages/session';

// If running standalone (iOS or Chrome) use a memory router so it stays fullscreen.
const routerFactory =
  (('standalone' in window.navigator && window.navigator.standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches) &&
  location.pathname === '/' //don't use memory router if we're already on a subpage
    ? createMemoryRouter
    : createBrowserRouter;

const router = routerFactory([
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

document.addEventListener('gesturestart', e => {
  e.preventDefault();
});
