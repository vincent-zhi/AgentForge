import { useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import { bridge } from '@/ipc/bridge';

interface InlineSuggestionState {
  decorationIds: string[];
  isActive: boolean;
  suggestionText: string;
}

export class InlineSuggestionController {
  private editor: editor.IStandaloneCodeEditor;
  private state: InlineSuggestionState = {
    decorationIds: [],
    isActive: false,
    suggestionText: '',
  };

  constructor(editor: editor.IStandaloneCodeEditor) {
    this.editor = editor;
  }

  async trigger(): Promise<void> {
    if (this.state.isActive) {
      this.dismiss();
      return;
    }

    const model = this.editor.getModel();
    if (!model) return;

    const position = this.editor.getPosition();
    if (!position) return;

    const fileContent = model.getValue();
    const lineNumber = position.lineNumber;
    const column = position.column;

    const lineCount = model.getLineCount();
    const startLine = Math.max(1, lineNumber - 20);
    const endLine = Math.min(lineCount, lineNumber + 20);

    const beforeLines: string[] = [];
    for (let i = startLine; i < lineNumber; i++) {
      beforeLines.push(model.getLineContent(i));
    }
    const currentLine = model.getLineContent(lineNumber);
    const beforeCursor = currentLine.substring(0, column - 1);

    const afterLines: string[] = [];
    for (let i = lineNumber; i <= endLine; i++) {
      if (i === lineNumber) {
        afterLines.push(currentLine.substring(column - 1));
      } else {
        afterLines.push(model.getLineContent(i));
      }
    }

    const context = [
      '=== Before cursor ===',
      beforeLines.join('\n'),
      beforeCursor + '<|CURSOR|>',
      '=== After cursor ===',
      afterLines.join('\n'),
      '=== Full file (for reference) ===',
      fileContent.substring(0, 2000),
    ].join('\n');

    try {
      const response = await bridge.runtime.executeCommand(
        JSON.stringify({ type: 'inline-suggestion', context }),
      );

      let suggestionText = '';
      if (typeof response === 'object' && response !== null && 'output' in response) {
        suggestionText = (response as { output: string }).output;
      } else if (typeof response === 'string') {
        suggestionText = response;
      }

      if (!suggestionText.trim()) return;

      this.state.suggestionText = suggestionText;
      this.state.isActive = true;

      this.showDecoration(lineNumber, column, suggestionText);
    } catch {
      this.dismiss();
    }
  }

  private showDecoration(lineNumber: number, column: number, text: string): void {
    const model = this.editor.getModel();
    if (!model) return;

    const currentLineContent = model.getLineContent(lineNumber);
    const afterCursor = currentLineContent.substring(column - 1);

    const displayText = afterCursor ? text : text;

    this.state.decorationIds = this.editor.deltaDecorations([], [
      {
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
        },
        options: {
          after: {
            content: displayText,
            inlineClassName: 'inline-suggestion-ghost',
          },
          stickiness: 1,
        },
      },
    ]);
  }

  accept(): void {
    if (!this.state.isActive) return;

    const model = this.editor.getModel();
    const position = this.editor.getPosition();
    if (!model || !position) return;

    const text = this.state.suggestionText;
    this.dismiss();

    const lineNumber = position.lineNumber;
    const column = position.column;
    const currentLine = model.getLineContent(lineNumber);
    const afterCursor = currentLine.substring(column - 1);

    if (afterCursor) {
      const overlapLen = this.findOverlap(afterCursor, text);
      const insertText = text.substring(overlapLen);
      if (insertText) {
        this.editor.executeEdits('inline-suggestion-accept', [
          {
            range: {
              startLineNumber: lineNumber,
              startColumn: column + overlapLen,
              endLineNumber: lineNumber,
              endColumn: column + overlapLen,
            },
            text: insertText,
          },
        ]);
      }
    } else {
      this.editor.executeEdits('inline-suggestion-accept', [
        {
          range: {
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
          },
          text,
        },
      ]);
    }
  }

  private findOverlap(existing: string, suggestion: string): number {
    let maxOverlap = 0;
    for (let len = 1; len <= Math.min(existing.length, suggestion.length); len++) {
      if (existing.substring(0, len) === suggestion.substring(0, len)) {
        maxOverlap = len;
      }
    }
    return maxOverlap;
  }

  dismiss(): void {
    if (this.state.decorationIds.length > 0) {
      this.editor.deltaDecorations(this.state.decorationIds, []);
    }
    this.state = {
      decorationIds: [],
      isActive: false,
      suggestionText: '',
    };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  dispose(): void {
    this.dismiss();
  }
}

export function useInlineSuggestion(editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>) {
  const controllerRef = useRef<InlineSuggestionController | null>(null);

  const getOrCreateController = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return null;
    if (!controllerRef.current) {
      controllerRef.current = new InlineSuggestionController(ed);
    }
    return controllerRef.current;
  }, [editorRef]);

  const triggerSuggestion = useCallback(async () => {
    const controller = getOrCreateController();
    if (!controller) return;
    await controller.trigger();
  }, [getOrCreateController]);

  const acceptSuggestion = useCallback(() => {
    const controller = getOrCreateController();
    if (!controller) return;
    controller.accept();
  }, [getOrCreateController]);

  const dismissSuggestion = useCallback(() => {
    const controller = getOrCreateController();
    if (!controller) return;
    controller.dismiss();
  }, [getOrCreateController]);

  const disposeSuggestion = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.dispose();
      controllerRef.current = null;
    }
  }, []);

  return {
    triggerSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    disposeSuggestion,
  };
}
