import React from 'react';
import logo from './logo.svg';
import './App.css';
import SearchBox from './components/searchbox';

function App () {
  return (
    <div className="App">
      <header className="App-header">
        Should I file a complaint?
        <SearchBox />
      </header>

    </div>
  );
}

export default App;
