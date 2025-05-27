import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Navbar from './components/UI/Navbar';
import Footer from './components/UI/Footer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import './App.css';
import Students from "./pages/Students";
import CreateCourse from "./pages/CreateCourse";
import VideoCall from "./pages/VideoCall";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Здесь можно добавить загрузку дополнительных данных пользователя
        // Например: const userDoc = await getUserData(user.uid);
        // setUserData(userDoc.data());
      }
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="app-loading">
          <LoadingSpinner />
          <p>Загрузка приложения...</p>
        </div>
    );
  }

  return (
      <Router>
        <div className="app-container">
          {user && <Navbar user={user} />}
          <main className="main-content">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
              <Route path="/create-course" element={<CreateCourse user={user} />} />
              <Route path="/video-call/:courseId" element={<VideoCall user={user} />} />
              <Route path="/assignments/:courseId" element={user ? <Assignments user={user} /> : <Navigate to="/login" />} />
              <Route path="/chat/:courseId" element={user ? <Chat user={user} /> : <Navigate to="/login" />} />
              <Route path="/admin" element={user?.role === 'admin' ? <Admin user={user} /> : <Navigate to="/" />} />
              <Route path="/students/:courseId" element={user ? <Students user={user} /> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
  );
}

export default App;