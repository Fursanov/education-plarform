import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {auth, db} from './services/firebase';
import { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import Chat from './pages/Chat';
import AdminPage from './pages/adminPages/AdminPage';
import Navbar from './components/UI/Navbar';
import Sidebar from './components/UI/Sidebar';
import Footer from './components/UI/Footer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import './App.css';
import Students from "./pages/Students";
import CreateCourse from "./pages/CreateCourse";
import VideoCall from "./pages/VideoCall";
import {doc, getDoc} from "firebase/firestore";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import PrivateChat from "./pages/PrivateChat";
import AdminCourses from "./pages/adminPages/AdminCourses";
import AdminUsers from "./pages/adminPages/AdminUsers";
import AdminAnalytics from "./pages/adminPages/AdminAnalytics";
import FriendsAndChats from "./pages/FriendsAndChats";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data()); // здесь должна быть роль
        }
      }
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
          {user && (
              <>
                <Navbar user={userData} toggleSidebar={toggleSidebar} />
                <Sidebar user={userData} isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
              </>
          )}
          <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              <Route path="/chat/private/:userId" element={<PrivateChat currentUser={user} />} />
              <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={<UserProfile currentUser={user} />} />
              <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
              <Route path="/create-course" element={<CreateCourse user={user} />} />
              <Route path="/video-call/:courseId" element={<VideoCall user={user} />} />
              <Route path="/assignments/:courseId" element={user ? <Assignments user={user} userData={userData} /> : <Navigate to="/login" />} />
              <Route path="/chat/:courseId" element={user ? <Chat userData={userData} user={user} /> : <Navigate to="/login" />} />
              <Route path="/admin" element={userData?.role === 'admin' ? <AdminPage user={user} /> : <Navigate to="/" />} />
              <Route path="/admin/courses" element={userData?.role === 'admin' ? <AdminCourses user={user} /> : <Navigate to="/" />} />
              <Route path="/admin/users" element={userData?.role === 'admin' ? <AdminUsers user={user} /> : <Navigate to="/" />} />
              <Route path="/admin/analytics" element={userData?.role === 'admin' ? <AdminAnalytics user={user} /> : <Navigate to="/" />} />
              <Route path="/friends" element={user ? <FriendsAndChats user={user} userData={userData} /> : <Navigate to="/login" />} />
              <Route path="/students/:courseId" element={user ? <Students user={user} userData={userData} /> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
  );
}

export default App;