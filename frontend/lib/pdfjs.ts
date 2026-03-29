import type * as pdfjsLib from "pdfjs-dist";

export type PdfJsModule = typeof pdfjsLib;

export async function loadPdfJs(): Promise<PdfJsModule> {
  return import("pdfjs-dist");
}
