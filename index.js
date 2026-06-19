const API_URL = 'https://tpctelas.com.br/img/api.php';

// State
let brandingAssets = { logo: null, watermark: null, blackShield: null, whiteShield: null };
let files = [];
let processedImages = [];

// Helper to load image
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar dados da imagem.'));
    img.src = src;
  });
};

async function getFilesFromDirectory(entry) {
  const filesList = [];
  const reader = entry.createReader();

  return new Promise((resolve, reject) => {
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(filesList.filter(f => f.type.startsWith('image/')));
          return;
        }
        for (const subEntry of entries) {
          if (subEntry.isFile) {
            const file = await new Promise((res, rej) => subEntry.file(res, rej));
            filesList.push(file);
          } else if (subEntry.isDirectory) {
            // Can be recursive if needed
          }
        }
        readEntries();
      }, reject);
    };
    readEntries();
  });
}

function showView(viewName) {
  const views = ['loading-view', 'app-view', 'settings-view', 'processing-view', 'results-view'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = id === `${viewName}-view` ? 'block' : 'none';
    }
  });
}

async function init() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      if (data.logo && data.watermark && data.blackShield && data.whiteShield) {
        brandingAssets = data;
        updateAppHeaderLogo();
      }
    }
  } catch(e) {
    console.error("Falha ao carregar recursos da API", e);
  }
  showView('app');
  setupEventListeners();
  updateSettingsPreviews();
}

function updateAppHeaderLogo() {
  const img = document.getElementById('app-logo-img');
  const text = document.getElementById('app-logo-text');
  if (brandingAssets.logo) {
    img.src = brandingAssets.logo;
    img.style.display = 'inline-block';
    text.style.display = 'none';
  } else {
    img.style.display = 'none';
    text.style.display = 'block';
  }
}

function setupEventListeners() {
  // Navigation
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    updateSettingsPreviews();
    showView('settings');
  });
  document.getElementById('btn-back-to-app').addEventListener('click', () => showView('app'));

  // Settings File Inputs
  ['logo', 'watermark', 'blackShield', 'whiteShield'].forEach(key => {
    const input = document.getElementById(`asset-input-${key}`);
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          brandingAssets[key] = event.target.result;
          updateSettingsPreviews();
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // Save Settings
  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const allAssetsPresent = Object.values(brandingAssets).every(asset => !!asset);
    if (!allAssetsPresent) {
      alert("Por favor, carregue todas as quatro imagens de marca antes de salvar.");
      return;
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingAssets)
      });
      if (!response.ok) throw new Error(await response.text());
      alert("Configurações salvas com sucesso no servidor!");
      updateAppHeaderLogo();
      showView('app');
    } catch(e) {
      alert("Erro ao salvar: " + e.message);
    }
  });

  // Dropzone
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  
  dropzone.addEventListener('click', () => fileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('active');
  });
  
  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('active');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('active');
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;
    const firstItem = items[0].webkitGetAsEntry();
    if (firstItem && firstItem.isDirectory) {
      const filesInDir = await getFilesFromDirectory(firstItem);
      handleNewFiles(filesInDir, firstItem.name);
    } else {
      handleNewFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;
    const relativePath = newFiles[0].webkitRelativePath;
    let folderName = null;
    if (relativePath && relativePath.includes('/')) {
      folderName = relativePath.split('/')[0];
    }
    handleNewFiles(newFiles, folderName);
  });

  // Controls
  const itemNameInput = document.getElementById('item-name');
  itemNameInput.addEventListener('input', updateProcessButton);

  document.getElementById('btn-process').addEventListener('click', handleProcessImages);
  document.getElementById('btn-reset').addEventListener('click', () => resetState(false));
  document.getElementById('btn-start-over').addEventListener('click', () => resetState(true));
  document.getElementById('btn-download-zip').addEventListener('click', downloadAllAsZip);
}

function updateSettingsPreviews() {
  ['logo', 'watermark', 'blackShield', 'whiteShield'].forEach(key => {
    const img = document.getElementById(`preview-${key}`);
    const span = document.getElementById(`span-${key}`);
    if (brandingAssets[key]) {
      img.src = brandingAssets[key];
      img.style.display = 'block';
      span.style.display = 'none';
    } else {
      img.style.display = 'none';
      span.style.display = 'block';
    }
  });
}

function handleNewFiles(newFiles, folderName = null) {
  files = newFiles.filter(f => f.type.startsWith('image/'));
  
  const itemNameInput = document.getElementById('item-name');
  if (folderName) itemNameInput.value = folderName;
  
  const previewsContainer = document.getElementById('previews-container');
  const previewsGrid = document.getElementById('previews-grid');
  document.getElementById('previews-title').innerText = `Preview das Imagens (${files.length})`;
  
  previewsGrid.innerHTML = '';
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    const card = document.createElement('div');
    card.className = 'thumbnail-card';
    card.innerHTML = `<img src="${url}" alt="Preview" /><div class="filename" title="${file.name}">${file.name}</div>`;
    previewsGrid.appendChild(card);
  });
  
  if (files.length > 0) {
    previewsContainer.style.display = 'block';
  } else {
    previewsContainer.style.display = 'none';
  }
  
  updateProcessButton();
}

function updateProcessButton() {
  const itemName = document.getElementById('item-name').value.trim();
  const btn = document.getElementById('btn-process');
  btn.disabled = files.length === 0 || !itemName;
}

