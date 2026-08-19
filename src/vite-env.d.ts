/// <reference types="vite/client" />

// CKEditor 5 ships its browser bundle without type declarations, and the path is
// resolved through a Vite alias (see vite.config.ts) that TypeScript cannot
// follow. Declare the modules so the editor keeps working without disabling
// typechecking for the whole file.
declare module 'ckeditor5/dist/browser/ckeditor5.js' {
  const CKEditorBrowser: Record<string, any>;
  export = CKEditorBrowser;
}

declare module 'ckeditor5/dist/browser/ckeditor5.css';
