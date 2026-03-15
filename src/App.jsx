import React from 'react';
import Header from './components/Header';
import SimulatorPage from './components/SimulatorPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <SimulatorPage />
      </main>
    </div>
  );
}

export default App;
