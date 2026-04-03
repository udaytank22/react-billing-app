export const checkInternetSpeed = async (): Promise<{
  status: 'none' | 'slow' | 'fast';
  latency?: number;
}> => {
  try {
    const start = Date.now();
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'GET',
    });
    const end = Date.now();

    if (!response.ok) {
      return { status: 'none' };
    }

    const latency = end - start;

    // Thresholds:
    // latency > 2000ms (2 seconds) for a tiny icon is considered very slow/poor connection
    if (latency > 2000) {
      return { status: 'slow', latency };
    }

    return { status: 'fast', latency };
  } catch (error) {
    return { status: 'none' };
  }
};
