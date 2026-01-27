import { useState, useEffect } from 'react';
import { Calculator, Plus, Download, Filter, X, Calendar, Trash2, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import api from '../utils/api';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [profitLoss, setProfitLoss] = useState({ revenue: 0, expenses: 0 });
  const [balanceSheet, setBalanceSheet] = useState({ assets: 0, liabilities: 0, equity: 0 });
  const [trialBalance, setTrialBalance] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    debit_account_id: '',
    credit_account_id: '',
    amount: 0,
    notes: ''
  });

  useEffect(() => {
    fetchAccounts();
    fetchData();
  }, [activeTab, dateRange]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounting/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'journal') {
        const response = await api.get('/accounting/journal', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        });
        setJournalEntries(response.data);
      } else if (activeTab === 'profit-loss') {
        const response = await api.get('/accounting/profit-loss', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        });
        setProfitLoss(response.data);
      } else if (activeTab === 'balance-sheet') {
        const response = await api.get('/accounting/balance-sheet', {
          params: { as_of_date: dateRange.end }
        });
        setBalanceSheet(response.data);
      } else if (activeTab === 'trial-balance') {
        const response = await api.get('/accounting/trial-balance', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        });
        setTrialBalance(response.data);
      } else if (activeTab === 'dashboard') {
        const plResponse = await api.get('/accounting/profit-loss', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        });
        setProfitLoss(plResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounting/journal', formData);
      alert('仕訳を登録しました');
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || '登録に失敗しました');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('この仕訳を削除してもよろしいですか？\nこの操作は元に戻せません。')) return;
    try {
      await api.delete(`/accounting/journal/${id}`);
      alert('仕訳を削除しました');
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      debit_account_id: '',
      credit_account_id: '',
      amount: 0,
      notes: ''
    });
  };

  const getAccountName = (id) => {
    const account = accounts.find(a => a.id === parseInt(id));
    return account ? `${account.account_code} ${account.account_name}` : '-';
  };

  const formatCurrency = (amount) => {
    return `¥${Math.round(amount).toLocaleString()}`;
  };

  const handlePDFExport = async (type, params) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      let url = `${baseUrl}/accounting/${type}/pdf?`;
      
      if (type === 'profit-loss') {
        url += `start_date=${params.start_date}&end_date=${params.end_date}`;
      } else if (type === 'balance-sheet') {
        url += `as_of_date=${params.as_of_date}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation error:', errorText);
        throw new Error('PDF生成に失敗しました');
      }
      
      const html = await response.text();
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
        return;
      }
      newWindow.document.write(html);
      newWindow.document.close();
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF出力に失敗しました');
    }
  };

  const exportToCSV = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'journal') {
      csvContent = '日付,摘要,借方科目,貸方科目,金額\n';
      journalEntries.forEach(entry => {
        csvContent += `${entry.entry_date},${entry.description},${entry.debit_account_code} ${entry.debit_account_name},${entry.credit_account_code} ${entry.credit_account_name},${entry.amount}\n`;
      });
      filename = `journal_${dateRange.start}_${dateRange.end}.csv`;
    } else if (type === 'trial') {
      csvContent = '科目コード,科目名,区分,借方合計,貸方合計,残高\n';
      trialBalance.forEach(account => {
        const balance = account.total_debit - account.total_credit;
        csvContent += `${account.account_code},${account.account_name},${account.category},${account.total_debit},${account.total_credit},${balance}\n`;
      });
      filename = `trial_balance_${dateRange.end}.csv`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const setCurrentMonth = () => {
    const now = new Date();
    setDateRange({
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calculator size={28} /> 会計帳簿
        </h1>
        {activeTab === 'journal' && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1890ff',
              color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
            <Plus size={18} /> 仕訳を登録
          </button>
        )}
      </div>

      {/* タブナビゲーション */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #f0f0f0' }}>
        {[
          { id: 'dashboard', label: 'ダッシュボード' },
          { id: 'journal', label: '仕訳帳' },
          { id: 'trial-balance', label: '試算表' },
          { id: 'profit-loss', label: '損益計算書' },
          { id: 'balance-sheet', label: '貸借対照表' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '3px solid #1890ff' : '3px solid transparent',
              color: activeTab === tab.id ? '#1890ff' : '#666', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ダッシュボード */}
      {activeTab === 'dashboard' && (
        <div>
          {/* サマリーカード */}
          <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="summary-card revenue-card" style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>収益</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#2196f3' }}>{formatCurrency(profitLoss.revenue || 0)}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#9e9e9e' }}>売上高合計</div>
            </div>

            <div className="summary-card expense-card" style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>費用</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#f44336' }}>{formatCurrency(profitLoss.expenses || 0)}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#9e9e9e' }}>経費合計</div>
            </div>

            <div className={`summary-card ${(profitLoss.revenue - profitLoss.expenses) >= 0 ? 'profit-card' : 'loss-card'}`}
              style={{ background: 'white',
                padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>純利益</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: (profitLoss.revenue - profitLoss.expenses) >= 0 ? '#4caf50' : '#ff9800' }}>{formatCurrency((profitLoss.revenue || 0) - (profitLoss.expenses || 0))}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#9e9e9e' }}>
                {(profitLoss.revenue - profitLoss.expenses) >= 0 ? '黒字経営' : '赤字経営'}
              </div>
            </div>

            <div className="summary-card rate-card" style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '14px', color: '#757575', marginBottom: '8px' }}>利益率</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#616161' }}>
                  {profitLoss.revenue > 0 ? ((profitLoss.revenue - profitLoss.expenses) / profitLoss.revenue * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#9e9e9e' }}>売上高利益率</div>
            </div>
          </div>

          {/* 日付範囲フィルター */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={20} />
                <span style={{ fontWeight: '500' }}>期間:</span>
              </div>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <span>〜</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <button onClick={setCurrentMonth}
                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                今月
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 仕訳帳 */}
      {activeTab === 'journal' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <span>〜</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <button onClick={() => exportToCSV('journal')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#52c41a',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
              <Download size={16} /> CSV出力
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '12px', fontWeight: '600' }}>日付</th>
                <th style={{ padding: '12px', fontWeight: '600' }}>摘要</th>
                <th style={{ padding: '12px', fontWeight: '600' }}>借方科目</th>
                <th style={{ padding: '12px', fontWeight: '600' }}>貸方科目</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>金額</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0', background: entry.reference_type ? '#f9f9f9' : 'white' }}>
                  <td style={{ padding: '12px' }}>
                    {entry.entry_date}
                    {entry.reference_type && (
                      <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#e6f7ff', color: '#1890ff', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        自動
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>{entry.description}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
                    {entry.debit_account_code} {entry.debit_account_name}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
                    {entry.credit_account_code} {entry.credit_account_name}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                    {formatCurrency(entry.amount)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {entry.reference_type ? (
                      <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                        自動生成
                      </span>
                    ) : (
                      <button onClick={() => handleDelete(entry.id)}
                        className="btn-icon btn-danger"
                        style={{ padding: '6px', background: 'transparent', border: '1px solid #ff4d4f',
                          color: '#ff4d4f', borderRadius: '4px', cursor: 'pointer' }}
                        title="削除">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #f0f0f0', fontWeight: '600' }}>
                <td colSpan="4" style={{ padding: '12px', textAlign: 'right' }}>合計</td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                  {formatCurrency(journalEntries.reduce((sum, e) => sum + e.amount, 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {journalEntries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p>仕訳データがありません。</p>
              <button onClick={() => { resetForm(); setShowForm(true); }}
                style={{ marginTop: '15px', padding: '8px 20px', background: '#1890ff', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                仕訳を登録
              </button>
            </div>
          )}
        </div>
      )}

      {/* 試算表 */}
      {activeTab === 'trial-balance' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ fontWeight: '500' }}>基準日:</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <button onClick={() => exportToCSV('trial')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#52c41a',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
              <Download size={16} /> CSV出力
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '12px', fontWeight: '600' }}>科目コード</th>
                <th style={{ padding: '12px', fontWeight: '600' }}>科目名</th>
                <th style={{ padding: '12px', fontWeight: '600' }}>区分</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>借方合計</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>貸方合計</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>残高</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.map((account) => {
                const balance = account.total_debit - account.total_credit;
                return (
                  <tr key={account.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{account.account_code}</td>
                    <td style={{ padding: '12px' }}>{account.account_name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                        background: account.category === 'asset' ? '#e6f7ff' : account.category === 'liability' ? '#fff1f0' : 
                                   account.category === 'revenue' ? '#f6ffed' : account.category === 'expense' ? '#fff7e6' : '#f0f0f0',
                        color: account.category === 'asset' ? '#1890ff' : account.category === 'liability' ? '#f5222d' :
                               account.category === 'revenue' ? '#52c41a' : account.category === 'expense' ? '#fa8c16' : '#666' }}>
                        {account.category === 'asset' ? '資産' : account.category === 'liability' ? '負債' :
                         account.category === 'equity' ? '純資産' : account.category === 'revenue' ? '収益' : '費用'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(account.total_debit)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(account.total_credit)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600',
                      color: balance > 0 ? '#52c41a' : balance < 0 ? '#f5222d' : '#666' }}>
                      {formatCurrency(Math.abs(balance))} {balance < 0 ? '(貸)' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #f0f0f0', fontWeight: '600' }}>
                <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>合計</td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                  {formatCurrency(trialBalance.reduce((sum, a) => sum + a.total_debit, 0))}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                  {formatCurrency(trialBalance.reduce((sum, a) => sum + a.total_credit, 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 損益計算書 */}
      {activeTab === 'profit-loss' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '10px' }}>損益計算書</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              期間: {dateRange.start} 〜 {dateRange.end}
            </p>
            <div style={{ marginTop: '15px' }}>
              <button
                onClick={() => handlePDFExport('profit-loss', { 
                  start_date: dateRange.start, 
                  end_date: dateRange.end 
                })}
                style={{
                  padding: '10px 20px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e6e6e6';
                  e.currentTarget.style.borderColor = '#bfbfbf';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#d9d9d9';
                }}
              >
                <Download size={16} />
                PDF出力
              </button>
            </div>
          </div>

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #e6f4ff' }}>
                <span style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>売上高</span>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#52c41a' }}>{formatCurrency(profitLoss.revenue || 0)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#fffbf0', borderRadius: '4px', border: '1px solid #fff7e6' }}>
                <span style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>経費</span>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#fa8c16' }}>{formatCurrency(profitLoss.expenses || 0)}</span>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #d9d9d9', paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', 
                background: (profitLoss.revenue - profitLoss.expenses) >= 0 ? '#f0f9ff' : '#fff1f0',
                borderRadius: '4px', border: (profitLoss.revenue - profitLoss.expenses) >= 0 ? '2px solid #91d5ff' : '2px solid #ffa39e' }}>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  {(profitLoss.revenue - profitLoss.expenses) >= 0 ? '当期純利益' : '当期純損失'}
                </span>
                <span style={{ fontSize: '22px', fontWeight: '700', color: (profitLoss.revenue - profitLoss.expenses) >= 0 ? '#1890ff' : '#f5222d' }}>
                  {formatCurrency(Math.abs((profitLoss.revenue || 0) - (profitLoss.expenses || 0)))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 貸借対照表 */}
      {activeTab === 'balance-sheet' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '10px' }}>貸借対照表</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              基準日: {dateRange.end}
            </p>
            <div style={{ marginTop: '15px' }}>
              <button
                onClick={() => handlePDFExport('balance-sheet', { 
                  as_of_date: dateRange.end 
                })}
                style={{
                  padding: '10px 20px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e6e6e6';
                  e.currentTarget.style.borderColor = '#bfbfbf';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#d9d9d9';
                }}
              >
                <Download size={16} />
                PDF出力
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: '900px', margin: '0 auto' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #1890ff', color: '#1890ff' }}>
                資産の部
              </h3>
              <div style={{ padding: '15px', background: '#e6f7ff', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>流動資産</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.assets || 0)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f0f0f0', borderRadius: '8px', fontWeight: '700', fontSize: '18px' }}>
                <span>資産合計</span>
                <span style={{ color: '#1890ff' }}>{formatCurrency(balanceSheet.assets || 0)}</span>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #f5222d', color: '#f5222d' }}>
                負債・純資産の部
              </h3>
              <div style={{ padding: '15px', background: '#fff1f0', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>流動負債</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.liabilities || 0)}</span>
                </div>
              </div>
              <div style={{ padding: '15px', background: '#f6ffed', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>純資産</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.equity || 0)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f0f0f0', borderRadius: '8px', fontWeight: '700', fontSize: '18px' }}>
                <span>負債・純資産合計</span>
                <span style={{ color: '#f5222d' }}>{formatCurrency((balanceSheet.liabilities || 0) + (balanceSheet.equity || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 仕訳登録フォーム */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>仕訳登録</h2>
              <button onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>日付 *</label>
                <input type="date" value={formData.entry_date}
                  onChange={(e) => setFormData({...formData, entry_date: e.target.value})} required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>摘要 *</label>
                <input type="text" value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})} required
                  placeholder="例: 商品売上" 
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>借方科目 *</label>
                  <select value={formData.debit_account_id}
                    onChange={(e) => setFormData({...formData, debit_account_id: e.target.value})} required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                    <option value="">選択してください</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_code} {acc.account_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>貸方科目 *</label>
                  <select value={formData.credit_account_id}
                    onChange={(e) => setFormData({...formData, credit_account_id: e.target.value})} required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                    <option value="">選択してください</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_code} {acc.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>金額 *</label>
                <input type="number" value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} required min="0"
                  placeholder="0"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>備考</label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3"
                  placeholder="追加情報があれば入力してください"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '10px 24px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  キャンセル
                </button>
                <button type="submit"
                  style={{ padding: '10px 24px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
