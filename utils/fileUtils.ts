export const processFileAttachment = (file: File): Promise<{ name: string; data: string }> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Erro ao ler a imagem.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Erro ao carregar a imagem.'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao processar contexto gráfico da imagem.'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          // If still large, compress further automatically
          if (dataUrl.length > 900000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          }
          if (dataUrl.length > 900000) {
            canvas.width = Math.round(width * 0.6);
            canvas.height = Math.round(height * 0.6);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.4);
          }

          resolve({ name: file.name, data: dataUrl });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF, EML, MSG, etc. - process without artificial KB limit
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve({ name: file.name, data: base64 });
      };
      reader.readAsDataURL(file);
    }
  });
};
