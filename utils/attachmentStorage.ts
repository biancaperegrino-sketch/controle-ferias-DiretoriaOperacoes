import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

// Saves a record with optional large attachment chunking in Firestore
export async function saveRecordWithAttachment(
  recordId: string,
  recordData: Record<string, any>,
  attachmentData?: string
): Promise<void> {
  const attachment = attachmentData || '';
  // Nunca permita que um anexo enorme seja escrito no documento principal.
  // O limite do Firestore é 1 MiB por documento.
  const CHUNK_SIZE = 250000;
  
  // If attachment is small (< 300KB base64, ~225KB file), store directly in main document
  if (attachment.length <= 400000) {
    const finalData = {
      ...recordData,
      attachmentData: attachment
    };
    await setDoc(doc(db, 'records', recordId), finalData);
    
    // Clean up any old subcollection chunks if present
    try {
      const chunksSnap = await getDocs(collection(db, 'records', recordId, 'chunks'));
      for (const d of chunksSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (_) {}
    return;
  }

  // If attachment is large (> 300KB base64), store metadata in main doc and chunks in subcollection
  const recordWithoutAttachment = {
    ...recordData,
    attachmentData: '' // Keep main doc small (< 10KB)
  };

  // 1. Chunk base64 string into 500,000 char pieces (~500KB per chunk)
  const chunks: string[] = [];
  for (let i = 0; i < attachment.length; i += CHUNK_SIZE) {
    chunks.push(attachment.slice(i, i + CHUNK_SIZE));
  }

  // 2. Write chunks to subcollection `records/{recordId}/chunks/chunk_{i}`
  for (let i = 0; i < chunks.length; i++) {
    await setDoc(doc(db, 'records', recordId, 'chunks', `chunk_${i}`), {
      index: i,
      data: chunks[i]
    });
  }

  // 3. Commit metadata only after all chunks were saved.
  // The record will not appear as successfully saved if an upload fails.
  await setDoc(doc(db, 'records', recordId), recordWithoutAttachment);

  // 4. Delete leftover old chunks if current attachment has fewer chunks
  try {
    const chunksSnap = await getDocs(collection(db, 'records', recordId, 'chunks'));
    for (const d of chunksSnap.docs) {
      const chunkIdx = d.data()?.index;
      if (typeof chunkIdx === 'number' && chunkIdx >= chunks.length) {
        await deleteDoc(d.ref);
      }
    }
  } catch (_) {}
}

// Loads full attachment base64 data (from main doc or subcollection chunks)
export async function loadFullAttachment(recordId: string, initialAttachmentData?: string): Promise<string> {
  if (initialAttachmentData && initialAttachmentData.length > 0) {
    return initialAttachmentData;
  }
  try {
    const chunksSnap = await getDocs(collection(db, 'records', recordId, 'chunks'));
    if (chunksSnap.empty) return '';
    const docs = chunksSnap.docs.map(d => d.data() as { index: number; data: string });
    docs.sort((a, b) => a.index - b.index);
    return docs.map(d => d.data).join('');
  } catch (err) {
    console.error('Error loading attachment chunks:', err);
    return '';
  }
}

// Deletes record document and its subcollection chunks
export async function deleteRecordWithAttachment(recordId: string): Promise<void> {
  try {
    const chunksSnap = await getDocs(collection(db, 'records', recordId, 'chunks'));
    for (const d of chunksSnap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (_) {}
  await deleteDoc(doc(db, 'records', recordId));
}

// Opens or downloads attachment base64 string safely
export async function openOrDownloadAttachment(recordId: string, fileName: string, initialData?: string): Promise<void> {
  const base64Data = await loadFullAttachment(recordId, initialData);
  if (!base64Data) {
    alert('Não foi possível carregar o conteúdo do anexo.');
    return;
  }

  try {
    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].replace('data:', '');
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      if (contentType.startsWith('image/') || contentType.includes('pdf')) {
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error('Error opening attachment:', err);
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
