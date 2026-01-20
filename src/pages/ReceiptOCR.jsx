import { useState } from 'react';
import { Camera, Upload, Check, X, Edit, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

let Tesseract = null;

// Lazy load Tesseract.js
const loadTesseract = async () => {
  if (!Tesseract) {
    try {
      const module = await import('tesseract.js');
      Tesseract = module.default || module;
    } catch (error) {
      console.error('Failed to load Tesseract.js:', error);
      throw new Error('OCRライブラリの読み込みに失敗しました');
    }
  }
  return Tesseract;
};

export default function ReceiptOCR() {
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [receiptData, setReceiptData] = useState({
    store_name: '',
    recipient_name: '', // 宛名を追加
    date: '',
    total_amount: '',
    purpose: '', // 名目/但し書きを追加
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
      // Lazy load Tesseract
      const TesseractModule = await loadTesseract();
      
      // 画像の前処理オプション付きでOCR実行（精度向上）
      const result = await TesseractModule.recognize(
        image,
        'jpn+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
          // OCR精度向上のための設定
          tessedit_pageseg_mode: TesseractModule.PSM.AUTO,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ一二三四五六七八九十百千万円年月日時分¥￥,.-/:()（）'
        }
      );

      console.log('OCR Result:', result.data.text);
      setOcrResult(result.data.text);
      parseReceiptData(result.data.text);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('OCR処理に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const parseReceiptData = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    console.log('========== OCR Parse Start ==========');
    console.log('Total lines:', lines.length);
    console.log('All lines:', lines);
    
    // 宛名を探す（「様」「殿」を含む行から抽出）
    let recipientName = '';
    for (const line of lines) {
      if (line.includes('様') || line.includes('殿')) {
        // 「様」「殿」の前の文字列を抽出
        recipientName = line
          .replace(/様.*/, '')
          .replace(/殿.*/, '')
          .replace(/^.*宛名[:\s　]*/, '')  // 「宛名: つばめ太郎 様」のような場合
          .trim();
        
        // 有効な宛名か確認（2文字以上、20文字以内）
        if (recipientName.length >= 2 && recipientName.length <= 20) {
          console.log('✓ Recipient found:', recipientName, '(from line:', line + ')');
          break;
        }
      }
    }
    console.log('Detected recipient:', recipientName);
    
    // 店舗名を探す（下部の発行者情報から抽出）
    // 除外キーワード: 領収書、No、発行日、但し、宛名など
    const excludeStoreKeywords = /^(領収|レシート|receipt|No\.|発行日|但し|宛名|お客様|ご利用|明細|合計|小計|税込|税抜|お預|お釣|上記|正に|受領|内容|金額|印紙|収入|消費税)/i;
    let storeName = '';
    
    // 戦略1: 「株式会社」「有限会社」を含む行を最優先
    for (const line of lines) {
      if ((line.includes('株式会社') || line.includes('有限会社') || line.includes('合同会社') || line.includes('合資会社')) && 
          !excludeStoreKeywords.test(line) &&
          line.length >= 5) {  // 最低5文字以上
        storeName = line.trim();
        break;
      }
    }
    
    // 戦略2: 下から10行目付近で電話番号/住所/郵便番号の直前の行を探す（発行者情報）
    if (!storeName) {
      for (let i = Math.max(0, lines.length - 15); i < lines.length; i++) {
        const line = lines[i];
        // 電話番号や住所、郵便番号のパターン
        if (line.match(/〒\d|TEL[:\s]*\d|電話[:\s]*\d|℡|住所|登録番号/)) {
          // その直前の行を店舗名候補とする
          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            const candidateLine = lines[j];
            if (candidateLine.length >= 3 && 
                !excludeStoreKeywords.test(candidateLine) &&
                !candidateLine.match(/^\d+$/) &&  // 数字のみの行は除外
                !candidateLine.match(/^[¥￥\d,\s-]+$/)) {  // 金額のみの行も除外
              storeName = candidateLine.trim();
              break;
            }
          }
          if (storeName) break;
        }
      }
    }
    
    // 戦略3: 「印」を含む行の直前の行（社印がある場合）
    if (!storeName) {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('印') && lines[i].length < 5) {
          const candidateLine = lines[i-1];
          if (candidateLine.length >= 3 && 
              !excludeStoreKeywords.test(candidateLine)) {
            storeName = candidateLine.trim();
            break;
          }
        }
      }
    }
    
    // 戦略4: 上から3行目以降で最初の有効な行（但し「領収書」タイトルは除外）
    if (!storeName) {
      for (let i = 2; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        if (line.length >= 3 && 
            !line.match(/^\d/) && 
            !line.match(/^[¥￥]/) &&
            !line.includes('様') &&
            !excludeStoreKeywords.test(line)) {
          storeName = line.trim();
          break;
        }
      }
    }
    
    console.log('✓ Store name detected:', storeName);
    
    // 日付を探す（より柔軟なパターン）
    const datePatterns = [
      /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,  // 2024年1月20日 or 2024/1/20
      /(\d{2})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,  // 24年1月20日 or 24/1/20
      /(\d{4})(\d{2})(\d{2})/  // 20240120
    ];
    
    let date = '';
    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          let year = match[1];
          // 2桁年の場合は2000年代に変換
          if (year.length === 2) {
            year = '20' + year;
          }
          date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          break;
        }
      }
      if (date) break;
    }
    
    // 今日の日付をデフォルトに設定
    if (!date) {
      const today = new Date();
      date = today.toISOString().split('T')[0];
      console.log('⚠ Date not found, using today:', date);
    } else {
      console.log('✓ Date detected:', date);
    }

    // 名目/但し書きを探す（「但し」「として」「代として」を含む行）
    let purpose = '';
    for (const line of lines) {
      // より柔軟なパターンマッチング
      if (line.match(/但し|として|代として|内容|摘要|品目/)) {
        // 「但し」や「として」の前後の文字列を抽出
        let extracted = line
          .replace(/^.*但し[:\s　]*/, '')
          .replace(/^.*として[:\s　]*/, '')
          .replace(/^.*内容[:\s　]*/, '')
          .replace(/^.*摘要[:\s　]*/, '')
          .replace(/上記.*正に.*/, '')  // 「上記正に受領いたしました」は除外
          .replace(/受領.*/, '')
          .replace(/頂.*/, '')
          .trim();
        
        // 有効な名目か確認（2文字以上、50文字以内）
        if (extracted.length >= 2 && extracted.length <= 50) {
          purpose = extracted;
          break;
        }
      }
    }
    console.log('Detected purpose:', purpose);
    
    // 金額を探す（より精密なパターン - 最も大きい金額を優先）
    const amountPatterns = [
      // パターン1: ¥65,800- や ￥65,800ー のような形式（領収書に最も多い）
      /[¥￥]\s*([\d,]+)\s*[-－ー]/,
      // パターン2: 合計・税込の後に金額
      /(?:合計|総額|計|小計|税込金額|税込|ご請求)[:\s　]*[¥￥]?\s*([\d,]+)/i,
      // パターン3: 金額の後に合計
      /[¥￥]\s*([\d,]+)\s*(?:円)?\s*(?:合計|総額|計|小計|税込)/i,
      // パターン4: 上記 ¥65,800- 正に... のような形式
      /上記\s*[¥￥]?\s*([\d,]+)\s*[-－ー]?\s*(?:円)?\s*(?:正に|なり)/i,
      // パターン5: 金額のみ（4桁以上、ハイフン付き）
      /[¥￥]\s*([\d,]{4,})\s*[-－ー]/,
      // パターン6: 金額のみ（4桁以上）
      /(?:^|[^0-9])[¥￥]?\s*([\d,]{4,})\s*(?:円|$)/
    ];
    
    let totalAmount = '';
    let maxAmount = 0;
    
    for (const line of lines) {
      // パターンを優先順位順に試行
      for (const pattern of amountPatterns) {
        const match = line.match(pattern);
        if (match) {
          const cleanedAmount = match[1].replace(/[^0-9]/g, '');
          const amount = parseInt(cleanedAmount);
          
          // 妥当な金額範囲（100円〜1億円）かチェック
          if (!isNaN(amount) && amount >= 100 && amount <= 100000000) {
            // より大きい金額を採用（領収書の合計金額は通常最大値）
            if (amount > maxAmount) {
              maxAmount = amount;
              totalAmount = amount.toString();
            }
          }
        }
      }
    }
    
    console.log('Detected max amount:', maxAmount);

    // 品目を抽出（改善版）
    const itemPatterns = [
      /^(.+?)\s+[¥￥]?\s*([\d,]+)\s*円?$/,  // 商品名 1000円
      /^(.+?)[:\s　]+[¥￥]?\s*([\d,]+)$/,  // 商品名: 1000
      /^([^0-9¥￥]+)\s+([¥￥]?[\d,]+)$/  // 商品名 1000
    ];
    
    const items = [];
    const excludeKeywords = /合計|小計|税込|税抜|計|お預|お釣|釣銭|領収|receipt|total/i;
    
    for (const line of lines) {
      if (excludeKeywords.test(line)) continue;
      
      for (const pattern of itemPatterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1].trim();
          const amount = match[2].replace(/[^0-9]/g, '');
          
          // 金額が妥当な範囲内（10円〜100万円）かチェック
          const amountNum = parseInt(amount);
          if (name.length > 0 && amountNum >= 10 && amountNum <= 1000000) {
            items.push({
              id: Date.now() + Math.random(), // ユニークID
              name: name,
              amount: amount
            });
            break;
          }
        }
      }
    }
    
    console.log('========== OCR Parse Summary ==========');
    console.log('Store Name (from OCR):', storeName);
    console.log('Store Name (using login user):', user?.username || '未ログイン');
    console.log('Recipient Name:', recipientName);
    console.log('Date:', date);
    console.log('Total Amount:', totalAmount);
    console.log('Purpose:', purpose);
    console.log('Items:', items);
    console.log('=======================================');

    setReceiptData({
      store_name: user?.username || '13湯麺集TSUDOI', // ログインユーザー名を使用
      recipient_name: recipientName,
      date: date,
      total_amount: totalAmount,
      purpose: purpose,
      items: items.slice(0, 20), // 最大20品目
      notes: ''
    });
    setEditMode(true);
  };

  // 品目の追加
  const handleAddItem = () => {
    setReceiptData({
      ...receiptData,
      items: [...receiptData.items, { id: Date.now(), name: '', amount: '' }]
    });
  };

  // 品目の削除
  const handleRemoveItem = (id) => {
    setReceiptData({
      ...receiptData,
      items: receiptData.items.filter(item => item.id !== id)
    });
  };

  // 品目の編集
  const handleItemChange = (id, field, value) => {
    setReceiptData({
      ...receiptData,
      items: receiptData.items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const handleSave = async () => {
    // バリデーション
    if (!receiptData.store_name || !receiptData.date || !receiptData.total_amount) {
      alert('店舗名、日付、合計金額は必須です');
      return;
    }

    // 金額の検証
    const amount = parseInt(receiptData.total_amount);
    if (isNaN(amount) || amount <= 0) {
      alert('合計金額が正しくありません');
      return;
    }

    setSaving(true);
    
    try {
      // 説明文を構築
      let description = receiptData.purpose || '';
      if (receiptData.recipient_name) {
        description = `宛名: ${receiptData.recipient_name}` + (description ? ` | ${description}` : '');
      }
      if (receiptData.items.length > 0) {
        description += (description ? ' | ' : '') + `品目: ${receiptData.items.map(i => i.name).join(', ')}`;
      }
      if (receiptData.notes) {
        description += (description ? ' | ' : '') + receiptData.notes;
      }

      console.log('Saving receipt data:', {
        date: receiptData.date,
        vendor: receiptData.store_name,
        amount: amount,
        category: '仕入',
        description: description,
        receipt_image: imagePreview ? imagePreview.substring(0, 100) + '...' : null
      });

      const response = await api.post('/expenses', {
        date: receiptData.date,
        vendor: receiptData.store_name,
        amount: amount,
        category: '仕入',
        description: description,
        receipt_image: imagePreview
      });

      console.log('Save response:', response);
      alert('✅ 領収書データを保存しました');
      handleReset();
    } catch (error) {
      console.error('Error saving receipt:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('❌ 保存に失敗しました: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setOcrResult(null);
    setReceiptData({
      store_name: user?.username || '13湯麺集TSUDOI', // ログインユーザー名を使用
      recipient_name: '',
      date: '',
      total_amount: '',
      purpose: '',
      items: [],
      notes: ''
    });
    setEditMode(false);
    setProgress(0);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>領収書OCR</h1>
        <div style={{ fontSize: '14px', color: '#666' }}>
          画像から領収書データを自動抽出します
        </div>
      </div>

      {/* アップロードエリア */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
          {!imagePreview ? (
            <>
              <Camera size={48} style={{ color: '#999', margin: '0 auto 20px' }} />
              <p style={{ marginBottom: '20px', color: '#666' }}>領収書の写真をアップロードしてください</p>
              <p style={{ marginBottom: '20px', fontSize: '12px', color: '#999' }}>
                ※ 画像は明るく、文字がはっきり見えるものを選択してください
              </p>
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
              <img src={imagePreview} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '400px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' }} />
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
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                  {loading ? `🔄 解析中... ${progress}%` : '🔍 OCR実行'}
                </button>
                <button 
                  onClick={handleReset}
                  disabled={loading}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#ff4d4f', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: loading ? 'not-allowed' : 'pointer' 
                  }}>
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
            <div style={{ fontSize: '12px', color: '#666' }}>
              ※ 内容を確認・修正してから保存してください
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                店舗名（発行者） <span style={{ color: 'red' }}>*</span>
              </label>
              <input 
                type="text" 
                value={receiptData.store_name}
                readOnly
                placeholder={user?.username || '13湯麺集TSUDOI'}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
              />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                ※ ログインユーザー名が自動設定されます
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                宛名
              </label>
              <input 
                type="text" 
                value={receiptData.recipient_name}
                onChange={(e) => setReceiptData({ ...receiptData, recipient_name: e.target.value })}
                placeholder="例: つばめ太郎"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                日付 <span style={{ color: 'red' }}>*</span>
              </label>
              <input 
                type="date" 
                value={receiptData.date}
                onChange={(e) => setReceiptData({ ...receiptData, date: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                合計金額 <span style={{ color: 'red' }}>*</span>
              </label>
              <input 
                type="number" 
                value={receiptData.total_amount}
                onChange={(e) => setReceiptData({ ...receiptData, total_amount: e.target.value })}
                placeholder="例: 65800"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                名目（但し書き）
              </label>
              <input 
                type="text" 
                value={receiptData.purpose}
                onChange={(e) => setReceiptData({ ...receiptData, purpose: e.target.value })}
                placeholder="例: 食品、備品代として"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* 品目リスト */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#333' }}>品目一覧</label>
              <button 
                onClick={handleAddItem}
                style={{ 
                  padding: '6px 12px', 
                  background: '#1890ff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                <Plus size={14} />
                品目を追加
              </button>
            </div>
            
            {receiptData.items.length > 0 ? (
              <div style={{ border: '1px solid #f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#fafafa' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #f0f0f0', width: '50%' }}>品名</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #f0f0f0', width: '35%' }}>金額（円）</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #f0f0f0', width: '15%' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="品名"
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                            placeholder="金額"
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '13px',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#ff4d4f',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999', background: '#fafafa', borderRadius: '4px' }}>
                品目が検出されませんでした。「品目を追加」ボタンで手動追加できます。
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>備考</label>
            <textarea 
              value={receiptData.notes}
              onChange={(e) => setReceiptData({ ...receiptData, notes: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                minHeight: '80px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="メモを入力してください（任意）"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleReset}
              disabled={saving}
              style={{ 
                padding: '10px 20px', 
                background: '#f0f0f0', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}>
              キャンセル
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              style={{ 
                padding: '10px 20px', 
                background: saving ? '#999' : '#52c41a', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: saving ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
              <Check size={18} />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {/* OCR生テキスト（デバッグ用） */}
      {ocrResult && (
        <details style={{ marginTop: '20px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '5px' }}>
            📄 OCR生テキスト（デバッグ用）
          </summary>
          <pre style={{ 
            marginTop: '10px', 
            padding: '15px', 
            background: '#f5f5f5', 
            borderRadius: '4px', 
            fontSize: '12px', 
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: '1px solid #e0e0e0'
          }}>
            {ocrResult}
          </pre>
        </details>
      )}
    </div>
  );
}
