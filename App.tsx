import React, { useState, useEffect, useCallback } from 'react';
import { AppState, SocialScenario, ScenarioCategory, HistoryItem, ApiConfig, QuizOption, UserPerspective } from './types';
import { generateSocialScenario, generateComicImage } from './services/geminiService';
import { LoadingScreen } from './components/LoadingScreen';
import { ScenarioCard } from './components/ScenarioCard';
import { QuizInterface } from './components/QuizInterface';
import { HistoryView } from './components/HistoryView';
import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentScenario, setCurrentScenario] = useState<SocialScenario | null>(null);
  const [lastSelectedOption, setLastSelectedOption] = useState<QuizOption | null>(null); // Track user choice
  const [scenarioImage, setScenarioImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [category, setCategory] = useState<ScenarioCategory | 'ALL'>('ALL');
  const [perspective, setPerspective] = useState<UserPerspective>('Mixed'); // New state for perspective
  const [isKidMode, setIsKidMode] = useState(false); // Kid mode state
  
  // API Configuration State
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('neuroxyz_api_config');
    if (savedConfig) {
      try {
        setApiConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse saved API config");
        setApiConfig({ provider: 'Free', apiKey: '' });
      }
    } else {
        setApiConfig({ provider: 'Free', apiKey: '' });
    }
  }, []);

  // Effect: Reset category to ALL whenever perspective changes to ensure labels match context
  useEffect(() => {
    setCategory('ALL');
  }, [perspective, isKidMode]);

  const handleSaveApiConfig = (config: ApiConfig) => {
    setApiConfig(config);
    localStorage.setItem('neuroxyz_api_config', JSON.stringify(config));
  };

  const fetchScenario = async (isFollowUp: boolean) => {
    if (!apiConfig) {
        setIsSettingsOpen(true);
        return;
    }

    try {
      setAppState(AppState.LOADING_SCENARIO);
      setErrorMsg(null);
      setScenarioImage(null);
      setViewingHistoryItem(null); 
      
      let scenario: SocialScenario;
      if (isFollowUp && currentScenario) {
        // Pass the last selected option to generate the consequence
        scenario = await generateSocialScenario(apiConfig, difficulty, category, perspective, currentScenario, lastSelectedOption || undefined, isKidMode);
      } else {
        setCurrentScenario(null); 
        setLastSelectedOption(null); // Reset selection for new scenario
        scenario = await generateSocialScenario(apiConfig, difficulty, category, perspective, undefined, undefined, isKidMode);
      }
      
      setCurrentScenario(scenario);
      // Reset selection after loading new scenario (so next follow-up tracks the new choice)
      setLastSelectedOption(null); 
      setAppState(AppState.PLAYING);

      generateComicImage(apiConfig, scenario.visualDescription)
        .then(imgUrl => setScenarioImage(imgUrl))
        .catch(err => console.error("Image gen failed silently", err));

    } catch (err: any) {
      console.error("Scenario generation error:", err);
      
      let userMessage = "生成场景时遇到意外问题，请稍后重试。";
      
      // Handle extracted string message or stringify object if raw error
      let technicalDetails = "";
      if (typeof err.message === 'string') {
          technicalDetails = err.message;
      } else {
          technicalDetails = JSON.stringify(err);
      }
      technicalDetails = technicalDetails.toLowerCase();

      const providerLabel = apiConfig?.provider === 'Custom' ? '自定义 API' : (apiConfig?.provider === 'Google' ? 'Google API' : '免费服务');

      // Updated error handling for Invalid API Keys and Quotas
      if (technicalDetails.includes("401") || technicalDetails.includes("key") || technicalDetails.includes("unauthenticated") || technicalDetails.includes("invalid_api_key")) {
         userMessage = "API Key 无效或已过期。请在右上角“设置”中检查您的 Key。";
      } else if (technicalDetails.includes("429") || technicalDetails.includes("quota") || technicalDetails.includes("exhausted") || technicalDetails.includes("insufficient_quota") || technicalDetails.includes("resource_exhausted")) {
         if (apiConfig?.provider === 'Free') {
            userMessage = "服务繁忙 (429)：免费体验通道拥堵或今日额度已满。请稍作休息后再试，或者在设置中配置您的自定义 Key。";
         } else {
            userMessage = `额度已耗尽 (429)：您的 ${providerLabel} 账户余额不足或达到速率限制。请检查服务商后台。`;
         }
      } else if (technicalDetails.includes("404") || technicalDetails.includes("not found")) {
          if (apiConfig?.provider === 'Custom') {
             userMessage = `路径错误 (404)：无法连接到自定义接口。请检查 Base URL 是否正确（通常应以 /v1 结尾）以及模型名称是否有效。`;
          } else {
             userMessage = "请求资源未找到 (404)。请稍后重试。";
          }
      } else if (technicalDetails.includes("failed to fetch") || technicalDetails.includes("network") || technicalDetails.includes("connection")) {
         userMessage = "网络连接中断：无法连接到服务器。请检查您的网络设置（如 VPN/代理是否配置正确）。";
      } else if (technicalDetails.includes("json") || technicalDetails.includes("parse") || technicalDetails.includes("syntax")) {
         userMessage = "AI 响应解析错误：模型返回了非标准格式的数据。通常重试一次即可解决。";
      } else if (technicalDetails.includes("candidate was stopped") || technicalDetails.includes("safety") || technicalDetails.includes("blocked")) {
         userMessage = "内容被拦截：生成的内容触发了安全审查机制。请尝试更换场景类别或降低难度。";
      } else {
         const cleanMsg = typeof err.message === 'string' ? err.message.slice(0, 150) : "未知错误";
         userMessage = `发生错误：${cleanMsg}${cleanMsg.length >= 150 ? '...' : ''}`;
      }

      setErrorMsg(userMessage);
      setAppState(AppState.ERROR);
    }
  };

  const loadScenario = useCallback(() => {
    fetchScenario(false);
  }, [difficulty, category, perspective, apiConfig, isKidMode]);

  const loadFollowUp = useCallback(() => {
    fetchScenario(true);
  }, [difficulty, category, perspective, currentScenario, apiConfig, lastSelectedOption, isKidMode]);

  const handleAnalysisComplete = (selectedOptionId: string) => {
    if (!currentScenario) return;

    // Track the user's choice for the follow-up logic
    const selectedOption = currentScenario.options.find(opt => opt.id === selectedOptionId) || null;
    setLastSelectedOption(selectedOption);

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      scenario: currentScenario,
      selectedOptionId: selectedOptionId,
      timestamp: Date.now(),
      imageUrl: scenarioImage
    };

    setHistory(prev => [...prev, newItem]);
  };

  // Helper to get dynamic labels based on perspective/mode
  const getCategoryLabel = (cat: ScenarioCategory) => {
      if (isKidMode) {
          switch (cat) {
              case 'EmotionalExpression': return '猜猜心情 (感受)';
              case 'Projection': return '不是你的错 (投射)';
              case 'SocialRitual': return '礼貌用语 (礼仪)';
              case 'RelationalStance': return '好朋友规则 (关系)';
              case 'ImpliedNeed': return '听懂暗示 (需求)';
          }
      }

      if (perspective === 'DecodeLiteral') {
          switch (cat) {
              case 'EmotionalExpression': return '感官调节 / 真实表达';
              case 'Projection': return '陈述事实 / 直率观察';
              case 'SocialRitual': return '兴趣分享 / 知识科普';
              case 'RelationalStance': return '维护规则 / 纠正错误';
              case 'ImpliedNeed': return '明确需求 / 感官不适';
          }
      }
      // Default / DecodeSubtext / Mixed
      switch (cat) {
          case 'EmotionalExpression': return '情绪表达';
          case 'Projection': return '心理投射';
          case 'SocialRitual': return '社交仪式';
          case 'RelationalStance': return '关系立场';
          case 'ImpliedNeed': return '隐含需求';
      }
  };

  const categoryOptions: { label: string; value: ScenarioCategory | 'ALL' }[] = [
    { label: '综合随机', value: 'ALL' },
    { label: getCategoryLabel('EmotionalExpression'), value: 'EmotionalExpression' },
    { label: getCategoryLabel('Projection'), value: 'Projection' },
    { label: getCategoryLabel('SocialRitual'), value: 'SocialRitual' },
    { label: getCategoryLabel('RelationalStance'), value: 'RelationalStance' },
    { label: getCategoryLabel('ImpliedNeed'), value: 'ImpliedNeed' },
  ];

  const goHome = () => {
    setAppState(AppState.IDLE);
    setCurrentScenario(null);
    setViewingHistoryItem(null);
    setLastSelectedOption(null);
  };

  const goToHistory = () => {
    setAppState(AppState.HISTORY);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setViewingHistoryItem(item);
    setCurrentScenario(item.scenario);
    setScenarioImage(item.imageUrl);
    setAppState(AppState.PLAYING); 
  };

  const isReviewMode = !!viewingHistoryItem;

  // Determine if we should show the image section
  // 1. In Review Mode: Show only if there is an image to show (historical persistence)
  // 2. In Live Mode: Show if the provider supports images (Free or Google)
  const shouldShowImageSection = isReviewMode 
    ? !!scenarioImage 
    : (apiConfig?.provider === 'Google' || apiConfig?.provider === 'Free');

  return (
    <div className={`min-h-screen ${isKidMode ? 'bg-[#1a1c3d]' : 'bg-neuro-bg'} text-neuro-text font-sans selection:bg-neuro-primary selection:text-white pb-20 transition-colors duration-500`}>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiConfig}
        currentConfig={apiConfig}
      />

      <nav className={`w-full ${isKidMode ? 'bg-[#252850]' : 'bg-[#1e2040]'} shadow-md sticky top-0 z-50 transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
                <button 
                  onClick={goHome}
                  className={`px-3 py-1.5 md:px-4 rounded-md ${isKidMode ? 'bg-pink-500 hover:bg-pink-600' : 'bg-neuro-primary hover:bg-neuro-primaryHover'} text-white text-sm font-medium shadow-lg transition-colors`}
                >
                  <span className="md:hidden">解读</span>
                  <span className="hidden md:inline">人际情境解读</span>
                </button>
                <button 
                  onClick={goToHistory}
                  className={`text-sm font-medium transition-colors ${appState === AppState.HISTORY ? 'text-white' : 'text-neuro-muted hover:text-white'}`}
                >
                  <span className="md:hidden">历史</span>
                  <span className="hidden md:inline">历史记录 ({history.length})</span>
                </button>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
                {apiConfig?.provider === 'Free' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 mr-2">
                        <span className="md:hidden">🚀 试用</span>
                        <span className="hidden md:inline">🚀 免费体验模式</span>
                    </span>
                )}
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-neuro-muted hover:text-white transition-colors"
                    title="API 设置"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
                <a 
                    href="https://neuroxyz.cn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-bold tracking-tight text-white/90 hover:text-white transition-colors cursor-pointer"
                >
                    NeuroXYZ
                </a>
            </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-12">
        
        {appState === AppState.IDLE && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-12">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-xl border border-neuro-border transition-colors duration-500 ${isKidMode ? 'bg-pink-500/20 text-pink-300' : 'bg-neuro-card text-white'}`}>
                   {isKidMode ? (
                      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                      </svg>
                   ) : (
                      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                   )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                  {isKidMode ? '社交小侦探' : '人际情境解读'}
                </h1>
                <p className="text-neuro-muted text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                  {isKidMode 
                    ? <span className="text-pink-300">专为小朋友设计。</span> 
                    : <span>这是一个连接<span className="text-neuro-primary font-bold">直白风格</span>与<span className="text-white font-bold">含蓄风格</span>的“双向翻译器”。</span>
                  }
                  <br className="hidden md:block"/>
                  {isKidMode 
                    ? "通过有趣的故事，学习理解朋友、老师和家人的真实想法！"
                    : "我们不仅帮助您解读“言外之意”，也致力于消除对“字面意”的过度解读。"
                  }
                </p>
                
                {apiConfig?.provider === 'Free' && (
                   <div className="mt-6 inline-block bg-neuro-card border border-neuro-border text-neuro-muted px-4 py-2 rounded-lg text-sm">
                      当前模式：自动免费体验 (包含图文生成)
                   </div>
                )}
            </div>

            <div className={`bg-neuro-card max-w-3xl mx-auto rounded-2xl p-8 shadow-2xl border ${isKidMode ? 'border-pink-500/30 shadow-pink-500/10' : 'border-white/5'} transition-all duration-500`}>
                <div className="space-y-8">

                    {/* Mode Switcher */}
                    <div className="flex justify-center -mt-2 mb-2">
                        <div className="bg-[#16162c] p-1.5 rounded-xl border border-neuro-border inline-flex relative shadow-inner">
                            <button
                                onClick={() => setIsKidMode(false)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${!isKidMode ? 'bg-neuro-primary text-white shadow-lg' : 'text-neuro-muted hover:text-white'}`}
                            >
                                <span className="mr-2">🧑</span> 成人模式
                            </button>
                            <button
                                onClick={() => setIsKidMode(true)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${isKidMode ? 'bg-pink-500 text-white shadow-lg' : 'text-neuro-muted hover:text-white'}`}
                            >
                                <span className="mr-2">🧸</span> 儿童模式
                            </button>
                        </div>
                    </div>
                    
                    {/* Perspective Selector (Goal) */}
                    <div>
                        <label className="block text-sm font-bold text-neuro-muted uppercase tracking-wider mb-4 text-center">
                            选择沟通对象风格
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setPerspective('DecodeSubtext')}
                                className={`p-4 rounded-xl text-left transition-all duration-300 border h-full ${
                                    perspective === 'DecodeSubtext'
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                                    : 'bg-[#16162c] border-transparent text-neuro-muted hover:bg-[#1f2042]'
                                }`}
                            >
                                <div className="font-bold text-sm mb-1">{isKidMode ? '🔍 猜猜“话里有话”' : '🔍 解读“言外之意”'}</div>
                                <div className="text-xs opacity-80 leading-relaxed">
                                    {isKidMode 
                                      ? "对象说话比较含蓄。练习听懂老师或同学的暗示。"
                                      : (
                                        <span>
                                          对象偏向<strong className="text-white">含蓄/社交型</strong>。练习识别客套、面子维护及情绪潜台词。
                                        </span>
                                      )
                                    }
                                </div>
                            </button>
                            <button
                                onClick={() => setPerspective('DecodeLiteral')}
                                className={`p-4 rounded-xl text-left transition-all duration-300 border h-full ${
                                    perspective === 'DecodeLiteral'
                                    ? 'bg-teal-500/20 border-teal-500 text-teal-200 ring-1 ring-teal-500/50'
                                    : 'bg-[#16162c] border-transparent text-neuro-muted hover:bg-[#1f2042]'
                                }`}
                            >
                                <div className="font-bold text-sm mb-1">{isKidMode ? '🛡️ 理解“有啥说啥”' : '🛡️ 理解“直白真实”'}</div>
                                <div className="text-xs opacity-80 leading-relaxed">
                                     {isKidMode 
                                      ? "对象说话很直接。练习理解他们只是在说事实，不是凶你。"
                                      : (
                                        <span>
                                          对象偏向<strong className="text-white">直白/字面型</strong>。练习放下过度解读，理解感官驱动与真诚。
                                        </span>
                                      )
                                    }
                                </div>
                            </button>
                            <button
                                onClick={() => setPerspective('Mixed')}
                                className={`p-4 rounded-xl text-left transition-all duration-300 border h-full ${
                                    perspective === 'Mixed'
                                    ? 'bg-pink-500/20 border-pink-500 text-pink-200 ring-1 ring-pink-500/50'
                                    : 'bg-[#16162c] border-transparent text-neuro-muted hover:bg-[#1f2042]'
                                }`}
                            >
                                <div className="font-bold text-sm mb-1">🎲 真实世界混合</div>
                                <div className="text-xs opacity-80 leading-relaxed">
                                    随机遭遇不同风格的对话对象，模拟真实社交中的多样性。
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-bold text-neuro-muted uppercase tracking-wider mb-4 text-center">
                            选择场景复杂度
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(['Easy', 'Medium', 'Hard'] as const).map((level) => {
                                const labels: Record<string, string> = { Easy: '简单', Medium: '中等', Hard: '困难' };
                                const descriptions: Record<string, string> = { 
                                    Easy: isKidMode ? '一听就懂。简单的开心或生气。' : '意图单一清晰。侧重于识别基本情绪和直接需求。', 
                                    Medium: isKidMode ? '有点模糊。需要想一想为什么他要这么说。' : '含蓄模糊。包含客套话、潜台词，需结合语境推断。', 
                                    Hard: isKidMode ? '复杂故事。连续发生的事情，看看你怎么应对。' : '连续博弈。涉及多轮历史互动，支持生成后续发展以观察后果。' 
                                };
                                const isActive = difficulty === level;
                                const activeRing = isKidMode ? 'ring-pink-500' : 'ring-neuro-primary';
                                const activeBg = isKidMode ? 'bg-pink-500' : 'bg-neuro-primary';

                                return (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={`p-4 rounded-xl text-left transition-all duration-300 border border-transparent relative group h-full flex flex-col ${
                                            isActive 
                                            ? `${activeBg} bg-opacity-90 text-white shadow-lg ring-2 ring-offset-2 ring-offset-[#16162c] ${activeRing}` 
                                            : 'bg-[#16162c] text-neuro-muted hover:bg-[#1f2042] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="block font-bold text-lg">{labels[level]}</span>
                                          {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`text-xs leading-relaxed opacity-90 block ${isActive ? 'text-white' : 'text-neuro-muted group-hover:text-gray-300'}`}>
                                            {descriptions[level]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Selector with Dynamic Labels */}
                    <div className="animate-fade-in">
                            <label className="block text-sm font-bold text-neuro-muted uppercase tracking-wider mb-3 text-center">
                            选择分析维度
                        </label>
                        <div className="flex flex-wrap justify-center gap-2">
                            {categoryOptions.map((opt) => {
                                const isActive = category === opt.value;
                                let activeClass = 'bg-neuro-primary border-neuro-primary text-white shadow-lg shadow-indigo-500/20';
                                if (isKidMode && isActive) {
                                    activeClass = 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20';
                                }

                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setCategory(opt.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border ${
                                            isActive 
                                            ? activeClass
                                            : 'bg-[#16162c] border-neuro-border text-neuro-muted hover:border-neuro-muted hover:text-white'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="pt-4 flex justify-center">
                        <button 
                            onClick={() => loadScenario()}
                            disabled={!apiConfig}
                            className={`w-full md:w-auto px-12 py-4 rounded-full font-bold text-lg shadow-[0_0_25px_rgba(124,134,230,0.4)] transition-all transform flex items-center justify-center ${
                                apiConfig 
                                ? (isKidMode ? 'bg-pink-500 hover:bg-pink-600 hover:scale-105 hover:-translate-y-1 text-white' : 'bg-neuro-primary hover:bg-neuro-primaryHover text-white hover:scale-105 hover:-translate-y-1')
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {isKidMode ? '开始探险！' : '开始生成场景'}
                        </button>
                    </div>
                </div>
            </div>
          </div>
        )}

        {appState === AppState.HISTORY && (
            <HistoryView 
                history={history} 
                onSelectScenario={handleSelectHistoryItem} 
                onBack={goHome} 
            />
        )}

        {appState === AppState.ERROR && (
          <div className="bg-red-900/20 border border-red-800 p-6 rounded-xl shadow-lg mb-8 text-center animate-fade-in max-w-md mx-auto mt-12">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p className="text-red-300 mb-4 leading-relaxed">{errorMsg}</p>
            <div className="flex justify-center space-x-4">
                <button onClick={goHome} className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20">返回主页</button>
                <button onClick={() => setIsSettingsOpen(true)} className="px-4 py-2 rounded bg-neuro-primary text-white hover:bg-neuro-primaryHover">检查设置</button>
                <button onClick={() => loadScenario()} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500">重试</button>
            </div>
          </div>
        )}

        {appState === AppState.LOADING_SCENARIO && (
          <LoadingScreen />
        )}

        {appState === AppState.PLAYING && currentScenario && (
          <div className="space-y-6 animate-fade-in-up">
            
            <div className="flex justify-between items-center mb-4">
               <button 
                  onClick={isReviewMode ? goToHistory : goHome}
                  className="text-sm text-neuro-muted hover:text-white flex items-center transition-colors"
               >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  {isReviewMode ? '返回历史记录' : '调整设置'}
               </button>
               {isReviewMode && (
                   <span className="text-xs font-bold text-neuro-muted bg-white/5 px-2 py-1 rounded">
                       历史回溯模式
                   </span>
               )}
            </div>

            <ScenarioCard 
                scenario={currentScenario} 
                imageUrl={scenarioImage} 
                showImageSection={shouldShowImageSection}
            />
            
            <div className="bg-neuro-card rounded-2xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center mb-6">
                    <div className="w-1 h-8 bg-neuro-primary rounded-full mr-4"></div>
                    <h2 className="text-xl font-bold text-white">
                        {isReviewMode ? '历史解析回顾' : '社交意图分析'}
                    </h2>
                </div>
                
                <QuizInterface 
                    scenario={currentScenario} 
                    onNext={() => loadScenario()} 
                    onFollowUp={!isReviewMode && difficulty === 'Hard' ? loadFollowUp : undefined}
                    onAnalysisComplete={!isReviewMode ? handleAnalysisComplete : undefined}
                    initialSelectedId={viewingHistoryItem?.selectedOptionId}
                />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 py-8 text-center border-t border-white/5 bg-[#16162c]">
         <div className="max-w-4xl mx-auto px-4 text-neuro-muted text-sm space-y-4">
            <p className="opacity-70 text-xs leading-relaxed">
               免责声明：本应用生成的所有内容（含场景、对话及解析）均由人工智能模型（LLM）实时生成，可能存在偏见、幻觉或不准确信息。
               <br/>
               本工具仅用于辅助社交情境的自我探索与练习，<span className="text-neuro-primary font-bold">严禁作为心理咨询、医疗诊断或治疗的依据</span>。如遇心理困扰，请寻求专业人士帮助。
            </p>
            <p className="opacity-50 pt-2">
               内容由LLM生成，仅供参考 | ©2025 by XyZ @ <a href="https://neuroxyz.cn" target="_blank" rel="noopener noreferrer" className="hover:text-white underline decoration-dotted">https://neuroxyz.cn</a>
            </p>
         </div>
      </footer>
    </div>
  );
};

export default App;