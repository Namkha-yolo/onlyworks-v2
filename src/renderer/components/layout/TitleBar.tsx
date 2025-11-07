import React from 'react';

const TitleBar: React.FC = () => {
  return (
    <div
      className="h-[38px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    />
  );
};

export default TitleBar;
