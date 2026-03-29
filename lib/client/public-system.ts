export type PublicSystemConfig = {
  allowRegistration: boolean;
  webSearchEnabled: boolean;
  aiAutoFillEnabled: boolean;
  autoReferenceAssist: boolean;
};

export const defaultPublicSystemConfig: PublicSystemConfig = {
  allowRegistration: true,
  webSearchEnabled: true,
  aiAutoFillEnabled: true,
  autoReferenceAssist: true
};

export async function fetchPublicSystemConfig() {
  const response = await fetch('/api/system/public', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('系统开关暂时读取失败');
  }

  const data = await response.json();
  return (data.config || defaultPublicSystemConfig) as PublicSystemConfig;
}
