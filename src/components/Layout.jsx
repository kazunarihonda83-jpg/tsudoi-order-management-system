import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Users, FileText, Package, ShoppingCart, Calculator, LogOut, Warehouse } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <div style={{width:'250px',background:'#001529',color:'white',padding:'20px'}}>
        <h2 style={{marginBottom:'30px',fontSize:'18px'}}>受発注管理</h2>
        <nav>
          <Link to="/" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <Home size={20} /> ダッシュボード
          </Link>
          <Link to="/customers" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <Users size={20} /> 顧客管理
          </Link>
          <Link to="/documents" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <FileText size={20} /> 書類管理
          </Link>
          <Link to="/suppliers" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <Package size={20} /> 仕入先管理
          </Link>
          <Link to="/purchases" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <ShoppingCart size={20} /> 発注管理
          </Link>
          <Link to="/inventory" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <Warehouse size={20} /> 在庫管理
          </Link>
          <Link to="/accounting" style={{display:'flex',alignItems:'center',gap:'10px',color:'white',textDecoration:'none',padding:'12px',borderRadius:'4px',marginBottom:'5px'}}>
            <Calculator size={20} /> 会計帳簿
          </Link>
        </nav>
        <div style={{position:'absolute',bottom:'20px'}}>
          <div style={{marginBottom:'10px',fontSize:'14px'}}>User: {user?.username}</div>
          <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:'10px',background:'#ff4d4f',
            color:'white',border:'none',padding:'10px 20px',borderRadius:'4px',cursor:'pointer'}}>
            <LogOut size={16} /> ログアウト
          </button>
        </div>
      </div>
      <div style={{flex:1,padding:'30px',background:'#f0f2f5'}}>
        {children}
      </div>
    </div>
  );
}
