import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Documents from './pages/Documents';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Accounting from './pages/Accounting';
import Inventory from './pages/Inventory';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Layout><Customers /></Layout></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute><Layout><Documents /></Layout></PrivateRoute>} />
      <Route path="/suppliers" element={<PrivateRoute><Layout><Suppliers /></Layout></PrivateRoute>} />
      <Route path="/purchases" element={<PrivateRoute><Layout><PurchaseOrders /></Layout></PrivateRoute>} />
      <Route path="/accounting" element={<PrivateRoute><Layout><Accounting /></Layout></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Layout><Inventory /></Layout></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
