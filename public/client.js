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
    // Enable generation once model is loaded
    document.getElementById('generateBtn').disabled = false;
  } else {
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Trigger Model Download';
  }
});

// Generation handler elements
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const genStatusContainer = document.getElementById('genStatusContainer');
const genStatusText = document.getElementById('genStatusText');
const genPercentText = document.getElementById('genPercentText');
const genProgressBar = document.getElementById('genProgressBar');
const resultImage = document.getElementById('resultImage');

generateBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  if (!prompt) return alert('Please enter a prompt.');

  generateBtn.disabled = true;
  genStatusContainer.style.display = 'block';
  resultImage.style.display = 'none';

  socket.emit('generate', { prompt, ratio: '1:1' });
});

socket.on('progress', (data) => {
  const { percent, status, sub } = data;
  genStatusText.textContent = `${sub || 'Running'}: ${status}`;
  genPercentText.textContent = `${percent}%`;
  genProgressBar.style.width = `${percent}%`;
});

socket.on('success', (data) => {
  generateBtn.disabled = false;
  genStatusText.textContent = 'Generation complete!';
  genPercentText.textContent = '100%';
  genProgressBar.style.width = '100%';
  
  resultImage.src = data.url;
  resultImage.style.display = 'block';
  console.log('Successfully generated image payload:', data.url.substring(0, 100) + '...');
});

socket.on('error_event', (err) => {
  generateBtn.disabled = false;
  alert(`Error: ${err.message}`);
});
