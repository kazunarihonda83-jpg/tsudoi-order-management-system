import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Search, Edit2, FileDown, Eye } from 'lucide-react';
import api from '../utils/api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    document_type: 'invoice',
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    tax_type: 'exclusive',
    tax_rate: 10,
    items: [{ product_name: '', quantity: 1, unit_price: 0, tax_category: 'standard' }],
    notes: ''
  });

  useEffect(() => {
    fetchDocuments();
    fetchCustomers();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        await api.put(`/documents/${editingDoc.id}`, formData);
        alert('書類を更新しました');
      } else {
        await api.post('/documents', formData);
        alert('書類を作成しました');
      }
      setShowModal(false);
      setEditingDoc(null);
      resetForm();
      fetchDocuments();
      
      // ダッシュボードに通知（カスタムイベント発行）
      window.dispatchEvent(new CustomEvent('documentUpdated'));
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || (editingDoc ? '更新に失敗しました' : '作成に失敗しました'));
    }
  };

  const handleEdit = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}`);
      const docData = response.data;
      setEditingDoc(docData);
      setFormData({
        document_type: docData.document_type,
        customer_id: docData.customer_id,
        issue_date: docData.issue_date,
        valid_until: docData.valid_until || '',
        tax_type: docData.tax_type || 'exclusive',
        tax_rate: docData.tax_rate || 10,
        items: docData.items && docData.items.length > 0 ? docData.items : [{ product_name: '', quantity: 1, unit_price: 0, tax_category: 'standard' }],
        notes: docData.notes || ''
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error loading document:', error);
      alert('書類の読み込みに失敗しました');
    }
  };

  const handleDownloadPDF = async (doc) => {
    try {
      // PDF出力（印刷用）
      const pdfUrl = `${import.meta.env.VITE_API_URL || '/api'}/documents/${doc.id}/pdf`;
      const token = localStorage.getItem('token');
      
      // 認証付きで新しいウィンドウを開く
      const newWindow = window.open('', '_blank');
      
      // トークンをクエリパラメータとして追加
      fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.text())
      .then(html => {
        newWindow.document.write(html);
        newWindow.document.close();
      })
      .catch(error => {
        console.error('PDF generation error:', error);
        newWindow.close();
        alert('PDF生成に失敗しました');
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF生成に失敗しました');
    }
  };

  const handlePreview = async (doc) => {
    try {
      // プレビュー表示
      const previewUrl = `${import.meta.env.VITE_API_URL || '/api'}/documents/${doc.id}/preview`;
      const token = localStorage.getItem('token');
      
      // 認証付きで新しいウィンドウを開く
      const newWindow = window.open('', '_blank');
      
      fetch(previewUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.text())
      .then(html => {
        newWindow.document.write(html);
        newWindow.document.close();
      })
      .catch(error => {
        console.error('Preview error:', error);
        newWindow.close();
        alert('プレビュー表示に失敗しました');
      });
    } catch (error) {
      console.error('Preview error:', error);
      alert('プレビュー表示に失敗しました');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('この書類を削除してもよろしいですか？\nこの操作は元に戻せません。')) return;
    try {
      await api.delete(`/documents/${id}`);
      alert('書類を削除しました');
      fetchDocuments();
      
      // ダッシュボードに通知
      window.dispatchEvent(new CustomEvent('documentUpdated'));
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || '削除に失敗しました');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_name: '', quantity: 1, unit_price: 0, tax_category: 'standard' }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setEditingDoc(null);
    setFormData({
      document_type: 'invoice',
      customer_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: '',
      tax_type: 'exclusive',
      tax_rate: 10,
      items: [{ product_name: '', quantity: 1, unit_price: 0, tax_category: 'standard' }],
      notes: ''
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return Math.floor(calculateSubtotal() * formData.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getDocumentTypeLabel = (type) => {
    const labels = { quotation: '見積書', order: '発注書', delivery: '納品書', invoice: '請求書' };
    return labels[type] || type;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.customer_name && doc.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <div>読み込み中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={28} /> 書類管理
        </h1>
        <button onClick={() => { resetForm(); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1890ff',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
          <Plus size={18} /> 新規作成
        </button>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <Search size={20} color="#999" />
            <input type="text" placeholder="書類番号または顧客名で検索..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px' }} />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
            <option value="all">全ての種類</option>
            <option value="quotation">見積書</option>
            <option value="order">発注書</option>
            <option value="delivery">納品書</option>
            <option value="invoice">請求書</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '12px', fontWeight: '600' }}>書類番号</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>種類</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>顧客名</th>
              <th style={{ padding: '12px', fontWeight: '600' }}>発行日</th>
              <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>金額</th>
              <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{doc.document_number}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: '#e6f7ff', color: '#1890ff' }}>
                    {getDocumentTypeLabel(doc.document_type)}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{doc.customer_name || '-'}</td>
                <td style={{ padding: '12px' }}>{doc.issue_date}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                  ¥{doc.total_amount?.toLocaleString()}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handlePreview(doc)}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #1890ff',
                        color: '#1890ff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <Eye size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      プレビュー
                    </button>
                    <button onClick={() => handleDownloadPDF(doc)}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #595959',
                        color: '#595959', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <FileDown size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      PDF出力
                    </button>
                    <button onClick={() => handleEdit(doc)}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #722ed1',
                        color: '#722ed1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <Edit2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      編集
                    </button>
                    <button onClick={() => handleDelete(doc.id)}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ff4d4f',
                        color: '#ff4d4f', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDocuments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            {searchTerm || filterType !== 'all' ? '検索結果が見つかりません' : '書類データがありません。'}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingDoc ? '書類編集' : '新規書類作成'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>書類種類 *</label>
                  <select value={formData.document_type} onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <option value="quotation">見積書</option>
                    <option value="order">発注書</option>
                    <option value="delivery">納品書</option>
                    <option value="invoice">請求書</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>顧客 *</label>
                  <select value={formData.customer_id} onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                    required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <option value="">選択してください</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>発行日 *</label>
                  <input type="date" value={formData.issue_date} onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>有効期限</label>
                  <input type="date" value={formData.valid_until} onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '16px' }}>明細</label>
                {formData.items.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" placeholder="商品名" value={item.product_name}
                      onChange={(e) => updateItem(index, 'product_name', e.target.value)} required
                      style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="number" placeholder="数量" value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} required
                      style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="number" placeholder="単価" value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} required
                      style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)}
                        style={{ padding: '8px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        削除
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addItem}
                  style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  + 明細を追加
                </button>
              </div>

              <div style={{ marginBottom: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>小計:</span>
                  <span style={{ fontWeight: '600' }}>¥{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>消費税 ({formData.tax_rate}%):</span>
                  <span style={{ fontWeight: '600' }}>¥{calculateTax().toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #ddd' }}>
                  <span style={{ fontSize: '18px', fontWeight: '600' }}>合計:</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#1890ff' }}>¥{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>備考</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                  キャンセル
                </button>
                <button type="submit"
                  style={{ padding: '10px 20px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingDoc ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
