import React, { useState, useEffect } from 'react';
import { SocialScenario, QuizOption } from '../types';

interface QuizInterfaceProps {
  scenario: SocialScenario;
  onNext: () => void;
  onFollowUp?: () => void; // Optional handler for follow-up scenarios
  onAnalysisComplete?: (selectedId: string) => void; // Callback when user submits an answer
  initialSelectedId?: string; // If provided, the quiz renders in "submitted/review" mode
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ 
  scenario, 
  onNext, 
  onFollowUp, 
  onAnalysisComplete,
  initialSelectedId 
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [hasSubmitted, setHasSubmitted] = useState(!!initialSelectedId);

  // If scenario changes, reset state unless an initial ID is provided (Review Mode)
  useEffect(() => {
    if (initialSelectedId) {
        setSelectedId(initialSelectedId);
        setHasSubmitted(true);
    } else {
        setSelectedId(null);
        setHasSubmitted(false);
    }
  }, [scenario, initialSelectedId]);

  const handleSelect = (id: string) => {
    if (hasSubmitted) return;
    setSelectedId(id);
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    setHasSubmitted(true);
    if (onAnalysisComplete) {
        onAnalysisComplete(selectedId);
    }
  };

  const selectedOption = scenario.options.find(opt => opt.id === selectedId);
  const correctOption = scenario.options.find(opt => opt.isCorrect);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-1">
        {scenario.options.map((option) => {
          let stateStyles = "border-neuro-border hover:border-neuro-primary hover:bg-[#2a2b55] bg-[#1e2042]";
          let textStyle = "text-neuro-text";
          let iconBorder = "border-neuro-muted";
          
          if (hasSubmitted) {
            if (option.isCorrect) {
              stateStyles = "border-green-500/50 bg-green-900/20 ring-1 ring-green-500/50";
              textStyle = "text-green-300";
              iconBorder = "border-green-500 bg-green-500 text-white";
            } else if (selectedId === option.id && !option.isCorrect) {
              stateStyles = "border-red-500/50 bg-red-900/20 opacity-80";
              textStyle = "text-red-300";
              iconBorder = "border-red-500 text-red-500";
            } else {
              stateStyles = "border-transparent bg-transparent opacity-40";
            }
          } else if (selectedId === option.id) {
            stateStyles = "border-neuro-primary bg-[#2a2b55] ring-1 ring-neuro-primary shadow-[0_0_15px_rgba(124,134,230,0.15)]";
            iconBorder = "border-neuro-primary text-neuro-primary";
            textStyle = "text-white";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={hasSubmitted}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-start group ${stateStyles}`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center mt-0.5 transition-colors ${iconBorder}`}>
                {hasSubmitted && option.isCorrect && (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                )}
                {selectedId === option.id && !hasSubmitted && (
                    <div className="w-3 h-3 bg-neuro-primary rounded-full"></div>
                )}
              </div>
              <div>
                <span className={`text-lg font-medium ${textStyle}`}>
                    {option.text}
                </span>
              </div>
            </button>
          );
        })}

        {!hasSubmitted && (
          <button
            onClick={onNext}
            className="w-full text-left p-5 rounded-xl border-2 border-neuro-border border-dashed hover:border-neuro-muted hover:bg-white/5 bg-transparent transition-all duration-200 flex items-start group text-neuro-muted hover:text-white opacity-80 hover:opacity-100"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-neuro-muted group-hover:border-white mr-4 flex items-center justify-center mt-0.5 transition-colors">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <span className="text-lg font-medium">
                  跳过 / 不确定
              </span>
            </div>
          </button>
        )}
      </div>

      {!hasSubmitted ? (
        <div className="flex justify-end items-center pt-4">
          <button
            onClick={handleSubmit}
            disabled={!selectedId}
            className={`px-8 py-3 md:px-10 rounded-lg font-semibold text-white transition-all transform shadow-lg
              ${selectedId 
                ? 'bg-neuro-primary hover:bg-neuro-primaryHover hover:-translate-y-0.5 shadow-[0_4px_14px_0_rgba(124,134,230,0.39)]' 
                : 'bg-[#2a2b55] text-neuro-muted cursor-not-allowed'}`}
          >
            解析对方心理
          </button>
        </div>
      ) : (
        <div className="animate-fade-in-up mt-8 bg-[#1f2042] rounded-xl p-6 shadow-inner relative overflow-hidden">
           <div className={`absolute top-0 left-0 w-1 h-full ${selectedOption?.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>

          <div className="flex items-start mb-6">
            <div className={`p-3 rounded-full mr-4 ${selectedOption?.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {selectedOption?.isCorrect ? (
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
            </div>
            <div>
                <h3 className={`text-xl font-bold mb-1 ${selectedOption?.isCorrect ? 'text-green-400' : 'text-white'}`}>
                    {selectedOption?.isCorrect ? '洞察敏锐！' : '解读视角不同'}
                </h3>
                <p className="text-neuro-muted font-medium uppercase text-xs tracking-wider">
                    核心驱动力： <span className="text-neuro-primary font-bold">{scenario.socialFunction}</span>
                </p>
            </div>
          </div>
          
          <div className="space-y-4 text-neuro-text bg-[#16162c] p-5 rounded-lg shadow-sm">
             <div className="mb-2">
                <span className="text-xs font-bold text-neuro-muted uppercase tracking-wider block mb-1">
                    {selectedOption?.isCorrect ? '对方心理状态深度解析' : '该选项的心理逻辑'}
                </span>
                <p className="leading-relaxed">{selectedOption?.explanation}</p>
             </div>
             
             {!selectedOption?.isCorrect && correctOption && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-1">对方实际的内部状态</span>
                    <p className="text-white/90">{correctOption.explanation}</p>
                </div>
             )}
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-end space-y-4 md:space-y-0 md:space-x-4">
             {/* Only show Follow-up button if handler is provided (Hard Mode) */}
             {onFollowUp && !initialSelectedId && (
               <button
                  onClick={onFollowUp}
                  className="px-6 py-3 bg-[#2a2b55] text-neuro-primary font-bold rounded-lg hover:bg-[#363866] hover:text-white transition-colors border border-neuro-primary/30 flex items-center justify-center"
               >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  观察后续发展 (连续对话)
               </button>
             )}

            {!initialSelectedId && (
                <button
                    onClick={onNext}
                    className="px-8 py-3 bg-white text-neuro-bg font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-lg flex items-center justify-center"
                >
                    下一个观察对象
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};