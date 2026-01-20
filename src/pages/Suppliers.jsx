import { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import api from '../utils/api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    supplier_type: '',
    name: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    payment_terms: 30,
    bank_name: '',
    branch_name: '',
    account_type: '普通',
    account_number: '',
    account_holder: '',
    notes: ''
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        alert('仕入先を更新しました');
      } else {
        await api.post('/suppliers', formData);
        alert('仕入先を登録しました');
      }
      setShowModal(false);
      setEditingSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      alert(error.response?.data?.error || (editingSupplier ? '更新に失敗しました' : '登録に失敗しました'));
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_type: '',
      name: '',
      postal_code: '',
      address: '',
      phone: '',
      email: '',
      payment_terms: 30,
      bank_name: '',
      branch_name: '',
      account_type: '普通',
      account_number: '',
      account_holder: '',
      notes: ''
    });
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_type: supplier.supplier_type || '',
      name: supplier.name,
      postal_code: supplier.postal_code || '',
      address: supplier.address || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      payment_terms: supplier.payment_terms || 30,
      bank_name: supplier.bank_name || '',
      branch_name: supplier.branch_name || '',
      account_type: supplier.account_type || '普通',
      account_number: supplier.account_number || '',
      account_holder: supplier.account_holder || '',
      notes: supplier.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      alert('削除しました');
      fetchSuppliers();
    } catch (error) {
      alert(error.response?.data?.error || '削除失敗');
    }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'20px'}}>
        <h1 style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'24px',fontWeight:'600',color:'#1F2937'}}>
          <Package size={28}/> 仕入先管理
        </h1>
        <button onClick={()=>{resetForm();setShowModal(true);}} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',
          background:'#3B82F6',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}}>
          <Plus size={18}/> 新規登録
        </button>
      </div>
      
      <div style={{background:'white',padding:'20px',borderRadius:'8px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{borderBottom:'2px solid #E5E7EB'}}>
              <th style={{padding:'12px',textAlign:'left',color:'#4B5563',fontWeight:'600'}}>種別</th>
              <th style={{padding:'12px',textAlign:'left',color:'#4B5563',fontWeight:'600'}}>仕入先名</th>
              <th style={{padding:'12px',textAlign:'left',color:'#4B5563',fontWeight:'600'}}>電話番号</th>
              <th style={{padding:'12px',textAlign:'left',color:'#4B5563',fontWeight:'600'}}>銀行情報</th>
              <th style={{padding:'12px',textAlign:'center',color:'#4B5563',fontWeight:'600'}}>操作</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s=>(
              <tr key={s.id} style={{borderBottom:'1px solid #E5E7EB'}}>
                <td style={{padding:'12px',color:'#6B7280'}}>{s.supplier_type||'-'}</td>
                <td style={{padding:'12px',color:'#1F2937',fontWeight:'500'}}>{s.name}</td>
                <td style={{padding:'12px',color:'#6B7280'}}>{s.phone||'-'}</td>
                <td style={{padding:'12px',color:'#6B7280',fontSize:'13px'}}>
                  {s.bank_name ? `${s.bank_name} ${s.branch_name||''} ${s.account_type||''} ${s.account_number||''}` : '-'}
                </td>
                <td style={{padding:'12px',textAlign:'center'}}>
                  <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                    <button onClick={()=>handleEdit(s)} style={{padding:'6px 12px',background:'#fff',
                      border:'1px solid #3B82F6',color:'#3B82F6',borderRadius:'4px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',gap:'4px'}}>
                      <Edit size={14}/> 編集
                    </button>
                    <button onClick={()=>handleDelete(s.id)} style={{padding:'6px 12px',background:'#fff',
                      border:'1px solid #EF4444',color:'#EF4444',borderRadius:'4px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',gap:'4px'}}>
                      <Trash2 size={14}/> 削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length===0&&<div style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>データがありません</div>}
      </div>

      {showModal&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',
          display:'flex',justifyContent:'center',alignItems:'center',zIndex:1000,padding:'20px',overflowY:'auto'}}>
          <div style={{background:'white',padding:'30px',borderRadius:'8px',width:'600px',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{marginBottom:'20px',fontSize:'20px',fontWeight:'600',color:'#1F2937',display:'flex',alignItems:'center',gap:'10px'}}>
              <Building2 size={24}/>
              {editingSupplier ? '仕入先編集' : '新規仕入先登録'}
            </h2>
            <form onSubmit={handleSubmit}>
              {/* 基本情報 */}
              <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #E5E7EB'}}>
                <h3 style={{fontSize:'16px',fontWeight:'600',color:'#4B5563',marginBottom:'15px'}}>基本情報</h3>
                
                <div style={{marginBottom:'15px'}}>
                  <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>種別 *</label>
                  <select value={formData.supplier_type} onChange={(e)=>setFormData({...formData,supplier_type:e.target.value})}
                    required style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}>
                    <option value="">選択してください</option>
                    <option value="食品">食品</option>
                    <option value="製麺">製麺</option>
                    <option value="卸売">卸売</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <div style={{marginBottom:'15px'}}>
                  <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>仕入先名 *</label>
                  <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})}
                    required style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                    placeholder="例：株式会社〇〇"/>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px',marginBottom:'15px'}}>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>郵便番号</label>
                    <input type="text" value={formData.postal_code} onChange={(e)=>setFormData({...formData,postal_code:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：224-0057"/>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>住所</label>
                    <input type="text" value={formData.address} onChange={(e)=>setFormData({...formData,address:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：東京都〇〇区〇〇"/>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'15px'}}>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>電話番号</label>
                    <input type="tel" value={formData.phone} onChange={(e)=>setFormData({...formData,phone:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：03-1234-5678"/>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>メールアドレス</label>
                    <input type="email" value={formData.email} onChange={(e)=>setFormData({...formData,email:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：info@example.com"/>
                  </div>
                </div>

                <div style={{marginBottom:'15px'}}>
                  <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>支払条件（日）</label>
                  <input type="number" value={formData.payment_terms} onChange={(e)=>setFormData({...formData,payment_terms:parseInt(e.target.value)||0})}
                    style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                    placeholder="例：30"/>
                </div>
              </div>

              {/* 銀行情報 */}
              <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #E5E7EB'}}>
                <h3 style={{fontSize:'16px',fontWeight:'600',color:'#4B5563',marginBottom:'15px'}}>銀行情報</h3>
                
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'10px',marginBottom:'15px'}}>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>銀行名</label>
                    <input type="text" value={formData.bank_name} onChange={(e)=>setFormData({...formData,bank_name:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：三井住友銀行"/>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>支店名</label>
                    <input type="text" value={formData.branch_name} onChange={(e)=>setFormData({...formData,branch_name:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：荏原支店"/>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'15px'}}>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>口座種別</label>
                    <select value={formData.account_type} onChange={(e)=>setFormData({...formData,account_type:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}>
                      <option value="普通">普通</option>
                      <option value="当座">当座</option>
                      <option value="貯蓄">貯蓄</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>口座番号</label>
                    <input type="text" value={formData.account_number} onChange={(e)=>setFormData({...formData,account_number:e.target.value})}
                      style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                      placeholder="例：1234567"/>
                  </div>
                </div>

                <div style={{marginBottom:'15px'}}>
                  <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>口座名義</label>
                  <input type="text" value={formData.account_holder} onChange={(e)=>setFormData({...formData,account_holder:e.target.value})}
                    style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px'}}
                    placeholder="例：カ）サンプルショクヒン"/>
                </div>
              </div>

              {/* 備考 */}
              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',marginBottom:'5px',color:'#4B5563',fontSize:'14px',fontWeight:'500'}}>備考</label>
                <textarea value={formData.notes} onChange={(e)=>setFormData({...formData,notes:e.target.value})}
                  rows="3" style={{width:'100%',padding:'10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'14px',resize:'vertical'}}
                  placeholder="その他メモ"/>
              </div>

              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>{setShowModal(false);setEditingSupplier(null);resetForm();}}
                  style={{padding:'10px 20px',background:'#fff',border:'1px solid #D1D5DB',borderRadius:'6px',cursor:'pointer',fontSize:'14px',fontWeight:'500',color:'#4B5563'}}>
                  キャンセル
                </button>
                <button type="submit" style={{padding:'10px 20px',background:'#3B82F6',color:'white',
                  border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}}>
                  {editingSupplier ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
