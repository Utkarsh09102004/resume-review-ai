"use client";

import { useEffect, useRef } from "react";

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export default function EditorPanel({ value, onChange }: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<import("@codemirror/view").EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let destroyed = false;

    async function initEditor() {
      const { EditorView, lineNumbers, highlightActiveLine, keymap } = await import("@codemirror/view");
      const { EditorState } = await import("@codemirror/state");
      const { defaultKeymap, history, historyKeymap } = await import("@codemirror/commands");
      const { bracketMatching, syntaxHighlighting, HighlightStyle } = await import("@codemirror/language");
      const { tags } = await import("@lezer/highlight");

      let latexSupport: import("@codemirror/state").Extension | null = null;
      try {
        const latexMod = await import("codemirror-lang-latex");
        latexSupport = latexMod.latex();
      } catch {
        // LaTeX language support not available, continue without it
      }

      if (destroyed || !containerRef.current) return;

      // Ink & Amber dark theme
      const inkAmberTheme = EditorView.theme(
        {
          "&": {
            backgroundColor: "#16161e",
            color: "#e8e4df",
            fontSize: "13px",
          },
          ".cm-content": {
            caretColor: "#e8a845",
            fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "#e8a845",
          },
          "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
            {
              backgroundColor: "#e8a84530",
            },
          ".cm-panels": {
            backgroundColor: "#1e1e28",
            color: "#e8e4df",
          },
          ".cm-panels.cm-panels-top": {
            borderBottom: "1px solid #2a2a3a",
          },
          ".cm-panels.cm-panels-bottom": {
            borderTop: "1px solid #2a2a3a",
          },
          ".cm-searchMatch": {
            backgroundColor: "#e8a84540",
            outline: "1px solid #e8a84560",
          },
          ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "#e8a84560",
          },
          ".cm-activeLine": {
            backgroundColor: "#1e1e2880",
          },
          ".cm-selectionMatch": {
            backgroundColor: "#e8a84525",
          },
          ".cm-matchingBracket, .cm-nonmatchingBracket": {
            backgroundColor: "#e8a84530",
            outline: "1px solid #e8a84550",
          },
          ".cm-gutters": {
            backgroundColor: "#0f0f14",
            color: "#8a8696",
            border: "none",
            borderRight: "1px solid #2a2a3a",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "#1e1e2880",
            color: "#e8a845",
          },
          ".cm-foldPlaceholder": {
            backgroundColor: "#1e1e28",
            border: "1px solid #2a2a3a",
            color: "#8a8696",
          },
          ".cm-tooltip": {
            border: "1px solid #2a2a3a",
            backgroundColor: "#1e1e28",
            color: "#e8e4df",
          },
          ".cm-tooltip .cm-tooltip-arrow:before": {
            borderTopColor: "#2a2a3a",
            borderBottomColor: "#2a2a3a",
          },
          ".cm-tooltip .cm-tooltip-arrow:after": {
            borderTopColor: "#1e1e28",
            borderBottomColor: "#1e1e28",
          },
          ".cm-tooltip-autocomplete": {
            "& > ul > li[aria-selected]": {
              backgroundColor: "#2a2a3a",
              color: "#e8e4df",
            },
          },
        },
        { dark: true }
      );

      const inkAmberHighlight = HighlightStyle.define([
        { tag: tags.keyword, color: "#e8a845" },
        { tag: [tags.name, tags.deleted, tags.character, tags.macroName], color: "#e8e4df" },
        { tag: [tags.function(tags.variableName), tags.labelName], color: "#8ab4f8" },
        { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#e8a845" },
        { tag: [tags.definition(tags.name), tags.separator], color: "#e8e4df" },
        { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: "#4ade80" },
        { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)], color: "#e8a845" },
        { tag: [tags.meta, tags.comment], color: "#8a8696" },
        { tag: tags.strong, fontWeight: "bold" },
        { tag: tags.emphasis, fontStyle: "italic" },
        { tag: tags.strikethrough, textDecoration: "line-through" },
        { tag: tags.link, color: "#8ab4f8", textDecoration: "underline" },
        { tag: tags.heading, fontWeight: "bold", color: "#e8a845" },
        { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: "#f87171" },
        { tag: [tags.processingInstruction, tags.string, tags.inserted], color: "#4ade80" },
        { tag: tags.invalid, color: "#f87171" },
      ]);

      const extensions = [
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        inkAmberTheme,
        syntaxHighlighting(inkAmberHighlight),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ];

      if (latexSupport) {
        extensions.push(latexSupport);
      }

      const state = EditorState.create({
        doc: value,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      viewRef.current = view;
    }

    initEditor();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // Only run on mount — the editor owns its document state after initialization.
    // External value prop changes are intentionally ignored because:
    // 1. The editor is the sole source of truth (parent reads via onChange).
    // 2. Syncing external value would destroy undo history and cursor position.
    // See Issue #23 — this is by design, not a bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto bg-bg-surface"
    />
  );
}
