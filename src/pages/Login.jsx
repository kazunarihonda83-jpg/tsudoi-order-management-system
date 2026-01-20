import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      console.log('ログイン送信:', { username });
      await login(username, password);
      navigate('/');
    } catch (err) {
      console.error('ログイン失敗:', err);
      const errorMessage = err.response?.data?.error || err.message || 'ログインに失敗しました';
      setError(errorMessage);
    }
  };

  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#f0f2f5'}}>
      <div style={{background:'white',padding:'40px',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',width:'400px'}}>
        <h1 style={{textAlign:'center',marginBottom:'30px'}}>受発注管理システム</h1>
        {error && <div style={{color:'red',marginBottom:'20px',textAlign:'center'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'5px'}}>ユーザー名</label>
            <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} 
              style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px'}} />
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'5px'}}>パスワード</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} 
              style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px'}} />
          </div>
          <button type="submit" style={{width:'100%',padding:'12px',background:'#1890ff',color:'white',
            border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'16px'}}>ログイン</button>
        </form>
      </div>
    </div>
  );
}
