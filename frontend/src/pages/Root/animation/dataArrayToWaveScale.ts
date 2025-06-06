const dataArrayToWaveScale = (dataArray: Uint8Array) => {
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

  let scale = average / 40 + 1.4;
  if (scale > 2) scale = 2;
  else if (scale < 1.7) scale = 1.7;

  return scale;
};

export { dataArrayToWaveScale };
