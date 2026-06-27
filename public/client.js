// Client-side script / Socket.io frontend logic
const socket = io();

const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('statusText');
const percentText = document.getElementById('percentText');
const progressBar = document.getElementById('progressBar');

socket.on('connect', () => {
  console.log('Successfully connected to Socket.io server! ID:', socket.id);
  // Automatically query/trigger status on connection/refresh
  socket.emit('trigger-model-download');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});

downloadBtn.addEventListener('click', () => {
  socket.emit('trigger-model-download');
});

socket.on('model-download-progress', (data) => {
  const { percent, status } = data;
  statusText.textContent = status || 'Downloading...';
  percentText.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;

  if (percent > 0 && percent < 100) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading Model...';
  } else if (percent === 100) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Model Loaded';
    progressBar.classList.add('completed');
  } else {
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Trigger Model Download';
  }
});
