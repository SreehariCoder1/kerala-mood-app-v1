import React from 'react'
import Login from './components/Login'
import DistrictMap from './components/DistrictMap'
import MoodNotification from './components/MoodNotification'
import Game from './components/Game/Game'



import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" />;
  }
  return children;
};

import GlobalChat from './components/Chat/GlobalChat';
import { useLocation } from 'react-router-dom';

const AppContent = () => {
  const location = useLocation();
  const isGame = location.pathname.startsWith('/game');

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <MoodNotification />
      <Routes>
        <Route path="/" element={<LoginWrapper />} />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <DistrictMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!isGame && <GlobalChat />}
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

// Wrapper to redirect if already logged in
const LoginWrapper = () => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/map" />;
  }
  return <Login />;
}


export default App