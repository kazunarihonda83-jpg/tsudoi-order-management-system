import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Edit, FileText } from 'lucide-react';
import api from '../utils/api';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({
    supplier_id: '', order_date: new Date().toISOString().split('T')[0],
    items: [{product_name:'',quantity:1,unit_price:0}], notes: ''
  });

  useEffect(() => { fetchOrders(); fetchSuppliers(); }, []);

  const fetchOrders = async () => {
    const res = await api.get('/purchases/orders');
    setOrders(res.data);
  };

  const fetchSuppliers = async () => {
    const res = await api.get('/suppliers');
    setSuppliers(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOrder) {
        await api.put(`/purchases/orders/${editingOrder.id}`, formData);
        alert('発注を更新しました');
      } else {
        await api.post('/purchases/orders', formData);
        alert('発注を作成しました');
      }
      setShowModal(false);
      setEditingOrder(null);
      setFormData({supplier_id:'',order_date:new Date().toISOString().split('T')[0],
        items:[{product_name:'',quantity:1,unit_price:0}],notes:''});
      fetchOrders();
      
      // ダッシュボードに通知
      window.dispatchEvent(new CustomEvent('purchaseOrderUpdated'));
    } catch (error) {
      alert(error.response?.data?.error || (editingOrder ? '更新に失敗しました' : '作成に失敗しました'));
    }
  };

  const handleEdit = async (order) => {
    try {
      const res = await api.get(`/purchases/orders/${order.id}`);
      setEditingOrder(res.data);
      setFormData({
        supplier_id: res.data.supplier_id,
        order_date: res.data.order_date,
        items: res.data.items && res.data.items.length > 0 ? res.data.items : [{product_name:'',quantity:1,unit_price:0}],
        notes: res.data.notes || ''
      });
      setShowModal(true);
    } catch (error) {
      alert('発注の読み込みに失敗しました');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return;
    await api.delete(`/purchases/orders/${id}`);
    alert('削除しました');
    fetchOrders();
    
    // ダッシュボードに通知
    window.dispatchEvent(new CustomEvent('purchaseOrderUpdated'));
  };

  const handleCreateDocument = async (order) => {
    try {
      const response = await api.post(`/purchases/orders/${order.id}/create-document`);
      alert(`発注書を作成しました！\n書類番号: ${response.data.document_number}`);
      
      // 書類管理ページへ移動
      if (confirm('作成した発注書を確認しますか？')) {
        window.location.href = '/documents';
      }
    } catch (error) {
      console.error('発注書作成エラー:', error);
      alert(error.response?.data?.error || '発注書の作成に失敗しました');
    }
  };

  const addItem = () => setFormData({...formData, items:[...formData.items,{product_name:'',quantity:1,unit_price:0}]});
  const updateItem = (i,f,v) => {
    const items=[...formData.items]; items[i][f]=v; setFormData({...formData,items});
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'20px'}}>
        <h1 style={{display:'flex',alignItems:'center',gap:'10px'}}><ShoppingCart size={28}/> 発注管理</h1>
        <button onClick={()=>setShowModal(true)} style={{display:'flex',alignItems:'center',gap:'8px',
          padding:'10px 20px',background:'#1890ff',color:'white',border:'none',borderRadius:'4px',cursor:'pointer'}}>
          <Plus size={18}/> 新規発注
        </button>
      </div>
      <div style={{background:'white',padding:'20px',borderRadius:'8px'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f0f0f0'}}>
            <th style={{padding:'12px',textAlign:'left'}}>発注番号</th>
            <th style={{padding:'12px',textAlign:'left'}}>仕入先</th>
            <th style={{padding:'12px',textAlign:'left'}}>発注日</th>
            <th style={{padding:'12px',textAlign:'right'}}>金額</th>
            <th style={{padding:'12px',textAlign:'center'}}>操作</th>
          </tr></thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #f0f0f0'}}>
                <td style={{padding:'12px',fontFamily:'monospace'}}>{o.order_number}</td>
                <td style={{padding:'12px'}}>{o.supplier_name}</td>
                <td style={{padding:'12px'}}>{o.order_date}</td>
                <td style={{padding:'12px',textAlign:'right',fontWeight:'600'}}>¥{o.total_amount?.toLocaleString()}</td>
                <td style={{padding:'12px',textAlign:'center'}}>
                  <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
                    <button onClick={()=>handleCreateDocument(o)} style={{padding:'6px 12px',background:'#fff',
                      border:'1px solid #52c41a',color:'#52c41a',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>
                      <FileText size={14} style={{verticalAlign:'middle',marginRight:'4px'}}/> 発注書作成
                    </button>
                    <button onClick={()=>handleEdit(o)} style={{padding:'6px 12px',background:'#fff',
                      border:'1px solid #1890ff',color:'#1890ff',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>
                      <Edit size={14} style={{verticalAlign:'middle',marginRight:'4px'}}/> 編集
                    </button>
                    <button onClick={()=>handleDelete(o.id)} style={{padding:'6px 12px',background:'#fff',
                      border:'1px solid #ff4d4f',color:'#ff4d4f',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>
                      <Trash2 size={14} style={{verticalAlign:'middle',marginRight:'4px'}}/> 削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length===0&&<div style={{textAlign:'center',padding:'40px',color:'#999'}}>データがありません</div>}
      </div>
      {showModal&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',
          display:'flex',justifyContent:'center',alignItems:'center',zIndex:1000}}>
          <div style={{background:'white',padding:'30px',borderRadius:'8px',width:'700px',maxHeight:'90vh',overflowY:'auto'}}>
            <h2 style={{marginBottom:'20px'}}>{editingOrder ? '発注編集' : '新規発注'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:'15px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{display:'block',marginBottom:'5px'}}>仕入先 *</label>
                  <select value={formData.supplier_id} onChange={(e)=>setFormData({...formData,supplier_id:e.target.value})}
                    required style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}>
                    <option value="">選択</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',marginBottom:'5px'}}>発注日 *</label>
                  <input type="date" value={formData.order_date} onChange={(e)=>setFormData({...formData,order_date:e.target.value})}
                    required style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}/>
                </div>
              </div>
              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',marginBottom:'10px',fontWeight:'600'}}>明細</label>
                {formData.items.map((item,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <input type="text" placeholder="商品名" value={item.product_name}
                      onChange={(e)=>updateItem(i,'product_name',e.target.value)} required
                      style={{padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}/>
                    <input type="number" placeholder="数量" value={item.quantity}
                      onChange={(e)=>updateItem(i,'quantity',parseInt(e.target.value)||0)} required
                      style={{padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}/>
                    <input type="number" placeholder="単価" value={item.unit_price}
                      onChange={(e)=>updateItem(i,'unit_price',parseFloat(e.target.value)||0)} required
                      style={{padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}/>
                  </div>
                ))}
                <button type="button" onClick={addItem} style={{padding:'8px 16px',background:'#f0f0f0',
                  border:'none',borderRadius:'4px',cursor:'pointer'}}>+ 明細追加</button>
              </div>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setShowModal(false)}
                  style={{padding:'10px 20px',background:'#fff',border:'1px solid #ddd',borderRadius:'4px',cursor:'pointer'}}>
                  キャンセル
                </button>
                <button type="submit" style={{padding:'10px 20px',background:'#1890ff',color:'white',
                  border:'none',borderRadius:'4px',cursor:'pointer'}}>{editingOrder ? '更新' : '作成'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
