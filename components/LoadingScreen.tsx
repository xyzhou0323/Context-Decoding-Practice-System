import React from 'react';

const steps = [
  "正在分析社交模式...",
  "正在构建场景背景...",
  "正在绘制场景插图...",
  "正在准备选项..."
];

export const LoadingScreen: React.FC = () => {
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-fade-in">
      <div className="w-20 h-20 relative mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-neuro-card opacity-30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-neuro-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
      </div>
      <h2 className="text-2xl font-semibold text-white mb-3 tracking-wide">正在生成场景</h2>
      <p className="text-neuro-muted max-w-md h-6 transition-all duration-500 ease-in-out font-light">
        {steps[stepIndex]}
      </p>
    </div>
  );
};