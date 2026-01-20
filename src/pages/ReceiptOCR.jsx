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

  // 画像の前処理（コントラスト強調、ノイズ除去）
  const preprocessImage = (imageFile) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 高解像度化
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        
        // 画像を拡大して描画
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // ピクセルデータを取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // グレースケール化 + コントラスト強調
        for (let i = 0; i < data.length; i += 4) {
          // グレースケール
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // コントラスト強調（閾値処理）
          const threshold = 128;
          const enhanced = gray > threshold ? 255 : 0;
          
          data[i] = enhanced;     // R
          data[i + 1] = enhanced; // G
          data[i + 2] = enhanced; // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  };

  // 画像を圧縮してBase64に変換
  const compressImage = (imageFile) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 最大幅を1200pxに制限（アスペクト比維持）
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG形式で圧縮（品質80%）
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedBase64);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  };

  // AI解析（推奨）
  const handleAIAnalyze = async () => {
    if (!image) {
      alert('画像を選択してください');
      return;
    }

    setLoading(true);
    setProgress(50); // AI解析は進捗が見えないので固定値

    try {
      console.log('画像を圧縮中...');
      const compressedImage = await compressImage(image);
      console.log('圧縮後のサイズ:', (compressedImage.length / 1024).toFixed(2), 'KB');
      
      console.log('AI解析開始...');
      
      // 圧縮画像を使用
      const response = await api.post('/ocr/analyze', {
        image: compressedImage
      });

      console.log('AI解析結果:', response.data);
      
      if (response.data.success && response.data.data) {
        const aiData = response.data.data;
        
        setReceiptData({
          store_name: user?.username || '13湯麺集TSUDOI', // ログインユーザー名を使用
          recipient_name: aiData.recipient_name || '',
          date: aiData.date || '',
          total_amount: aiData.total_amount || '',
          purpose: aiData.purpose || '',
          items: [],
          notes: ''
        });
        
        setOcrResult(response.data.raw); // デバッグ用に生のAI応答を保存
        setEditMode(true);
        
        alert('✅ AI解析完了！\n\n抽出されたデータを確認してください。');
      } else {
        throw new Error('AI応答が不正です');
      }
      
    } catch (error) {
      console.error('AI解析エラー:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert('AI解析に失敗しました: ' + errorMessage + '\n\n従来のOCRをお試しください。');
    } finally {
      setLoading(false);
      setProgress(0);
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
      // 画像の前処理
      console.log('画像を前処理中...');
      const processedImage = await preprocessImage(image);
      
      // Lazy load Tesseract
      const TesseractModule = await loadTesseract();
      
      // OCR実行（前処理済み画像を使用）
      const result = await TesseractModule.recognize(
        processedImage,
        'jpn+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
          // OCR精度向上のための設定
          tessedit_pageseg_mode: TesseractModule.PSM.AUTO,
          // ホワイトリストを削除（制限しすぎると誤認識の原因になる）
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

    // 名目/但し書きを探す（超強化版）
    console.log('========== 名目抽出開始 ==========');
    let purpose = '';
    const purposeCandidates = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // パターン1: 「但し」を含む行
      if (line.includes('但し')) {
        const extracted = line
          .replace(/^.*但し[:\s　]*/, '')
          .replace(/上記.*/, '')
          .replace(/正に.*/, '')
          .replace(/受領.*/, '')
          .replace(/頂.*/, '')
          .trim();
        if (extracted.length >= 2 && extracted.length <= 50) {
          purposeCandidates.push({
            text: extracted,
            line: line,
            pattern: 'パターン1: 但し'
          });
        }
      }
      
      // パターン2: 「として」を含む行
      if (line.includes('として')) {
        const extracted = line
          .replace(/^.*として[:\s　]*/, '')
          .replace(/上記.*/, '')
          .replace(/正に.*/, '')
          .trim();
        // 「として」の前の部分も候補に
        const beforeExtracted = line
          .replace(/として.*/, '')
          .replace(/^.*但し[:\s　]*/, '')
          .trim();
        
        if (extracted.length >= 2 && extracted.length <= 50) {
          purposeCandidates.push({
            text: extracted,
            line: line,
            pattern: 'パターン2: として（後）'
          });
        }
        if (beforeExtracted.length >= 2 && beforeExtracted.length <= 50) {
          purposeCandidates.push({
            text: beforeExtracted + 'として',
            line: line,
            pattern: 'パターン2: として（前）'
          });
        }
      }
      
      // パターン3: 「内容」「摘要」「品目」を含む行
      if (line.match(/内容|摘要|品目/)) {
        const extracted = line
          .replace(/^.*内容[:\s　]*/, '')
          .replace(/^.*摘要[:\s　]*/, '')
          .replace(/^.*品目[:\s　]*/, '')
          .trim();
        if (extracted.length >= 2 && extracted.length <= 50) {
          purposeCandidates.push({
            text: extracted,
            line: line,
            pattern: 'パターン3: 内容/摘要/品目'
          });
        }
      }
      
      // パターン4: 「代」を含む行（「〇〇代として」のような形式）
      if (line.includes('代') && !line.match(/時代|世代|代表|代理/)) {
        const extracted = line
          .replace(/として.*/, '')
          .replace(/^.*但し[:\s　]*/, '')
          .trim();
        if (extracted.length >= 2 && extracted.length <= 50) {
          purposeCandidates.push({
            text: extracted,
            line: line,
            pattern: 'パターン4: 〇〇代'
          });
        }
      }
    }
    
    console.log('名目候補:', purposeCandidates);
    
    // 最も適切な候補を選択（長さと内容で判断）
    if (purposeCandidates.length > 0) {
      // 「として」で終わる候補を優先
      const withToshite = purposeCandidates.find(c => c.text.endsWith('として'));
      if (withToshite) {
        purpose = withToshite.text;
        console.log('✓ 選択された名目（として優先）:', purpose);
      } else {
        // 最も長い候補を選択
        purpose = purposeCandidates.sort((a, b) => b.text.length - a.text.length)[0].text;
        console.log('✓ 選択された名目（長さ優先）:', purpose);
      }
    } else {
      console.log('⚠ 名目が検出できませんでした');
    }
    
    console.log('========== 名目抽出終了 ==========');
    
    // 金額を探す（超強化版 - すべての金額候補を収集）
    console.log('========== 金額抽出開始 ==========');
    const amountCandidates = [];
    
    // 全行をスキャンして、すべての数字パターンを収集
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = i > 0 ? lines[i - 1] : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      
      // パターン1: ¥ または ￥ で始まる金額
      const pattern1 = line.match(/[¥￥]\s*([\d,]+)/g);
      if (pattern1) {
        pattern1.forEach(match => {
          const amount = match.replace(/[^0-9]/g, '');
          if (amount) {
            amountCandidates.push({
              amount: parseInt(amount),
              line: line,
              context: `前行: ${prevLine} | 現在: ${line} | 次行: ${nextLine}`,
              pattern: 'パターン1: ¥記号付き'
            });
          }
        });
      }
      
      // パターン2: 「合計」「税込」などのキーワード付き
      if (line.match(/合計|総額|税込|ご請求|お支払|金額/i)) {
        const pattern2 = line.match(/[\d,]+/g);
        if (pattern2) {
          pattern2.forEach(match => {
            const amount = match.replace(/[^0-9]/g, '');
            if (amount && amount.length >= 3) {
              amountCandidates.push({
                amount: parseInt(amount),
                line: line,
                context: `前行: ${prevLine} | 現在: ${line} | 次行: ${nextLine}`,
                pattern: 'パターン2: キーワード付き'
              });
            }
          });
        }
      }
      
      // パターン3: 大きな数字（4桁以上、カンマ区切り）
      const pattern3 = line.match(/[\d,]{4,}/g);
      if (pattern3) {
        pattern3.forEach(match => {
          const amount = match.replace(/[^0-9]/g, '');
          if (amount && amount.length >= 4) {
            amountCandidates.push({
              amount: parseInt(amount),
              line: line,
              context: `前行: ${prevLine} | 現在: ${line} | 次行: ${nextLine}`,
              pattern: 'パターン3: 大きな数字'
            });
          }
        });
      }
      
      // パターン4: 「円」の直前の数字
      const pattern4 = line.match(/([\d,]+)\s*円/g);
      if (pattern4) {
        pattern4.forEach(match => {
          const amount = match.replace(/[^0-9]/g, '');
          if (amount) {
            amountCandidates.push({
              amount: parseInt(amount),
              line: line,
              context: `前行: ${prevLine} | 現在: ${line} | 次行: ${nextLine}`,
              pattern: 'パターン4: 円の直前'
            });
          }
        });
      }
    }
    
    // 重複を除去し、金額でソート
    const uniqueAmounts = [...new Set(amountCandidates.map(c => c.amount))]
      .filter(amount => amount >= 100 && amount <= 100000000)
      .sort((a, b) => b - a);
    
    console.log('全金額候補:', uniqueAmounts);
    console.log('金額候補の詳細:', amountCandidates.filter(c => c.amount >= 100 && c.amount <= 100000000));
    
    // 最大値を採用（領収書の合計金額は通常最大値）
    let totalAmount = '';
    let maxAmount = 0;
    
    if (uniqueAmounts.length > 0) {
      maxAmount = uniqueAmounts[0];
      totalAmount = maxAmount.toString();
      console.log('✓ 選択された金額:', maxAmount);
    } else {
      console.log('⚠ 金額が検出できませんでした');
    }
    
    console.log('========== 金額抽出終了 ==========');

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
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleAIAnalyze}
                  disabled={loading}
                  style={{ 
                    padding: '10px 20px', 
                    background: loading ? '#999' : '#1890ff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                  {loading && progress === 50 ? '🤖 AI解析中...' : '🤖 AI解析（推奨）'}
                </button>
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
                  {loading && progress !== 50 ? `🔄 解析中... ${progress}%` : '🔍 従来OCR'}
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
              <div style={{ marginTop: '15px', padding: '10px', background: '#e6f7ff', borderRadius: '4px', fontSize: '13px', color: '#0050b3' }}>
                💡 <strong>推奨：</strong> 「AI解析」ボタンは様々な領収書フォーマットに対応できます。従来OCRはパターンが限定されます。
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
