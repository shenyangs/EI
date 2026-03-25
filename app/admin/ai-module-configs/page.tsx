"use client";

import { useState, useEffect } from 'react';

interface AIModel {
  id: number;
  name: string;
  provider: string;
  model: string;
}

interface AIModuleConfig {
  key: string;
  name: string;
  description: string;
  modelId: number | null;
  useAutomatic: boolean;
}

export default function AIModuleConfigsPage() {
  const [modules, setModules] = useState<AIModuleConfig[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/module-configs');
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules);
        setModels(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (moduleKey: string, modelId: number | null, useAutomatic: boolean) => {
    setSaving(moduleKey);
    try {
      const response = await fetch('/api/ai/module-configs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ moduleKey, modelId, useAutomatic })
      });

      if (response.ok) {
        await fetchConfigs();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">AI 功能模块配置</h1>
      <p className="text-gray-600 mb-8">
        为每个AI功能模块选择使用的模型，默认自动模式会根据任务类型智能选择。
      </p>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module.key}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                </div>

                <div className="flex items-center space-x-4 ml-8">
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={module.useAutomatic}
                        onChange={(e) => {
                          handleSaveConfig(
                            module.key,
                            module.modelId,
                            e.target.checked
                          );
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">自动</span>
                    </label>
                  </div>

                  <div className="min-w-[200px]">
                    <select
                      value={module.modelId || ''}
                      onChange={(e) => {
                        handleSaveConfig(
                          module.key,
                          e.target.value ? parseInt(e.target.value) : null,
                          module.useAutomatic
                        );
                      }}
                      disabled={module.useAutomatic || models.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">选择模型...</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  {saving === module.key && (
                    <div className="text-sm text-blue-600">保存中...</div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500">当前配置：</span>
                  <span className="ml-2 font-medium">
                    {module.useAutomatic ? (
                      <span className="text-green-600">自动模式</span>
                    ) : module.modelId ? (
                      <span className="text-blue-600">
                        {models.find((m) => m.id === module.modelId)?.name || '未知模型'}
                      </span>
                    ) : (
                      <span className="text-orange-600">未配置</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 使用说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>自动模式</strong>：系统会根据任务类型智能选择最适合的模型（策略类用Gemini，内容生用Minimax）</li>
          <li>• <strong>手动选择</strong>：关闭自动模式后，可以为特定功能固定使用某个模型</li>
          <li>• <strong>容错机制</strong>：无论选择哪种模式，系统都有容错机制，模型失败时会自动尝试其他可用模型</li>
        </ul>
      </div>
    </div>
  );
}
