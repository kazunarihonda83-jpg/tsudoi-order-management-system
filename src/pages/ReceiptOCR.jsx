import { useState } from 'react';
import { Camera, Upload, Check, X, Edit } from 'lucide-react';
import Tesseract from 'tesseract.js';
import api from '../utils/api';

export default function ReceiptOCR() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  
  const [receiptData, setReceiptData] = useState({
    store_name: '',
    date: '',
    total_amount: '',
    items: [],
    notes: ''
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = async () => {
    if (!image) {
      alert('画像を選択してください');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        image,
        'jpn+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      setOcrResult(result.data.text);
      parseReceiptData(result.data.text);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('OCR処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const parseReceiptData = (text) => {
    // 簡易的なパース処理
    const lines = text.split('\n').filter(line => line.trim());
    
    // 店舗名（最初の行）
    const storeName = lines[0] || '';
    
    // 日付を探す（YYYY/MM/DD, YYYY-MM-DD, YYYY年MM月DD日など）
    const datePattern = /(\d{4})[/-年](\d{1,2})[/-月](\d{1,2})[日]?/;
    let date = '';
    for (const line of lines) {
      const match = line.match(datePattern);
      if (match) {
        date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        break;
      }
    }

    // 金額を探す（合計、税込、小計など）
    const amountPattern = /[合計計小税込]{2,4}[:\s]*[¥￥]?[\d,]+/;
    let totalAmount = '';
    for (const line of lines) {
      const match = line.match(amountPattern);
      if (match) {
        totalAmount = match[0].replace(/[^0-9]/g, '');
        break;
      }
    }

    // 品目を抽出（金額を含む行）
    const itemPattern = /(.+?)\s+[¥￥]?([\d,]+)/;
    const items = [];
    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match && !line.match(/合計|小計|税込|税抜|計/)) {
        items.push({
          name: match[1].trim(),
          amount: match[2].replace(/,/g, '')
        });
      }
    }

    setReceiptData({
      store_name: storeName,
      date: date,
      total_amount: totalAmount,
      items: items.slice(0, 10), // 最大10品目
      notes: ''
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      // 経費データとして保存
      await api.post('/expenses', {
        date: receiptData.date,
        vendor: receiptData.store_name,
        amount: receiptData.total_amount,
        category: '仕入',
        description: receiptData.notes,
        receipt_image: imagePreview
      });

      alert('領収書データを保存しました');
      handleReset();
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('保存に失敗しました');
    }
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setOcrResult(null);
    setReceiptData({
      store_name: '',
      date: '',
      total_amount: '',
      items: [],
      notes: ''
    });
    setEditMode(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>領収書OCR</h1>
      </div>

      {/* アップロードエリア */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
          {!imagePreview ? (
            <>
              <Camera size={48} style={{ color: '#999', margin: '0 auto 20px' }} />
              <p style={{ marginBottom: '20px', color: '#666' }}>領収書の写真をアップロードしてください</p>
              <label style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 20px', 
                background: '#1890ff', 
                color: 'white', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                <Upload size={18} />
                画像を選択
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          ) : (
            <div>
              <img src={imagePreview} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '400px', marginBottom: '20px' }} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  onClick={handleOCR}
                  disabled={loading}
                  style={{ 
                    padding: '10px 20px', 
                    background: loading ? '#999' : '#52c41a', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: loading ? 'not-allowed' : 'pointer' 
                  }}>
                  {loading ? `解析中... ${progress}%` : 'OCR実行'}
                </button>
                <button 
                  onClick={handleReset}
                  style={{ padding: '10px 20px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  リセット
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 解析結果 */}
      {editMode && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={20} />
              抽出データ（編集可能）
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>店舗名</label>
              <input 
                type="text" 
                value={receiptData.store_name}
                onChange={(e) => setReceiptData({ ...receiptData, store_name: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>日付</label>
              <input 
                type="date" 
                value={receiptData.date}
                onChange={(e) => setReceiptData({ ...receiptData, date: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>合計金額</label>
              <input 
                type="number" 
                value={receiptData.total_amount}
                onChange={(e) => setReceiptData({ ...receiptData, total_amount: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* 品目リスト */}
          {receiptData.items.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>品目一覧</label>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#fafafa' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>品名</th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #f0f0f0' }}>金額</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px' }}>{item.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>¥{Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>備考</label>
            <textarea 
              value={receiptData.notes}
              onChange={(e) => setReceiptData({ ...receiptData, notes: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
              placeholder="メモを入力してください"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleReset}
              style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              キャンセル
            </button>
            <button 
              onClick={handleSave}
              style={{ padding: '10px 20px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Check size={18} />
              保存
            </button>
          </div>
        </div>
      )}

      {/* OCR生テキスト（デバッグ用） */}
      {ocrResult && (
        <details style={{ marginTop: '20px', background: 'white', padding: '15px', borderRadius: '8px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>OCR生テキスト（デバッグ用）</summary>
          <pre style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', overflow: 'auto' }}>
            {ocrResult}
          </pre>
        </details>
      )}
    </div>
  );
}
