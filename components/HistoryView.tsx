import React from 'react';
import { HistoryItem, ScenarioCategory } from '../types';

interface HistoryViewProps {
  history: HistoryItem[];
  onSelectScenario: (item: HistoryItem) => void;
  onBack: () => void;
}

const categoryMap: Record<ScenarioCategory, string> = {
  'EmotionalExpression': '情绪表达',
  'Projection': '心理投射',
  'SocialRitual': '社交仪式',
  'RelationalStance': '关系立场',
  'ImpliedNeed': '隐含需求'
};

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelectScenario, onBack }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-16 h-16 bg-neuro-card rounded-full mx-auto flex items-center justify-center mb-4 text-3xl">
          📜
        </div>
        <h3 className="text-xl font-bold text-white mb-2">暂无历史记录</h3>
        <p className="text-neuro-muted mb-8">完成一些场景分析后，由于将在这里显示。</p>
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-neuro-primary text-white rounded-lg hover:bg-neuro-primaryHover transition-colors"
        >
          开始新的分析
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-3 text-neuro-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            分析记录
        </h2>
        <button 
          onClick={onBack}
          className="text-sm text-neuro-muted hover:text-white underline decoration-dotted underline-offset-4"
        >
          返回主页
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[...history].reverse().map((item) => {
          const isCorrect = item.scenario.options.find(opt => opt.id === item.selectedOptionId)?.isCorrect;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelectScenario(item)}
              className="bg-neuro-card text-left p-5 rounded-xl border border-transparent hover:border-neuro-primary/50 hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-16 h-16 transform translate-x-8 -translate-y-8 rotate-45 ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}></div>
              
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#16162c] text-neuro-muted px-2 py-1 rounded border border-white/5">
                    {new Date(item.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCorrect ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {isCorrect ? '分析准确' : '视角偏差'}
                </span>
              </div>

              <h3 className="text-white font-bold mb-1 group-hover:text-neuro-primary transition-colors line-clamp-1">
                {item.scenario.title || "无标题场景"}
              </h3>
              
              <div className="flex items-center text-xs text-neuro-muted space-x-3 mb-3">
                 <span>{categoryMap[item.scenario.category]}</span>
                 <span className="w-1 h-1 bg-neuro-muted rounded-full"></span>
                 <span>{item.scenario.setting}</span>
              </div>

              <p className="text-sm text-gray-400 line-clamp-2 italic opacity-80 border-l-2 border-neuro-primary/30 pl-3">
                "{item.scenario.statement}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
