export const isDev = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const getAppDataPath = (): string => {
  const { app } = require('electron');
  return app.getPath('userData');
};