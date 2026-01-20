-- 仕入先初期データ

-- 1. 中延園食品
INSERT INTO suppliers (
  supplier_type,
  name,
  postal_code,
  address,
  phone,
  email,
  payment_terms,
  notes
) VALUES (
  '食品',
  '中延園食品',
  '224-0057',
  '神奈川県横浜市都筑区川和町303',
  '0459342391',
  '',
  30,
  '銀行：三井住友銀行 荏原支店 普通 0868811 カ）ナカノブエンショクヒン'
);

-- 2. 菅野製麺所
INSERT INTO suppliers (
  supplier_type,
  name,
  postal_code,
  address,
  phone,
  email,
  payment_terms,
  notes
) VALUES (
  '製麺',
  '菅野製麺所',
  '252-0239',
  '神奈川県相模原市中央区中央２丁目５−１１',
  '0428513724',
  '',
  30,
  '神奈川営業所 銀行：相模原市農業協同組合 中央支店 普通 0037150 カブシキガイシヤ カンノセイメンジョ カナガワエイギョウショ ダ'
);

-- 3. 東京ジョーカー
INSERT INTO suppliers (
  supplier_type,
  name,
  postal_code,
  address,
  phone,
  email,
  payment_terms,
  notes
) VALUES (
  '卸売',
  '東京ジョーカー',
  '103-0027',
  '東京都中央区日本橋3-2-14日本橋KNビル4F',
  '0352013643',
  '',
  30,
  '銀行：三菱UFJ銀行 秋葉原支店 普通 4511782 トウキョウジョーカー （カ'
);
