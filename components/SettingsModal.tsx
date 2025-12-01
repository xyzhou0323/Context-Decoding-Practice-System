
import React, { useState, useEffect } from 'react';
import { ApiConfig, ApiProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ApiConfig) => void;
  currentConfig: ApiConfig | null;
}

const PRESETS = [
  { id: 'custom', name: '自定义配置 (Custom)', baseUrl: '', model: '' },
  // SiliconFlow Series
  { id: 'siliconflow-deepseek-v3', name: 'SiliconFlow - DeepSeek V3 (推荐)', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { id: 'siliconflow-deepseek-r1', name: 'SiliconFlow - DeepSeek R1 (强推理版)', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-R1' },
  { id: 'siliconflow-qwen-72b', name: 'SiliconFlow - Qwen 2.5 72B (通义千问)', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct' },
  { id: 'siliconflow-qwen-7b', name: 'SiliconFlow - Qwen 2.5 7B (快速/省流)', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
  
  // Other Providers
  { id: 'deepseek', name: 'DeepSeek (官方)', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'aliyun', name: '阿里云百炼 (通义千问)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'zhipu', name: '智谱 AI (GLM-4)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  { id: 'openai', name: 'OpenAI (官方)', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [provider, setProvider] = useState<ApiProvider>('Free');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.siliconflow.cn/v1');
  const [modelName, setModelName] = useState('deepseek-ai/DeepSeek-V3');
  const [selectedPreset, setSelectedPreset] = useState('custom');

  // Helper to load saved custom preferences
  const loadSavedCustomPrefs = () => {
    return {
      savedBaseUrl: localStorage.getItem('neuroxyz_custom_base_url'),
      savedModelName: localStorage.getItem('neuroxyz_custom_model_name')
    };
  };

  useEffect(() => {
    if (currentConfig) {
      setProvider(currentConfig.provider);
      setApiKey(currentConfig.apiKey || '');

      const { savedBaseUrl, savedModelName } = loadSavedCustomPrefs();
      
      // Logic to determine initial values for Custom fields:
      // 1. If current config IS Custom, use its values.
      // 2. If current config is NOT Custom (e.g. Free/Google), try to use last saved custom prefs from localStorage.
      // 3. Fallback to default SiliconFlow settings.
      const initialBaseUrl = (currentConfig.provider === 'Custom' ? currentConfig.baseUrl : savedBaseUrl) || 'https://api.siliconflow.cn/v1';
      const initialModelName = (currentConfig.provider === 'Custom' ? currentConfig.modelName : savedModelName) || 'deepseek-ai/DeepSeek-V3';

      setBaseUrl(initialBaseUrl);
      setModelName(initialModelName);

      // Try to match existing config to a preset
      const match = PRESETS.find(p => p.baseUrl === initialBaseUrl && p.model === initialModelName);
      setSelectedPreset(match ? match.id : 'custom');
    }
  }, [currentConfig, isOpen]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPreset(presetId);
    
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setBaseUrl(preset.baseUrl);
      setModelName(preset.model);
    }
  };

  const handleManualChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setSelectedPreset('custom');
  };

  const handleSave = () => {
    // Only require key if NOT free
    if (provider !== 'Free' && !apiKey.trim()) {
      alert("请输入 API Key");
      return;
    }

    // Persist Custom Fields for convenience if user is using Custom provider
    if (provider === 'Custom') {
      localStorage.setItem('neuroxyz_custom_base_url', baseUrl);
      localStorage.setItem('neuroxyz_custom_model_name', modelName);
    }

    onSave({
      provider,
      apiKey,
      baseUrl: provider === 'Custom' ? baseUrl : undefined,
      modelName: provider === 'Custom' ? modelName : undefined
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1f2042] w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border border-neuro-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#16162c]">
          <h2 className="text-xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-2 text-neuro-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            API 设置
          </h2>
          <button onClick={onClose} className="text-neuro-muted hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-bold text-neuro-muted uppercase tracking-wider mb-4">
              选择服务提供商
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setProvider('Free')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  provider === 'Free' 
                    ? 'bg-green-500/20 border-green-500 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                    : 'bg-[#2a2b55] border-transparent text-neuro-muted hover:border-neuro-muted'
                }`}
              >
                <div className="font-bold text-lg mb-1">🚀 免费体验</div>
                <div className="text-xs opacity-80">系统内置 Key<br/>支持图文生成</div>
              </button>

              <button
                onClick={() => setProvider('Google')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  provider === 'Google' 
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'bg-[#2a2b55] border-transparent text-neuro-muted hover:border-neuro-muted'
                }`}
              >
                <div className="font-bold text-lg mb-1">Google Gemini</div>
                <div className="text-xs opacity-80">需官方 Key<br/>支持图文生成</div>
              </button>

              <button
                onClick={() => setProvider('Custom')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  provider === 'Custom' 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                    : 'bg-[#2a2b55] border-transparent text-neuro-muted hover:border-neuro-muted'
                }`}
              >
                <div className="font-bold text-lg mb-1">Custom API</div>
                <div className="text-xs opacity-80">OpenAI 格式<br/>仅支持文字 (推荐硅基流动)</div>
              </button>
            </div>
          </div>

          {/* Configuration Fields */}
          <div className="space-y-4 animate-fade-in">
            
            {provider === 'Free' && (
               <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div>
                          <p className="text-sm text-green-200 font-bold mb-1">已启用内置免费模式</p>
                          <p className="text-xs text-green-300/80 leading-relaxed">
                              系统自动调用内置的 Google Gemini 模型。无需配置即可开始使用。
                          </p>
                      </div>
                  </div>

                  <div className="pl-8 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                          <span className="mr-1">📝</span> 文字场景分析
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                          <span className="mr-1">🎨</span> 漫画插图生成
                      </span>
                  </div>

                  <div className="pl-8 pt-2 border-t border-green-500/10">
                      <p className="text-xs text-green-300/60 flex items-start">
                          <svg className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          注意：此模式使用公共免费额度，请求频率受限。如果遇到 429 (Quota Exceeded) 错误，请稍作休息或切换到其他提供商。
                      </p>
                  </div>
               </div>
            )}

            {provider === 'Custom' && (
              <div className="space-y-4 pt-2">
                 <div>
                    <label className="block text-xs font-bold text-neuro-muted uppercase tracking-wider mb-2">
                        快速预设 (Presets)
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedPreset}
                            onChange={handlePresetChange}
                            className="w-full bg-[#16162c] border border-neuro-border text-white rounded-lg px-4 py-3 appearance-none focus:outline-none focus:border-neuro-primary focus:ring-1 focus:ring-neuro-primary"
                        >
                            {PRESETS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neuro-muted">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-neuro-muted uppercase tracking-wider mb-2">
                            Base URL
                        </label>
                        <input 
                            type="text" 
                            value={baseUrl}
                            onChange={(e) => handleManualChange(setBaseUrl, e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full bg-[#16162c] border border-neuro-border text-white rounded-lg px-4 py-3 focus:outline-none focus:border-neuro-primary focus:ring-1 focus:ring-neuro-primary placeholder-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neuro-muted uppercase tracking-wider mb-2">
                            Model Name
                        </label>
                        <input 
                            type="text" 
                            value={modelName}
                            onChange={(e) => handleManualChange(setModelName, e.target.value)}
                            placeholder="gpt-3.5-turbo"
                            className="w-full bg-[#16162c] border border-neuro-border text-white rounded-lg px-4 py-3 focus:outline-none focus:border-neuro-primary focus:ring-1 focus:ring-neuro-primary placeholder-gray-600"
                        />
                    </div>
                 </div>
              </div>
            )}

            {provider !== 'Free' && (
                <div>
                    <label className="block text-xs font-bold text-neuro-muted uppercase tracking-wider mb-2">
                        API Key <span className="text-red-400">*</span>
                    </label>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={provider === 'Google' ? "AIzaSy..." : "sk-..."}
                        className="w-full bg-[#16162c] border border-neuro-border text-white rounded-lg px-4 py-3 focus:outline-none focus:border-neuro-primary focus:ring-1 focus:ring-neuro-primary placeholder-gray-600"
                    />
                    <p className="text-xs text-neuro-muted mt-2 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        Key 仅存储在您的本地浏览器中，绝不会上传至其他服务器。
                    </p>
                </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-[#16162c] flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-neuro-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2 bg-neuro-primary hover:bg-neuro-primaryHover text-white font-bold rounded-lg shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
