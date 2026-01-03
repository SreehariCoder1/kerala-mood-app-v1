import React from 'react'
import Login from './components/Login'
import DistrictMap from './components/DistrictMap'



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

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
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
        </Routes>
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