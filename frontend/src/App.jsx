import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import MockInterview from './pages/MockInterview';
import MyRecordings from './pages/MyRecordings';
import Analytics from './pages/Analytics';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="resume" element={<ResumeUpload />} />
          <Route path="interview" element={<MockInterview />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="recordings" element={<MyRecordings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
