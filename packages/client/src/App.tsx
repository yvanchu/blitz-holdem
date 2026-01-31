import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TablePage from './pages/TablePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/table/:roomId" element={<TablePage />} />
      </Routes>
    </div>
  );
}
