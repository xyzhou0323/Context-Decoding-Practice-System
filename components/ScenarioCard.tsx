import React, { useState, useEffect } from 'react';
import { SocialScenario, ScenarioCategory, CommunicationStyle } from '../types';

interface ScenarioCardProps {
  scenario: SocialScenario;
  imageUrl: string | null;
  showImageSection: boolean;
}

const difficultyMap: Record<string, string> = {
  'Easy': '简单',
  'Medium': '中等',
  'Hard': '困难'
};

const categoryMap: Record<ScenarioCategory, string> = {
  'EmotionalExpression': '情绪表达',
  'Projection': '心理投射',
  'SocialRitual': '社交仪式',
  'RelationalStance': '关系立场',
  'ImpliedNeed': '隐含需求'
};

const difficultyColorMap: Record<string, string> = {
    'Easy': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'Medium': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Hard': 'bg-rose-500/20 text-rose-300 border-rose-500/30'
};

const getCategoryHint = (category: ScenarioCategory, style: CommunicationStyle): string => {
  if (style === 'DirectLiteral') {
    switch (category) {
      case 'EmotionalExpression':
        return `提示：观察语气的平淡或肢体的重复动作。这可能只是在“如实汇报”身体状态或通过自我刺激来调节感官过载，而非对他人的态度。`;
      case 'Projection':
        return `提示：关注其陈述的内容本身。对方可能只是在直白地指出一个观察到的事实或逻辑错误（纠错本能），而非出于嫉妒或攻击的意图。`;
      case 'SocialRitual':
        return `提示：这可能是独特的“信息分享”仪式。对于直白风格者，分享知识/事实 = 分享快乐/信任。这不是在炫耀，而是在邀请你进入他的世界。`;
      case 'RelationalStance':
        return `提示：区分“纠错”与“打压”。在直白风格中，指出错误往往代表着“我在乎你，不想让你继续错下去”，是一种纯粹的帮助而非权力展示。`;
      case 'ImpliedNeed':
        return `提示：字面理解即可。如果提到环境因素（如光线、声音），通常就是单纯的生理痛苦或感官需求，不需要寻找背后的“言外之意”。`;
      default:
        return `提示：尝试从字面意义去理解，对方可能只是在陈述事实，没有潜台词。`;
    }
  }

  // Default Indirect/Social (Neurotypical-ish)
  switch (category) {
    case 'EmotionalExpression':
      return `提示：观察言语和表情的落差。对方可能在用某种话题掩饰真实的某种情绪（焦虑、恐惧、疲惫）。`;
    case 'Projection':
      return `提示：观察对方的状态。这句话可能只是对方内部情绪的投射，这是“他的课题”，不一定需要你去解决。`;
    case 'SocialRitual':
      return `提示：这可能是一个社交脚本。不要只听字面意思，关注这句话在对话中起到的功能性作用（如礼貌结束、破冰）。`;
    case 'RelationalStance':
      return `提示：关注权力动态。对方是在试图拉近距离、建立权威，还是划清界限？`;
    case 'ImpliedNeed':
      return `提示：对方可能因为“被动攻击”或“好面子”没有直接说。试着听出他没有说出口的期待。`;
    default:
      return `提示：注意听话里的弦外之音。`;
  }
};

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, imageUrl, showImageSection }) => {
  const [playingSection, setPlayingSection] = useState<'context' | 'statement' | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Stop speech when scenario changes or component unmounts
  useEffect(() => {
    window.speechSynthesis.cancel();
    setPlayingSection(null);
    setShowHint(false); // Reset hint visibility on new scenario
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [scenario]);

  const speakText = (text: string, section: 'context' | 'statement') => {
    if (playingSection === section) {
      // Toggle off
      window.speechSynthesis.cancel();
      setPlayingSection(null);
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // Set to Chinese
    utterance.rate = 1.0; // Normal speed
    
    // Attempt to pick a decent voice (optional, browsers vary wildy)
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh-CN') && !v.name.includes('Google'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onend = () => {
      setPlayingSection(null);
    };

    utterance.onerror = () => {
      setPlayingSection(null);
    };

    setPlayingSection(section);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-neuro-card rounded-2xl shadow-xl overflow-hidden mb-8">
      {/* Header / Context */}
      <div className="p-6 md:p-8 bg-[#1f2042]">
        <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-neuro-muted text-xs font-semibold uppercase tracking-wider flex items-center mr-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    场景背景
                </span>
                
                {/* Setting Tag */}
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center">
                    <span className="mr-1">📍</span> {scenario.setting}
                </span>

                {/* Category Tag */}
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {categoryMap[scenario.category] || '综合分析'}
                </span>

                {/* Tags */}
                {scenario.tags && scenario.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-neuro-muted border border-white/10">
                        #{tag}
                    </span>
                ))}
                
                {/* Play Button for Context */}
                <button 
                  onClick={() => speakText(scenario.context, 'context')}
                  className={`ml-1 p-1.5 rounded-full transition-colors ${playingSection === 'context' ? 'text-neuro-primary bg-neuro-primary/10 animate-pulse' : 'text-neuro-muted hover:text-white hover:bg-white/10'}`}
                  title="朗读背景"
                >
                   {playingSection === 'context' ? (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                   ) : (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                   )}
                </button>
            </div>
            
            {/* Difficulty Pill */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${difficultyColorMap[scenario.difficulty] || 'bg-gray-700 text-gray-300'}`}>
                {difficultyMap[scenario.difficulty] || scenario.difficulty}
            </span>
        </div>
        <p className="text-white/90 text-lg leading-relaxed font-light">
          {scenario.context}
        </p>
      </div>

      {/* Visual & Statement */}
      <div className={showImageSection ? "md:grid md:grid-cols-2" : ""}>
        {/* Image Panel */}
        {showImageSection && (
            <div className="bg-[#111226] min-h-[300px] flex items-center justify-center relative overflow-hidden group">
            {imageUrl ? (
                <>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111226] to-transparent z-10 opacity-60"></div>
                    <img 
                    src={imageUrl} 
                    alt={scenario.visualDescription}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                    />
                </>
            ) : (
                <div className="flex flex-col items-center text-neuro-muted p-4 text-center z-10">
                <div className="w-12 h-12 border-4 border-neuro-muted border-t-neuro-primary rounded-full animate-spin mb-4 opacity-50"></div>
                <span className="text-sm font-medium tracking-wide">正在绘制场景...</span>
                </div>
            )}
            </div>
        )}

        {/* Speech / Action Panel */}
        <div className="p-8 flex flex-col justify-center bg-neuro-card relative">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <p className="text-sm text-neuro-primary font-bold uppercase tracking-wide flex items-center">
                    <span className="w-2 h-2 rounded-full bg-neuro-primary mr-2"></span>
                    {scenario.speakerName}
                </p>
             </div>
             
             {/* Play Button for Statement */}
             <button 
                  onClick={() => speakText(scenario.statement, 'statement')}
                  className={`p-2 rounded-full transition-all ${playingSection === 'statement' ? 'text-neuro-primary bg-neuro-primary/10 animate-pulse' : 'text-neuro-muted hover:text-white hover:bg-[#2a2b55]'}`}
                  title="朗读对话"
                >
                   {playingSection === 'statement' ? (
                     <div className="flex items-center space-x-1">
                        <span className="block w-1 h-3 bg-neuro-primary rounded-full animate-bounce"></span>
                        <span className="block w-1 h-3 bg-neuro-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                        <span className="block w-1 h-3 bg-neuro-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                     </div>
                   ) : (
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"></path></svg>
                   )}
             </button>
          </div>
          
          <div className="relative">
            {/* Speech Bubble Tail for desktop */}
            <div className={`absolute -top-3 -left-2 w-4 h-4 bg-[#2a2b55] border-t border-l border-[#2a2b55] transform -rotate-45 hidden ${showImageSection ? 'md:block' : 'hidden'}`}></div>
            
            <blockquote className="bg-[#2a2b55] border-l-4 border-neuro-primary p-6 rounded-r-xl rounded-bl-xl shadow-lg">
              <p className="text-2xl font-medium text-white italic leading-relaxed">
                "{scenario.statement}"
              </p>
            </blockquote>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-neuro-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                </div>
                <div className="flex-1">
                   {!showHint ? (
                     <button 
                        onClick={() => setShowHint(true)}
                        className="text-neuro-primary text-sm font-medium hover:text-white transition-colors underline decoration-dotted underline-offset-4"
                     >
                        需要一点提示？点击展开观察线索
                     </button>
                   ) : (
                     <div className="animate-fade-in">
                        <button 
                            onClick={() => setShowHint(false)}
                            className="text-white/80 font-semibold block mb-1 text-sm hover:text-neuro-primary transition-colors flex items-center"
                        >
                            观察线索 
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                        </button>
                        <p className="text-neuro-muted text-sm leading-relaxed">
                           {getCategoryHint(scenario.category, scenario.communicationStyle)}
                           <br/>
                           <span className="text-xs text-neuro-primary mt-1 block">
                             {scenario.communicationStyle === 'DirectLiteral' 
                               ? `提示：此人沟通风格偏向“直白/字面”。无需模仿，但理解是完全可能的：请尝试放下对“言外之意”的搜索，直接接收其字面信息与感官真实。` 
                               : `提示：此人沟通风格偏向“含蓄/社交”。理解不代表需要改造自己：这种含蓄通常是为了维护关系氛围或面子，而非故意的不真诚。`}
                           </span>
                        </p>
                     </div>
                   )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};