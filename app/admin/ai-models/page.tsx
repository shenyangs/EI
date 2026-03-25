"use client";

import { useState, useEffect } from 'react';

interface AIModel {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: string;
}

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'minimax',
    model: '',
    baseUrl: '',
    apiKey: '',
    isDefault: false
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingModel ? `/api/ai/models/${editingModel.id}` : '/api/ai/models';
      const method = editingModel ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchModels();
        setEditingModel(null);
        setFormData({
          name: '',
          provider: 'minimax',
          model: '',
          baseUrl: '',
          apiKey: '',
          isDefault: false
        });
      }
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  };

  const handleEdit = (model: AIModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      model: model.model,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      isDefault: model.isDefault
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模型吗？')) {
      try {
        const response = await fetch(`/api/ai/models/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchModels();
        }
      } catch (error) {
        console.error('Failed to delete model:', error);
      }
    }
  };

  const handleTestConnection = async (model: AIModel) => {
    try {
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(model)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.success ? '连接成功！' : '连接失败：' + result.error);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      alert('测试连接失败');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI 模型配置管理</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">{editingModel ? '编辑模型' : '添加新模型'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="minimax">Minimax</option>
                <option value="google">Google (Gemini)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="如：MiniMax-M2.7, gpt-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API 基础 URL</label>
              <input
                type="text"
                name="baseUrl"
                value={formData.baseUrl}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="如：https://api.minimaxi.com/v1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">设为默认模型</span>
              </label>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingModel ? '更新模型' : '添加模型'}
            </button>
            {editingModel && (
              <button
                type="button"
                onClick={() => {
                  setEditingModel(null);
                  setFormData({
                    name: '',
                    provider: 'minimax',
                    model: '',
                    baseUrl: '',
                    apiKey: '',
                    isDefault: false
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">已配置的模型</h2>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无配置的模型</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    供应商
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模型
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {models.map(model => (
                  <tr key={model.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{model.name}</span>
                        {model.isDefault && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                            默认
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {model.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {model.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        已配置
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleTestConnection(model)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          测试
                        </button>
                        <button
                          onClick={() => handleEdit(model)}
                          className="text-green-600 hover:text-green-900"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(model.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
