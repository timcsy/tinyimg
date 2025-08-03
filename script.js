/**
 * TinyImg - 純前端圖片壓縮工具
 * 功能：拖曳上傳、剪貼簿貼上、壓縮圖片到指定大小
 */

class TinyImg {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.maxTargetSize = 1024 * 1024; // 1MB in bytes
        this.currentFile = null;
        this.compressedBlob = null;
    }

    init() {
        // 取得DOM元素
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.selectBtn = document.getElementById('selectBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.resultsArea = document.getElementById('resultsArea');
        
        // 圖片元素
        this.originalImage = document.getElementById('originalImage');
        this.compressedImage = document.getElementById('compressedImage');
        
        // 資訊顯示元素
        this.originalSize = document.getElementById('originalSize');
        this.compressedSize = document.getElementById('compressedSize');
        this.compressionRatio = document.getElementById('compressionRatio');
        
        // 按鈕元素
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // 設定元素
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.maxSizeInput = document.getElementById('maxSizeInput');
        this.formatSelect = document.getElementById('formatSelect');
        
        // Toast 元素
        this.toast = document.getElementById('toast');
        this.toastBody = document.getElementById('toastBody');
        this.bootstrapToast = new bootstrap.Toast(this.toast);
    }

    setupEventListeners() {
        // 檔案選擇
        this.selectBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖曳上傳
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 剪貼簿貼上
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // 品質滑桿
        this.qualitySlider.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value;
            if (this.currentFile) {
                this.debounceCompress();
            }
        });
        
        // 目標大小輸入
        this.maxSizeInput.addEventListener('input', () => {
            if (this.currentFile) {
                this.debounceCompress();
            }
        });
        
        // 格式選擇
        this.formatSelect.addEventListener('change', () => {
            if (this.currentFile) {
                this.compressImage(this.currentFile);
            }
        });
        
        // 按鈕事件
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
    }

    // 防抖功能，避免頻繁壓縮
    debounceCompress() {
        clearTimeout(this.compressTimeout);
        this.compressTimeout = setTimeout(() => {
            this.compressImage(this.currentFile);
        }, 500);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            this.processFile(imageFiles[0]);
        } else {
            this.showToast('請選擇圖片檔案', 'warning');
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async handlePaste(e) {
        const items = Array.from(e.clipboardData.items);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        
        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            this.processFile(file);
            this.showToast('已從剪貼簿貼上圖片', 'success');
        }
    }

    async processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('請選擇有效的圖片檔案', 'error');
            return;
        }

        this.currentFile = file;
        this.showProgress(true);
        this.updateProgress(0, '正在載入圖片...');

        try {
            // 顯示原始圖片
            await this.displayOriginalImage(file);
            this.updateProgress(30, '正在壓縮圖片...');
            
            // 壓縮圖片
            await this.compressImage(file);
            
            this.updateProgress(100, '處理完成！');
            setTimeout(() => {
                this.showProgress(false);
                this.showResults(true);
            }, 500);
            
        } catch (error) {
            console.error('處理圖片時發生錯誤:', error);
            this.showToast('處理圖片時發生錯誤', 'error');
            this.showProgress(false);
        }
    }

    async displayOriginalImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.originalImage.src = e.target.result;
                this.originalImage.onload = () => {
                    // 顯示原始圖片資訊
                    this.originalSize.textContent = this.formatFileSize(file.size);
                    resolve();
                };
            };
            reader.readAsDataURL(file);
        });
    }

    async compressImage(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // 計算壓縮後的尺寸
                const { width, height } = this.calculateDimensions(
                    img.naturalWidth, 
                    img.naturalHeight
                );
                
                canvas.width = width;
                canvas.height = height;
                
                // 繪製圖片到 canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // 獲取壓縮設定
                const quality = this.qualitySlider.value / 100;
                const format = this.formatSelect.value;
                const targetSize = this.maxSizeInput.value * 1024; // 轉換為 bytes
                
                // 漸進式壓縮以達到目標大小
                this.progressiveCompress(canvas, format, quality, targetSize)
                    .then((blob) => {
                        this.compressedBlob = blob;
                        this.displayCompressedImage(blob, width, height);
                        resolve();
                    });
            };
            
            img.src = this.originalImage.src;
        });
    }

    async progressiveCompress(canvas, format, initialQuality, targetSize) {
        let quality = initialQuality;
        let blob;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            blob = await new Promise(resolve => {
                canvas.toBlob(resolve, format, quality);
            });
            
            if (blob.size <= targetSize || attempts >= maxAttempts) {
                break;
            }
            
            // 減少品質以縮小檔案大小
            quality *= 0.9;
            attempts++;
            
        } while (blob.size > targetSize && quality > 0.1);
        
        return blob;
    }

    calculateDimensions(originalWidth, originalHeight) {
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let { width, height } = { width: originalWidth, height: originalHeight };
        
        // 如果圖片太大，按比例縮小
        if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            
            if (aspectRatio > maxWidth / maxHeight) {
                width = maxWidth;
                height = width / aspectRatio;
            } else {
                height = maxHeight;
                width = height * aspectRatio;
            }
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    displayCompressedImage(blob, width, height) {
        const url = URL.createObjectURL(blob);
        this.compressedImage.src = url;
        
        // 顯示壓縮後的資訊
        this.compressedSize.textContent = this.formatFileSize(blob.size);
        
        // 計算壓縮率
        const originalSize = this.currentFile.size;
        const compressionRatio = ((originalSize - blob.size) / originalSize * 100).toFixed(1);
        this.compressionRatio.textContent = `節省 ${compressionRatio}%`;
        
        // 清理之前的 URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async copyToClipboard() {
        if (!this.compressedBlob) {
            this.showToast('沒有可複製的圖片', 'warning');
            return;
        }

        try {
            // 檢查瀏覽器是否支援 Clipboard API
            if (!navigator.clipboard || !navigator.clipboard.write) {
                throw new Error('瀏覽器不支援剪貼簿 API');
            }

            // 檢查支援的圖片格式
            const supportedTypes = ['image/png'];
            let blobToWrite = this.compressedBlob;
            
            // 如果當前格式不被支援，轉換為 PNG
            if (!supportedTypes.includes(this.compressedBlob.type)) {
                blobToWrite = await this.convertToPng(this.compressedBlob);
            }

            const item = new ClipboardItem({
                [blobToWrite.type]: blobToWrite
            });
            
            await navigator.clipboard.write([item]);
            this.showToast('圖片已複製到剪貼簿', 'success');
            
        } catch (error) {
            console.error('複製到剪貼簿失敗:', error);
            
            // 嘗試備用方案：複製圖片的 data URL
            try {
                await this.copyImageAsDataUrl();
            } catch (fallbackError) {
                console.error('備用複製方案也失敗:', fallbackError);
                
                // 提供更詳細的錯誤訊息和解決方案
                let errorMessage = '複製失敗';
                if (error.name === 'NotAllowedError') {
                    errorMessage = '需要在 HTTPS 網站或 localhost 使用複製功能';
                } else if (error.message.includes('not supported')) {
                    errorMessage = '此瀏覽器不支援複製圖片，建議使用 Chrome 或 Firefox';
                } else {
                    errorMessage = '此瀏覽器不支援複製圖片，請使用下載功能';
                }
                
                this.showToast(errorMessage, 'warning');
            }
        }
    }

    // 轉換圖片為 PNG 格式
    async convertToPng(blob) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/png');
            };
            
            img.src = URL.createObjectURL(blob);
        });
    }

    // 備用方案：複製 data URL 到剪貼簿
    async copyImageAsDataUrl() {
        if (!navigator.clipboard.writeText) {
            throw new Error('不支援文字複製');
        }

        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                    await navigator.clipboard.writeText(reader.result);
                    this.showToast('圖片 Data URL 已複製到剪貼簿', 'info');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.compressedBlob);
        });
    }

    downloadImage() {
        if (!this.compressedBlob) {
            this.showToast('沒有可下載的圖片', 'warning');
            return;
        }

        const url = URL.createObjectURL(this.compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        
        // 生成檔案名稱
        const originalName = this.currentFile.name;
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const extension = this.getFileExtension(this.formatSelect.value);
        a.download = `${nameWithoutExt}_compressed.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showToast('圖片下載開始', 'success');
    }

    getFileExtension(mimeType) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
        };
        return extensions[mimeType] || 'jpg';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateProgress(percent, text) {
        this.progressBar.style.width = percent + '%';
        this.progressText.textContent = text;
    }

    showProgress(show) {
        this.progressContainer.classList.toggle('d-none', !show);
        if (show) {
            this.progressContainer.classList.add('fade-in');
        }
    }

    showResults(show) {
        this.resultsArea.classList.toggle('d-none', !show);
        if (show) {
            this.resultsArea.classList.add('fade-in');
        }
    }

    showToast(message, type = 'info') {
        const iconMap = {
            'success': 'bi-check-circle',
            'error': 'bi-exclamation-triangle',
            'warning': 'bi-exclamation-circle',
            'info': 'bi-info-circle'
        };
        
        const colorMap = {
            'success': 'text-success',
            'error': 'text-danger',
            'warning': 'text-warning',
            'info': 'text-primary'
        };
        
        const icon = iconMap[type] || iconMap['info'];
        const color = colorMap[type] || colorMap['info'];
        
        // 更新 toast 內容
        this.toast.querySelector('.toast-header i').className = `bi ${icon} ${color} me-2`;
        this.toastBody.textContent = message;
        
        // 顯示 toast
        this.bootstrapToast.show();
    }
}

// 當頁面載入完成後初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    new TinyImg();
    
    // 檢查瀏覽器支援度
    const checkBrowserSupport = () => {
        const support = {
            clipboard: !!navigator.clipboard,
            clipboardWrite: !!(navigator.clipboard && navigator.clipboard.write),
            clipboardWriteText: !!(navigator.clipboard && navigator.clipboard.writeText),
            canvasToBlob: !!HTMLCanvasElement.prototype.toBlob,
            fileReader: !!window.FileReader,
            dragDrop: 'ondragstart' in document.createElement('div'),
        };

        console.log('瀏覽器支援度檢查:', support);

        // 顯示警告訊息給使用者
        if (!support.clipboard) {
            console.warn('此瀏覽器不完全支援剪貼簿 API，複製功能可能有限');
        }
        
        if (!support.canvasToBlob) {
            console.warn('此瀏覽器不支援 Canvas toBlob API，壓縮功能可能無法正常運作');
        }

        return support;
    };

    const browserSupport = checkBrowserSupport();
    
    // 如果不支援剪貼簿，更新 UI 提示
    if (!browserSupport.clipboard) {
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.innerHTML = '<i class="bi bi-exclamation-triangle fs-4 me-2"></i><span class="fs-5">不支援複製</span>';
            copyBtn.disabled = true;
            copyBtn.classList.remove('btn-dark', 'copy-main-btn');
            copyBtn.classList.add('btn-secondary');
        }
    }
});
