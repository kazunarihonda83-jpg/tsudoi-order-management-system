import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search } from 'lucide-react';
import api from '../utils/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customer_type: 'corporate',
    name: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    payment_terms: 30,
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        alert('顧客情報を更新しました');
      } else {
        await api.post('/customers', formData);
        alert('顧客を登録しました');
      }
      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_type: customer.customer_type,
      name: customer.name,
      postal_code: customer.postal_code || '',
      address: customer.address || '',
      phone: customer.phone || '',
      email: customer.email || '',
      payment_terms: customer.payment_terms,
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('この顧客を削除してもよろしいですか？\nこの操作は元に戻せません。')) return;
    try {
      await api.delete(`/customers/${id}`);
      alert('顧客を削除しました');
      fetchCustomers();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_type: 'corporate',
      name: '',
      postal_code: '',
      address: '',
      phone: '',
      email: '',
      payment_terms: 30,
      notes: ''
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div>読み込み中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={28} /> 顧客管理
        </h1>
        <button onClick={() => { resetForm(); setEditingCustomer(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1890ff', 
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
          <Plus size={18} /> 新規登録
        </button>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', 
          padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <Search size={20} color="#999" />
          <input type="text" placeholder="顧客名またはメールアドレスで検索..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px' }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '12px', fontWeight: '600' }}>顧客名</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>種別</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>電話番号</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>メールアドレス</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>支払条件</th>
              <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px' }}>{customer.name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                    background: customer.customer_type === 'corporate' ? '#e6f7ff' : '#fff7e6',
                    color: customer.customer_type === 'corporate' ? '#1890ff' : '#fa8c16' }}>
                    {customer.customer_type === 'corporate' ? '法人' : '個人'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{customer.phone || '-'}</td>
                <td style={{ padding: '12px' }}>{customer.email || '-'}</td>
                <td style={{ padding: '12px' }}>{customer.payment_terms}日</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => handleEdit(customer)}
                    style={{ padding: '6px 12px', marginRight: '8px', background: '#fff', border: '1px solid #1890ff',
                      color: '#1890ff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    <Edit size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    編集
                  </button>
                  <button onClick={() => handleDelete(customer.id)}
                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ff4d4f',
                      color: '#ff4d4f', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            {searchTerm ? '検索結果が見つかりません' : '顧客データがありません。「新規登録」ボタンから登録してください。'}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingCustomer ? '顧客情報編集' : '新規顧客登録'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>顧客種別 *</label>
                <select value={formData.customer_type} onChange={(e) => setFormData({...formData, customer_type: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="corporate">法人</option>
                  <option value="individual">個人</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>顧客名 *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>郵便番号</label>
                  <input type="text" value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    placeholder="123-4567" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>住所</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>電話番号</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>メールアドレス</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>支払条件（日数）</label>
                <input type="number" value={formData.payment_terms} onChange={(e) => setFormData({...formData, payment_terms: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>備考</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingCustomer(null); }}
                  style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                  キャンセル
                </button>
                <button type="submit"
                  style={{ padding: '10px 20px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingCustomer ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
