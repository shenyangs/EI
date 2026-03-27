import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/server/db';
import { isCertificateChainError, requestTextWithCurl } from '@/lib/curl-transport';
import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function requestModel(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
  provider: string
) {
  try {
    let finalEndpoint = endpoint;
    let finalBody = body;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    };

    // 处理Gemini模型的特殊格式
    if (provider === 'google') {
      const messages = body.messages as Array<{ role?: string; content?: string }> | undefined;
      
      let fullText = '';
      if (Array.isArray(messages)) {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessage = messages.find(m => m.role === 'user');
        
        if (systemMessage?.content) {
          fullText += systemMessage.content + '\n\n';
        }
        if (userMessage?.content) {
          fullText += userMessage.content;
        }
      }
      
      finalBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: fullText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: body.temperature || 0
        }
      };

      finalEndpoint = endpoint.includes('?')
        ? `${endpoint}&key=${encodeURIComponent(apiKey)}`
        : `${endpoint}?key=${encodeURIComponent(apiKey)}`;
      headers = {
        'Content-Type': 'application/json'
      };
    }

    const response = await fetch(finalEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(finalBody),
      cache: 'no-store'
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`请求失败：${response.status} ${text}`);
    }

    const data = JSON.parse(text);
    
    // 转换Gemini响应格式为OpenAI兼容格式
    if (provider === 'google') {
      return {
        choices: [
          {
            message: {
              content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            }
          }
        ]
      } as OpenAiCompatibleResponse;
    }

    return data as OpenAiCompatibleResponse;
  } catch (error) {
    if (!isCertificateChainError(error)) {
      throw error;
    }

    let finalEndpoint = endpoint;
    let finalBody = body;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    };

    // 处理Gemini模型的特殊格式
    if (provider === 'google') {
      const messages = body.messages as Array<{ role?: string; content?: string }> | undefined;
      
      let fullText = '';
      if (Array.isArray(messages)) {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessage = messages.find(m => m.role === 'user');
        
        if (systemMessage?.content) {
          fullText += systemMessage.content + '\n\n';
        }
        if (userMessage?.content) {
          fullText += userMessage.content;
        }
      }
      
      finalBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: fullText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: body.temperature || 0
        }
      };

      finalEndpoint = endpoint.includes('?')
        ? `${endpoint}&key=${encodeURIComponent(apiKey)}`
        : `${endpoint}?key=${encodeURIComponent(apiKey)}`;
      headers = {
        'Content-Type': 'application/json'
      };
    }

    const { status, text } = await requestTextWithCurl({
      url: finalEndpoint,
      method: 'POST',
      headers,
      body: JSON.stringify(finalBody),
      timeoutSeconds: 10
    });

    if (status < 200 || status >= 300) {
      throw new Error(`请求失败：${status} ${text}`);
    }

    const data = JSON.parse(text);
    
    // 转换Gemini响应格式为OpenAI兼容格式
    if (provider === 'google') {
      return {
        choices: [
          {
            message: {
              content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            }
          }
        ]
      } as OpenAiCompatibleResponse;
    }

    return data as OpenAiCompatibleResponse;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const userType = authResponse.headers.get('X-User-Type');
    if (!userType || !checkPermission(userType, 'ai:read')) {
      return NextResponse.json(
        { ok: false, error: '没有权限测试模型连接。' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { modelId } = body;

    if (!modelId) {
      return NextResponse.json(
        { ok: false, error: '缺少模型ID' },
        { status: 400 }
      );
    }

    // 从数据库获取模型配置
    const db = await getDatabase();
    const model = await db.get('SELECT * FROM ai_models WHERE id = ?', [modelId]);

    if (!model) {
      return NextResponse.json(
        { ok: false, error: '模型不存在' },
        { status: 404 }
      );
    }

    const { baseUrl, apiKey, model: modelName, provider } = model;

    if (!baseUrl || !apiKey || !modelName) {
      return NextResponse.json(
        { ok: false, error: '模型配置不完整' },
        { status: 400 }
      );
    }

    // 根据provider确定endpoint
    let endpoint: string;
    if (provider === 'google') {
      endpoint = `${baseUrl.replace(/\/$/, '')}/models/${modelName}:generateContent`;
    } else {
      endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    }

    const data = await requestModel(endpoint, apiKey, {
      model: modelName,
      temperature: 0,
      max_tokens: 8,
      messages: [
        {
          role: 'system',
          content: '你是连通性检测助手，只回复一个"通"字。'
        },
        {
          role: 'user',
          content: '连通性检测'
        }
      ]
    }, provider);

    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (content) {
      return NextResponse.json({
        ok: true,
        success: true,
        message: '连接成功'
      });
    } else {
      return NextResponse.json({
        ok: true,
        success: false,
        error: '连接成功但未收到响应内容'
      });
    }
  } catch (error) {
    console.error('Test connection failed:', error);
    return NextResponse.json({
      ok: true,
      success: false,
      error: error instanceof Error ? error.message : '连接失败'
    });
  }
}
