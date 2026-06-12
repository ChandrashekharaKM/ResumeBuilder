import * as pdfjs from 'pdfjs-dist';

// Configure the PDF.js worker using a compatible cdnjs version to avoid Vite bundling paths issues
const pdfjsVersion = pdfjs.version || '4.0.370';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

/**
 * Parses a PDF file and returns its raw text content.
 * @param file The PDF File object uploaded by the user
 */
export async function parsePdfText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (!result) {
          throw new Error("Failed to read file buffer");
        }
        const typedarray = new Uint8Array(result as ArrayBuffer);
        const loadingTask = pdfjs.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        resolve(fullText.trim());
      } catch (error) {
        console.error("PDF Parsing Error:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
