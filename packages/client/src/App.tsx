import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TablePage from './pages/TablePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/*
        .app-frame keeps the game upright. On a phone held in landscape it
        rotates the play area into a full-size portrait frame (see index.css);
        everywhere else it is a transparent passthrough.
      */}
      <div className="app-frame">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/table/:roomId" element={<TablePage />} />
        </Routes>
      </div>
    </div>
  );
}
