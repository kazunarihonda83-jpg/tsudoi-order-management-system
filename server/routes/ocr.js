import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import fetch from 'node-fetch';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

const router = express.Router();

// Load OpenAI configuration
function loadOpenAIConfig() {
  const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
  if (fs.existsSync(configPath)) {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    return {
      apiKey: config?.openai?.api_key || process.env.OPENAI_API_KEY,
      baseURL: config?.openai?.base_url || process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
    };
  }
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  };
}

// AI解析エンドポイント
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '画像データが必要です' });
    }

    const config = loadOpenAIConfig();
    
    if (!config.apiKey) {
      return res.status(500).json({ error: 'OpenAI APIキーが設定されていません' });
    }

    console.log('AI解析開始...');
    console.log('Base URL:', config.baseURL);

    // OpenAI Vision APIで領収書を解析
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `あなたは領収書解析の専門家です。領収書の画像から以下の情報を正確に抽出してください：

1. 宛名（recipient_name）: 「様」「殿」の前の名前
2. 発行日（date）: YYYY-MM-DD形式で
3. 合計金額（total_amount）: 数字のみ（カンマなし）
4. 名目（purpose）: 但し書き、「として」の前の文字列

必ず以下のJSON形式で返してください：
{
  "recipient_name": "山田太郎",
  "date": "2022-04-01",
  "total_amount": "5500",
  "purpose": "書籍代として"
}

注意事項：
- 内訳の金額ではなく、最終的な合計金額を抽出
- 税込金額を優先
- 名目は「として」を含めて抽出
- 日付は必ずYYYY-MM-DD形式に変換`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'この領収書から情報を抽出してください。'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'AI解析に失敗しました',
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('AI解析完了:', data);
    
    const content = data.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'AI応答が空です' });
    }

    // JSONを抽出（```json ... ```で囲まれている場合に対応）
    let extractedData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('元の内容:', content);
      return res.status(500).json({ 
        error: 'AI応答のJSON解析に失敗しました',
        raw_content: content 
      });
    }

    res.json({
      success: true,
      data: extractedData,
      raw: content
    });

  } catch (error) {
    console.error('AI解析エラー:', error);
    res.status(500).json({ 
      error: 'AI解析中にエラーが発生しました',
      message: error.message 
    });
  }
});

export default router;
