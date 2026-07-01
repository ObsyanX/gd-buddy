const isAlreadyClosedAudioError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.toLowerCase().includes('closed');
};

export const safeCloseAudioContext = async (ctx?: AudioContext | null) => {
  if (!ctx || ctx.state === 'closed') return;

  try {
    await ctx.close();
  } catch (error) {
    if (!isAlreadyClosedAudioError(error)) {
      console.warn('[Audio] Failed to close AudioContext safely', error);
    }
  }
};

export const safeStopMediaStream = (stream?: MediaStream | null) => {
  if (!stream) return;

  for (const track of stream.getTracks()) {
    try {
      if (track.readyState !== 'ended') {
        track.stop();
      }
    } catch (error) {
      console.warn('[Audio] Failed to stop MediaStream track safely', error);
    }
  }
};

export const safeDisconnectAudioNode = (node?: AudioNode | null) => {
  if (!node) return;

  try {
    node.disconnect();
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
    if (!message.includes('already disconnected')) {
      console.warn('[Audio] Failed to disconnect AudioNode safely', error);
    }
  }
};