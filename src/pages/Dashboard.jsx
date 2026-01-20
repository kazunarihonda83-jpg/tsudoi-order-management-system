import { useState, useEffect } from 'react';
import { BarChart3, Users, FileText, ShoppingCart, TrendingUp, TrendingDown, Package, AlertCircle } from 'lucide-react';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSuppliers: 0,
    totalDocuments: 0,
    totalPurchaseOrders: 0,
    recentDocuments: [],
    recentPurchaseOrders: [],
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    netIncome: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // 書類管理・発注管理からの更新通知を受け取る
    const handleUpdate = () => {
      loadDashboardData();
    };
    
    window.addEventListener('documentUpdated', handleUpdate);
    window.addEventListener('purchaseOrderUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('documentUpdated', handleUpdate);
      window.removeEventListener('purchaseOrderUpdated', handleUpdate);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // 今月の日付範囲を計算
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const [customers, suppliers, documents, purchaseOrders, profitLoss] = await Promise.all([
        api.get('/customers').catch(err => ({ data: [] })),
        api.get('/suppliers').catch(err => ({ data: [] })),
        api.get('/documents').catch(err => ({ data: [] })),
        api.get('/purchases/orders').catch(err => ({ data: [] })),
        api.get('/accounting/profit-loss', {
          params: { start_date: startDate, end_date: endDate }
        }).catch(err => ({ data: { revenue: 0, expenses: 0 } }))
      ]);

      // 今月の収益と支出を計算（会計帳簿と書類データの両方から）
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // 書類データから直接計算（発行済みの請求書のみ）
      const monthlyDocs = (documents.data || []).filter(doc => 
        doc.issue_date?.startsWith(currentMonth) && 
        doc.document_type === 'invoice' &&
        (doc.status === 'issued' || doc.status === 'paid' || !doc.status)
      );
      const docsRevenue = monthlyDocs.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);
      
      // 発注データから直接計算（納品済みのみ）
      const monthlyPOs = (purchaseOrders.data || []).filter(po => 
        po.order_date?.startsWith(currentMonth) &&
        (po.status === 'delivered' || po.status === 'received')
      );
      const posExpenses = monthlyPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);

      // 会計帳簿からの数値を取得
      const accountingRevenue = profitLoss.data?.revenue || 0;
      const accountingExpenses = profitLoss.data?.expenses || 0;

      // どちらか大きい方を使用（データの整合性を保つ）
      const monthlyRevenue = Math.max(docsRevenue, accountingRevenue);
      const monthlyExpenses = Math.max(posExpenses, accountingExpenses);

      setStats({
        totalCustomers: (customers.data || []).length,
        totalSuppliers: (suppliers.data || []).length,
        totalDocuments: (documents.data || []).length,
        totalPurchaseOrders: (purchaseOrders.data || []).length,
        recentDocuments: (documents.data || []).slice(0, 5),
        recentPurchaseOrders: (purchaseOrders.data || []).slice(0, 5),
        monthlyRevenue,
        monthlyExpenses,
        netIncome: monthlyRevenue - monthlyExpenses
      });
      setLoading(false);
    } catch (error) {
      console.error('Dashboard load error:', error);
      setError(error.message || 'データの読み込みに失敗しました');
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const labels = { quotation: '見積書', order: '発注書', delivery: '納品書', invoice: '請求書' };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = { pending: '発注済', shipped: '配送中', delivered: '納品完了', cancelled: 'キャンセル' };
    return labels[status] || status;
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', fontSize: '18px' }}>読み込み中...</div>;
  
  if (error) return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <div style={{ color: '#f44336', fontSize: '18px', marginBottom: '20px' }}>エラーが発生しました</div>
      <div style={{ color: '#757575' }}>{error}</div>
      <button 
        onClick={loadDashboardData}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        再読み込み
      </button>
    </div>
  );

  return (
    <div>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <BarChart3 size={32} /> ダッシュボード
      </h1>

      {/* 統計カード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>顧客数</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212121' }}>{stats.totalCustomers}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '12px' }}>
              <Users size={28} color="#616161" />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#9e9e9e' }}>登録済み顧客</div>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>書類数</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212121' }}>{stats.totalDocuments}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '12px' }}>
              <FileText size={28} color="#616161" />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#9e9e9e' }}>作成済み書類</div>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>仕入先</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212121' }}>{stats.totalSuppliers}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '12px' }}>
              <Package size={28} color="#616161" />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#9e9e9e' }}>登録済み仕入先</div>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>発注書</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212121' }}>{stats.totalPurchaseOrders}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '12px' }}>
              <ShoppingCart size={28} color="#616161" />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#9e9e9e' }}>作成済み発注</div>
        </div>
      </div>

      {/* 今月の収支 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', border: '1px solid #e8e8e8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', border: '1px solid #bbdefb' }}>
              <TrendingUp size={22} color="#1976d2" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.3px' }}>今月の売上</div>
              <div style={{ fontSize: '26px', fontWeight: '600', color: '#1976d2' }}>
                ¥{stats.monthlyRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', border: '1px solid #e8e8e8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <div style={{ background: '#ffebee', padding: '12px', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
              <TrendingDown size={22} color="#d32f2f" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.3px' }}>今月の支出</div>
              <div style={{ fontSize: '26px', fontWeight: '600', color: '#d32f2f' }}>
                ¥{stats.monthlyExpenses.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', border: '1px solid #e8e8e8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
              <BarChart3 size={22} color="#388e3c" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666666', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.3px' }}>純利益</div>
              <div style={{ fontSize: '26px', fontWeight: '600', color: stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? '#388e3c' : '#d32f2f' }}>
                ¥{(stats.monthlyRevenue - stats.monthlyExpenses).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近の書類と発注書 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> 最近の書類
          </h3>
          {stats.recentDocuments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentDocuments.map(doc => (
                <div key={doc.id} style={{ padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#666', marginBottom: '4px' }}>{doc.document_number}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{doc.customer_name || '-'}</div>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#e6f7ff', color: '#1890ff', marginTop: '4px', display: 'inline-block' }}>
                      {getDocumentTypeLabel(doc.document_type)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1890ff' }}>¥{doc.total_amount?.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{doc.issue_date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              <AlertCircle size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <div>書類データがありません</div>
            </div>
          )}
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} /> 最近の発注
          </h3>
          {stats.recentPurchaseOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentPurchaseOrders.map(po => (
                <div key={po.id} style={{ padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#666', marginBottom: '4px' }}>{po.order_number}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{po.supplier_name || '-'}</div>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', 
                      background: po.status === 'pending' ? '#fff7e6' : po.status === 'shipped' ? '#e6f7ff' : po.status === 'delivered' ? '#f6ffed' : '#fff1f0',
                      color: po.status === 'pending' ? '#fa8c16' : po.status === 'shipped' ? '#1890ff' : po.status === 'delivered' ? '#52c41a' : '#f5222d',
                      marginTop: '4px', display: 'inline-block' }}>
                      {getStatusLabel(po.status)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#52c41a' }}>¥{po.total_amount?.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{po.order_date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              <AlertCircle size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <div>発注データがありません</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
