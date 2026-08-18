import { useRef, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import * as CKEditorBrowser from 'ckeditor5/dist/browser/ckeditor5.js';
import 'ckeditor5/dist/browser/ckeditor5.css';
import './rich-text-editor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escriba el contenido del documento...',
  disabled = false,
  minHeight = '300px',
}: RichTextEditorProps) {
  const {
    ClassicEditor,
    Bold,
    Essentials,
    Italic,
    Paragraph,
    Undo,
    Heading,
    List,
    Alignment,
    Underline,
    Link,
    Indent,
    IndentBlock,
    FontSize,
    FontFamily,
  } = CKEditorBrowser;

  const editorRef = useRef<any>(null);

  // Update editor content when value changes externally (e.g., from OCR)
  useEffect(() => {
    if (editorRef.current && editorRef.current.getData() !== value) {
      editorRef.current.setData(value || '');
    }
  }, [value]);

  return (
    <div className="border rounded-md" style={{ minHeight }}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: 'GPL',
          toolbar: {
            items: [
              'undo', 'redo', '|',
              'heading', '|',
              'fontSize', 'fontFamily', '|',
              'bold', 'italic', 'underline', '|',
              'link', '|',
              'bulletedList', 'numberedList', '|',
              'alignment', '|',
              'outdent', 'indent',
            ]
          },
          plugins: [
            Bold,
            Essentials,
            Italic,
            Paragraph,
            Undo,
            Heading,
            List,
            Alignment,
            Underline,
            Link,
            Indent,
            IndentBlock,
            FontSize,
            FontFamily,
          ],
          // --- Heading options (paragraph styles) ---
          heading: {
            options: [
              { model: 'paragraph', title: 'Párrafo', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' },
            ]
          },
          // --- Font size options ---
          fontSize: {
            options: [10, 11, 12, 'default', 14, 16, 18, 20, 24, 28, 36],
            supportAllValues: false,
          },
          // --- Font family options ---
          fontFamily: {
            options: [
              'default',
              'Arial, Helvetica, sans-serif',
              'Times New Roman, Times, serif',
              'Courier New, Courier, monospace',
              'Georgia, serif',
              'Verdana, Geneva, sans-serif',
            ],
            supportAllValues: false,
          },
          // --- Indent block: controls paragraph indentation in px ---
          indentBlock: {
            offset: 40,
            unit: 'px',
          },
          // --- Alignment options ---
          alignment: {
            options: ['left', 'center', 'right', 'justify'],
          },
          placeholder,
          language: 'es',
        }}
        data={value}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
        disabled={disabled}
      />
    </div>
  );
}
