import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Calendar, MapPin, Edit, Trash2, Plus, Filter, X } from 'lucide-react';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState({ category: '', supplier_id: '', low_stock: false, search: '' });

  // フィルター
  const [formData, setFormData] = useState({
    item_name: '', category: '', supplier_id: '', unit: '個',
    current_stock: 0, reorder_point: 0, optimal_stock: 0,
    unit_cost: 0, expiry_date: '', storage_location: '', notes: ''
  });

  const [movementData, setMovementData] = useState({
    movement_type: 'in', quantity: 0, unit_cost: 0, notes: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchSuppliers();
    fetchStats();
    fetchAlerts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventory, filter]);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/inventory/categories/list');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/inventory/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/inventory/alerts/list?is_resolved=false');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...inventory];

    if (filter.category) {
      filtered = filtered.filter(item => item.category === filter.category);
    }

    if (filter.supplier_id) {
      filtered = filtered.filter(item => item.supplier_id === parseInt(filter.supplier_id));
    }

    if (filter.low_stock) {
      filtered = filtered.filter(item => item.stock_status === 'low');
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(search) ||
        (item.category && item.category.toLowerCase().includes(search))
      );
    }

    setFilteredInventory(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('送信データ:', formData);
      if (selectedItem) {
        await api.put(`/inventory/${selectedItem.id}`, formData);
      } else {
        await api.post('/inventory', formData);
      }
      setShowModal(false);
      setSelectedItem(null);
      setFormData({
        item_name: '', category: '', supplier_id: '', unit: '個',
        current_stock: 0, reorder_point: 0, optimal_stock: 0,
        unit_cost: 0, expiry_date: '', storage_location: '', notes: ''
      });
      fetchInventory();
      fetchStats();
      fetchAlerts();
      alert('在庫を保存しました');
    } catch (error) {
      console.error('Error saving inventory:', error);
      console.error('送信データ:', formData);
      console.error('エラー詳細:', error.response?.data || error.message);
      alert(`保存に失敗しました: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleMovement = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/inventory/${selectedItem.id}/movement`, movementData);
      setShowMovementModal(false);
      setSelectedItem(null);
      setMovementData({ movement_type: 'in', quantity: 0, unit_cost: 0, notes: '' });
      fetchInventory();
      fetchStats();
      fetchAlerts();
    } catch (error) {
      console.error('Error recording movement:', error);
      alert(error.response?.data?.error || '移動記録に失敗しました');
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category || '',
      supplier_id: item.supplier_id || '',
      unit: item.unit,
      reorder_point: item.reorder_point,
      optimal_stock: item.optimal_stock,
      unit_cost: item.unit_cost,
      expiry_date: item.expiry_date || '',
      storage_location: item.storage_location || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      await api.delete(`/inventory/${id}`);
      fetchInventory();
      fetchStats();
    } catch (error) {
      console.error('Error deleting inventory:', error);
      alert('削除に失敗しました');
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await api.put(`/inventory/alerts/${alertId}/resolve`);
      fetchAlerts();
    } catch (error) {
      console.error('Error dismissing alert:', error);
      alert('アラートの解決に失敗しました');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('このアラートを完全に削除しますか？')) return;
    try {
      await api.delete(`/inventory/alerts/${alertId}`);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('アラートの削除に失敗しました');
    }
  };

  const handleBulkDeleteAlerts = async () => {
    if (!confirm('本当に全てのアラートを削除しますか？この操作は取り消せません。')) return;
    try {
      await api.delete('/inventory/alerts/bulk-delete');
      alert('アラートを全て削除しました');
      fetchAlerts();
    } catch (error) {
      console.error('Error bulk deleting alerts:', error);
      alert('アラートの一括削除に失敗しました');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm('本当に全ての在庫データを削除しますか？この操作は取り消せません。')) return;
    
    // 二重確認
    if (!confirm('最終確認：全ての在庫データ、移動履歴、アラートが削除されます。続けますか？')) return;
    
    try {
      // まず状態を即座にクリア
      setInventory([]);
      setFilteredInventory([]);
      setStats({
        total_items: 0,
        low_stock_items: 0,
        total_value: 0,
        expiring_soon: 0,
        categories: []
      });
      setAlerts([]);
      
      // バックエンドで削除
      await api.delete('/inventory/bulk-delete');
      alert('在庫データを全て削除しました');
      
      // 念のため再取得
      await fetchInventory();
      await fetchStats();
      await fetchAlerts();
    } catch (error) {
      console.error('Error bulk deleting inventory:', error);
      alert('一括削除に失敗しました');
      // エラー時は再取得
      fetchInventory();
      fetchStats();
      fetchAlerts();
    }
  };

  const openMovementModal = (item) => {
    setSelectedItem(item);
    setMovementData({ 
      movement_type: 'in', 
      quantity: 0, 
      unit_cost: item.unit_cost, 
      notes: '' 
    });
    setShowMovementModal(true);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'low': return 'bg-red-100 text-red-800';
      case 'optimal': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStockStatusLabel = (status) => {
    switch (status) {
      case 'low': return '在庫不足';
      case 'optimal': return '適正在庫';
      default: return '通常';
    }
  };

  if (loading) return <div>読み込み中...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>在庫管理</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleBulkDelete}
            style={{ padding: '10px 20px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Trash2 size={16} /> 全データ削除
          </button>
          <button onClick={() => { setSelectedItem(null); setShowModal(true); }}
            style={{ padding: '10px 20px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={16} /> 新規登録
          </button>
        </div>
      </div>

      {/* 統計カード */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Package size={24} color="#1890ff" />
              <span style={{ color: '#666', fontSize: '14px' }}>総アイテム数</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.total_items}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <AlertTriangle size={24} color="#ff4d4f" />
              <span style={{ color: '#666', fontSize: '14px' }}>在庫不足</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>{stats.low_stock_items}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <TrendingUp size={24} color="#52c41a" />
              <span style={{ color: '#666', fontSize: '14px' }}>総在庫額</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>¥{Math.round(stats.total_value).toLocaleString()}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Calendar size={24} color="#faad14" />
              <span style={{ color: '#666', fontSize: '14px' }}>賞味期限近い</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#faad14' }}>{stats.expiring_soon}</div>
          </div>
        </div>
      )}

      {/* アラート */}
      {alerts.length > 0 && (
        <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
              <AlertTriangle size={18} color="#faad14" />
              在庫アラート ({alerts.length}件)
            </h3>
            <button 
              onClick={handleBulkDeleteAlerts}
              style={{ 
                padding: '6px 12px', 
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '4px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              title="全アラートを削除"
            >
              <Trash2 size={14} />
              全削除
            </button>
          </div>
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} style={{ 
              padding: '10px', 
              borderBottom: '1px solid #ffd591',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ flex: 1 }}>{alert.message}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleDismissAlert(alert.id)}
                  style={{ 
                    padding: '4px 8px', 
                    background: 'transparent',
                    border: '1px solid #faad14',
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#faad14',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#faad14';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#faad14';
                  }}
                  title="アラートを解決"
                >
                  <X size={14} />
                  解決
                </button>
                <button 
                  onClick={() => handleDeleteAlert(alert.id)}
                  style={{ 
                    padding: '4px 8px', 
                    background: 'transparent',
                    border: '1px solid #ff4d4f',
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#ff4d4f',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ff4d4f';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#ff4d4f';
                  }}
                  title="アラートを削除"
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* フィルター */}
      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={18} />
            <span style={{ fontWeight: 'bold' }}>フィルター:</span>
          </div>
          <input
            type="text"
            placeholder="商品名で検索..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '200px' }}
          />
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="">すべてのカテゴリ</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={filter.supplier_id}
            onChange={(e) => setFilter({ ...filter, supplier_id: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="">すべての仕入先</option>
            {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={filter.low_stock}
              onChange={(e) => setFilter({ ...filter, low_stock: e.target.checked })}
            />
            在庫不足のみ表示
          </label>
        </div>
      </div>

      {/* 在庫テーブル */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafa' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>商品名</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>カテゴリ</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>仕入先</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #f0f0f0' }}>現在庫</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #f0f0f0' }}>発注点</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>ステータス</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>賞味期限</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>保管場所</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #f0f0f0' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px' }}>{item.item_name}</td>
                <td style={{ padding: '12px' }}>{item.category}</td>
                <td style={{ padding: '12px' }}>{item.supplier_name}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                  {item.current_stock} {item.unit}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{item.reorder_point} {item.unit}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} className={getStockStatusColor(item.stock_status)}>
                    {getStockStatusLabel(item.stock_status)}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {item.expiry_date ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} />
                      {item.expiry_date}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px' }}>
                  {item.storage_location ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} />
                      {item.storage_location}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={() => openMovementModal(item)}
                      style={{ padding: '6px 12px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      入出庫
                    </button>
                    <button onClick={() => handleEdit(item)}
                      style={{ padding: '6px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      style={{ padding: '6px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 在庫登録/編集モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{selectedItem ? '在庫編集' : '新規在庫登録'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>商品名 *</label>
                  <input type="text" required value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>カテゴリ</label>
                  <input type="text" list="categories" value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  <datalist id="categories">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>仕入先</label>
                  <select value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <option value="">選択してください</option>
                    {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>単位</label>
                  <input type="text" value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                {!selectedItem && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>現在庫</label>
                    <input type="number" step="0.01" value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>発注点</label>
                  <input type="number" step="0.01" value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>適正在庫</label>
                  <input type="number" step="0.01" value={formData.optimal_stock}
                    onChange={(e) => setFormData({ ...formData, optimal_stock: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>単価（¥）</label>
                  <input type="number" step="0.01" value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>賞味期限</label>
                  <input type="date" value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>保管場所</label>
                  <input type="text" value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>備考</label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }} />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); setSelectedItem(null); }}
                  style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  キャンセル
                </button>
                <button type="submit"
                  style={{ padding: '10px 20px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {selectedItem ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 在庫移動モーダル */}
      {showMovementModal && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>在庫移動: {selectedItem.item_name}</h2>
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>現在庫</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedItem.current_stock} {selectedItem.unit}</div>
            </div>
            <form onSubmit={handleMovement}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>移動タイプ</label>
                <select value={movementData.movement_type}
                  onChange={(e) => setMovementData({ ...movementData, movement_type: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="in">入庫</option>
                  <option value="out">出庫</option>
                  <option value="adjustment">在庫調整</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {movementData.movement_type === 'adjustment' ? '調整後の在庫数' : '数量'}
                </label>
                <input type="number" step="0.01" required value={movementData.quantity}
                  onChange={(e) => setMovementData({ ...movementData, quantity: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>単価（¥）</label>
                <input type="number" step="0.01" value={movementData.unit_cost}
                  onChange={(e) => setMovementData({ ...movementData, unit_cost: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>備考</label>
                <textarea value={movementData.notes}
                  onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowMovementModal(false); setSelectedItem(null); }}
                  style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  キャンセル
                </button>
                <button type="submit"
                  style={{ padding: '10px 20px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  記録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
