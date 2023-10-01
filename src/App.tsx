import React from 'react';
import './App.css';
import {MQTTConnectionProvider} from './hooks/useMqtt';
import {Outlet} from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <MQTTConnectionProvider>
        <Outlet />
      </MQTTConnectionProvider>
    </div>
  );
}

export default App;
