const { useState, useCallback, useEffect, useRef } = React;

// URL da API agora é uma constante fixa.
const API_URL = 'https://meu-dominio.com/api.php';

// Helper function to load an image from a data URL.
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar dados da imagem.`));
    img.src = src;
  });
};

// Helper function to traverse a dropped directory and get all image files.
async function getFilesFromDirectory(entry) {
  const files = [];
  const reader = entry.createReader();

  return new Promise((resolve, reject) => {
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(files.filter(f => f.type.startsWith('image/')));
          return;
        }
        for (const subEntry of entries) {
          if (subEntry.isFile) {
            const file = await new Promise((res, rej) => subEntry.file(res, rej));
            files.push(file);
          } else if (subEntry.isDirectory) {
            // This can be made recursive if sub-folders are needed.
          }
        }
        readEntries();
      }, reject);
    };
    readEntries();
  });
}

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);


const ImageProcessor = () => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [itemName, setItemName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedImages, setProcessedImages] = useState([]);
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [view, setView] = useState('loading');
  
  const [brandingAssets, setBrandingAssets] = useState({
    logo: null,
    watermark: null,
    blackShield: null,
    whiteShield: null,
  });

  useEffect(() => {
    const fetchBrandingAssets = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Não foi possível buscar as configurações da API.');
            }
            const data = await response.json();
            if (data.logo && data.watermark && data.blackShield && data.whiteShield) {
                setBrandingAssets(data);
            }
        } catch (error) {
            console.error("Falha ao carregar recursos da API", error);
            // Opcional: alertar o usuário sobre a falha.
        }
        setView('app');
    };

    fetchBrandingAssets();
  }, []); // Executa apenas na montagem inicial


  const resetState = (goHome = false) => {
      setFiles([]);
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
      setItemName('');
      setIsProcessing(false);
      setProgress(0);
      processedImages.forEach(img => URL.revokeObjectURL(img.url));
      setProcessedImages([]);
      if(goHome) {
        setView('app');
      }
  }

  const handleNewFiles = (newFiles, folderName = null) => {
      previews.forEach(url => URL.revokeObjectURL(url));
      processedImages.forEach(img => URL.revokeObjectURL(img.url));
      setProcessedImages([]);
      setFiles([]);
      setPreviews([]);
      setProgress(0);
      setIsProcessing(false);

      if (folderName) {
          setItemName(folderName);
      }
      const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
      setFiles(imageFiles);
      setPreviews(imageFiles.map(file => URL.createObjectURL(file)));
  };
  
  const handleAssetChange = (e, assetName) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setBrandingAssets(prev => ({
                ...prev,
                [assetName]: event.target?.result
            }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    const allAssetsPresent = Object.values(brandingAssets).every(asset => !!asset);
    if (!allAssetsPresent) {
        alert("Por favor, carregue todas as quatro imagens de marca antes de salvar.");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(brandingAssets),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha ao salvar configurações no servidor: ${errorText}`);
        }
        
        alert("Configurações salvas com sucesso no servidor!");
        setView('app');
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        alert(`Ocorreu um erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };


  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDropzoneActive(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const firstItem = items[0].webkitGetAsEntry();
    if (firstItem && firstItem.isDirectory) {
      const filesInDir = await getFilesFromDirectory(firstItem);
      handleNewFiles(filesInDir, firstItem.name);
    } else {
      handleNewFiles(Array.from(e.dataTransfer.files));
    }
  }, []);
  
  const onFileInputChange = (e) => {
      const newFiles = e.target.files;
      if (!newFiles || newFiles.length === 0) return;

      const fileArray = Array.from(newFiles);
      const relativePath = fileArray[0]?.webkitRelativePath;
      
      let detectedFolderName = null;
      if (relativePath && relativePath.includes('/')) {
        detectedFolderName = relativePath.split('/')[0];
      }
      handleNewFiles(fileArray, detectedFolderName);
  }

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDropzoneActive(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDropzoneActive(false);
  }, []);

  const handleProcessImages = async () => {
    if (!brandingAssets.logo || !brandingAssets.watermark || !brandingAssets.blackShield || !brandingAssets.whiteShield) {
      alert("Os recursos de marca não foram carregados. Por favor, configure-os na tela de Configurações.");
      setView('settings');
      return;
    }
    setIsProcessing(true);
    setProgress(0);

    try {
      const [logoImg, watermarkImg, blackShieldImg, whiteShieldImg] = await Promise.all([
        loadImage(brandingAssets.logo),
        loadImage(brandingAssets.watermark),
        loadImage(brandingAssets.blackShield),
        loadImage(brandingAssets.whiteShield)
      ]);

      const results = [];
      const mainCanvas = document.createElement('canvas');
      const mainCtx = mainCanvas.getContext('2d');
      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d');

      if (!mainCtx || !offscreenCtx) throw new Error('Não foi possível obter o contexto do canvas');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const userImage = await loadImage(URL.createObjectURL(file));
        
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
        
        // Define um padding dinâmico com base na largura da imagem para um melhor espaçamento.
        // Usa no mínimo 20px, mas escala para imagens maiores (2.5% da largura).
        const padding = Math.max(20, mainCanvas.width * 0.025);

        // Desenha o logo com o novo padding.
        mainCtx.drawImage(logoImg, padding, padding);
        
        if (itemName.trim()) {
            const fontSize = Math.floor(mainCanvas.width * 0.03);
            mainCtx.font = `bold ${fontSize}px Arial`;
            mainCtx.fillStyle = 'white';
            mainCtx.textAlign = 'center';
            mainCtx.textBaseline = 'bottom';
            
            // Adiciona uma sombra sutil para melhorar a legibilidade
            mainCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            mainCtx.shadowBlur = 5;
            
            // Desenha o texto com o novo padding a partir da parte inferior.
            mainCtx.fillText(itemName, mainCanvas.width / 2, mainCanvas.height - padding);
            
            // Reseta a sombra para os próximos desenhos
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

        // Desenha o selo no canto inferior direito com o novo padding.
        const shieldX = mainCanvas.width - shieldToUse.width - padding;
        const shieldY = mainCanvas.height - shieldToUse.height - padding;
        mainCtx.drawImage(shieldToUse, shieldX, shieldY);

        const blob = await new Promise(resolve => mainCanvas.toBlob(resolve, 'image/png'));
        if (blob) {
            results.push({ url: URL.createObjectURL(blob), name: `processada_${file.name}` });
        }
        setProgress(((i + 1) / files.length) * 100);
      }
      setProcessedImages(results);
    } catch (error) {
      console.error("Objeto de erro completo:", error);
      alert(`Ocorreu um erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const downloadImage = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllAsZip = async () => {
    if (processedImages.length === 0) return;
    setIsZipping(true);

    try {
        const zip = new JSZip();
        for (const image of processedImages) {
            const response = await fetch(image.url);
            const blob = await response.blob();
            zip.file(image.name, blob);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const cleanItemName = itemName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const zipName = cleanItemName ? `processadas_${cleanItemName}.zip` : 'imagens_processadas.zip';
        
        downloadImage(URL.createObjectURL(zipBlob), zipName);

    } catch(error) {
        console.error("Erro ao criar arquivo ZIP:", error);
        alert("Falha ao criar o arquivo ZIP. Por favor, tente baixar as imagens individualmente.");
    } finally {
        setIsZipping(false);
    }
  };

  const renderAssetUploader = () => {
    const assetNames = {
        logo: 'Logo',
        watermark: 'Marca D\'água',
        blackShield: 'Selo Preto',
        whiteShield: 'Selo Branco'
    };
    return (
        <div className="asset-uploader-container">
            <header>
                <h1>Configurações</h1>
                <p>Atualize suas imagens de marca e salve-as no servidor.</p>
            </header>

            <div className="asset-grid">
                {Object.keys(brandingAssets).map(key => (
                    <div key={key} className="asset-upload-box">
                        <h3>{assetNames[key]}</h3>
                        <div className="asset-preview">
                            {brandingAssets[key] ? <img src={brandingAssets[key]} alt={`Preview de ${key}`} /> : <span>Preview</span>}
                        </div>
                        <input type="file" id={`asset-input-${key}`} onChange={(e) => handleAssetChange(e, key)} accept="image/png" style={{display: 'none'}} />
                        <label htmlFor={`asset-input-${key}`} className="btn btn-secondary">Carregar Imagem</label>
                    </div>
                ))}
            </div>
            
            <div className="settings-actions">
              <div className="button-group">
                <button className="btn btn-secondary" onClick={() => setView('app')}>
                    Voltar ao App
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleSaveSettings}
                >
                    Salvar Alterações no Servidor
                </button>
              </div>
            </div>

        </div>
    );
  }

  if (view === 'loading') {
    return <div className="loading-view">Carregando...</div>;
  }
  
  if (view === 'settings') {
    return renderAssetUploader();
  }

  if (isProcessing) {
    return (
      <div className="processing-view">
        <p>Processando imagens, por favor aguarde...</p>
        <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div>
        <p>{Math.round(progress)}%</p>
      </div>
    );
  }

  if (processedImages.length > 0) {
    return (
        <div className="results-section">
            <h2>Processamento Concluído!</h2>
            <div className="button-group">
                <button className="btn btn-success" onClick={downloadAllAsZip} disabled={isZipping}>
                    {isZipping ? 'Compactando...' : `Baixar Todas como ZIP (${processedImages.length})`}
                </button>
                <button className="btn btn-secondary" onClick={() => resetState(true)}>Começar de Novo</button>
            </div>
            <div className="results-grid">
                {processedImages.map((image, index) => (
                    <div key={index} className="result-card thumbnail-card">
                        <img src={image.url} alt={`Processada ${index + 1}`} />
                        <div className="download-button" onClick={() => downloadImage(image.url, image.name)} role="button" tabIndex={0}>Baixar</div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        {/* Conteúdo Centralizado */}
        <div>
          {brandingAssets.logo ? (
            <img src={brandingAssets.logo} alt="TPC-Telas" className="app-logo" />
          ) : (
            <h1>TPC-Telas</h1>
          )}
          <p>Aplique marcas d'água e branding em suas imagens em massa.</p>
        </div>
        
        {/* O botão de configurações será posicionado de forma absoluta */}
        <button className="btn-icon settings-button" onClick={() => setView('settings')} aria-label="Configurações">
            <SettingsIcon />
        </button>
      </header>
      <main>
        <div className="controls">
          <div className="input-group">
              <label htmlFor="item-name">Modelo do Caminhão/Utilitário</label>
              <input
                id="item-name"
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Preenchido a partir do nome da pasta ou insira manualmente"
                disabled={isProcessing}
              />
            </div>
          <div
            className={`dropzone ${isDropzoneActive ? 'active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            role="button"
            tabIndex={0}
            aria-label="Arraste e solte uma pasta aqui, ou clique para selecionar"
          >
            <p>Arraste e solte uma pasta ou arquivos aqui, ou clique para selecionar</p>
            <input
              type="file"
              id="file-input"
              multiple
              accept="image/png, image/jpeg"
              style={{ display: 'none' }}
              webkitdirectory="true"
              onChange={onFileInputChange}
            />
          </div>
        </div>
        
        {previews.length > 0 && (
          <>
            <h3>Preview das Imagens ({previews.length})</h3>
            <div className="image-preview-grid">
              {previews.map((src, index) => (
                <div key={index} className="thumbnail-card">
                  <img src={src} alt={`Preview ${index + 1}`} />
                   <div className="filename" title={files[index]?.name}>{files[index]?.name}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="button-group" style={{ marginTop: '2rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleProcessImages}
            disabled={files.length === 0 || !itemName.trim()}
          >
            Processar Imagens
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => resetState(false)}
          >
            Resetar
          </button>
        </div>
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<ImageProcessor />);
}