function resetState(goHome = false) {
  files = [];
  processedImages.forEach(img => URL.revokeObjectURL(img.url));
  processedImages = [];
  
  document.getElementById('item-name').value = '';
  document.getElementById('previews-grid').innerHTML = '';
  document.getElementById('previews-container').style.display = 'none';
  document.getElementById('results-grid').innerHTML = '';
  document.getElementById('file-input').value = '';
  updateProcessButton();
  
  if (goHome) showView('app');
}

async function handleProcessImages() {
  const itemName = document.getElementById('item-name').value.trim();
  if (!brandingAssets.logo || !brandingAssets.watermark || !brandingAssets.blackShield || !brandingAssets.whiteShield) {
    alert("Os recursos de marca não foram carregados. Por favor, configure-os na tela de Configurações.");
    showView('settings');
    return;
  }
  
  showView('processing');
  const progressBar = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  progressBar.style.width = '0%';
  progressText.innerText = '0%';
  
  try {
    const [logoImg, watermarkImg, blackShieldImg, whiteShieldImg] = await Promise.all([
      loadImage(brandingAssets.logo),
      loadImage(brandingAssets.watermark),
      loadImage(brandingAssets.blackShield),
      loadImage(brandingAssets.whiteShield)
    ]);

    processedImages = [];
    const mainCanvas = document.createElement('canvas');
    const mainCtx = mainCanvas.getContext('2d');
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const userImage = await loadImage(url);
      
      offscreenCanvas.width = userImage.width;
      offscreenCanvas.height = userImage.height;
      offscreenCtx.filter = 'contrast(1.15) saturate(1.1) brightness(1.05)';
      offscreenCtx.drawImage(userImage, 0, 0);

      mainCanvas.width = userImage.width;
      mainCanvas.height = userImage.height;
      mainCtx.drawImage(offscreenCanvas, 0, 0);
      
      const watermarkX = (mainCanvas.width - watermarkImg.width) / 2;
      const watermarkY = (mainCanvas.height - watermarkImg.height) / 2;
      mainCtx.drawImage(watermarkImg, watermarkX, watermarkY);
      
      const padding = Math.max(20, mainCanvas.width * 0.025);
      mainCtx.drawImage(logoImg, padding, padding);
      
      if (itemName) {
        const fontSize = Math.floor(mainCanvas.width * 0.03);
        mainCtx.font = `bold ${fontSize}px Arial`;
        mainCtx.fillStyle = 'white';
        mainCtx.textAlign = 'center';
        mainCtx.textBaseline = 'bottom';
        mainCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        mainCtx.shadowBlur = 5;
        mainCtx.fillText(itemName, mainCanvas.width / 2, mainCanvas.height - padding);
        mainCtx.shadowColor = 'transparent';
        mainCtx.shadowBlur = 0;
      }

      const cornerSize = 100;
      const cornerX = mainCanvas.width - cornerSize;
      const cornerY = mainCanvas.height - cornerSize;
      const cornerImageData = mainCtx.getImageData(cornerX, cornerY, cornerSize, cornerSize);
      const data = cornerImageData.data;
      let totalLuminance = 0;
      for (let j = 0; j < data.length; j += 4) {
        totalLuminance += (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]);
      }
      const avgLuminance = totalLuminance / (cornerSize * cornerSize);
      const shieldToUse = avgLuminance < 128 ? whiteShieldImg : blackShieldImg;

      const shieldX = mainCanvas.width - shieldToUse.width - padding;
      const shieldY = mainCanvas.height - shieldToUse.height - padding;
      mainCtx.drawImage(shieldToUse, shieldX, shieldY);

      const blob = await new Promise(resolve => mainCanvas.toBlob(resolve, 'image/png'));
      if (blob) {
        processedImages.push({ url: URL.createObjectURL(blob), name: `processada_${file.name}` });
      }
      
      const progress = ((i + 1) / files.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.innerText = `${Math.round(progress)}%`;
      URL.revokeObjectURL(url);
    }
    
    renderResults();
    showView('results');
  } catch (error) {
    console.error("Objeto de erro completo:", error);
    alert(`Ocorreu um erro: ${error.message || String(error)}`);
    showView('app');
  }
}

function renderResults() {
  const resultsGrid = document.getElementById('results-grid');
  document.getElementById('btn-download-zip').innerText = `Baixar Todas como ZIP (${processedImages.length})`;
  resultsGrid.innerHTML = '';
  processedImages.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'result-card thumbnail-card';
    card.innerHTML = `
      <img src="${img.url}" alt="Processada ${idx + 1}" />
      <div class="download-button" role="button" tabindex="0">Baixar</div>
    `;
    card.querySelector('.download-button').addEventListener('click', () => downloadImage(img.url, img.name));
    resultsGrid.appendChild(card);
  });
}

function downloadImage(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function downloadAllAsZip() {
  if (processedImages.length === 0) return;
  const btn = document.getElementById('btn-download-zip');
  btn.disabled = true;
  btn.innerText = 'Compactando...';

  try {
    const zip = new JSZip();
    for (const image of processedImages) {
      const response = await fetch(image.url);
      const blob = await response.blob();
      zip.file(image.name, blob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const itemName = document.getElementById('item-name').value.trim();
    const cleanItemName = itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const zipName = cleanItemName ? `processadas_${cleanItemName}.zip` : 'imagens_processadas.zip';
    
    downloadImage(URL.createObjectURL(zipBlob), zipName);
  } catch(error) {
    console.error("Erro ao criar arquivo ZIP:", error);
    alert("Falha ao criar o arquivo ZIP. Por favor, tente baixar as imagens individualmente.");
  } finally {
    btn.disabled = false;
    btn.innerText = `Baixar Todas como ZIP (${processedImages.length})`;
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
