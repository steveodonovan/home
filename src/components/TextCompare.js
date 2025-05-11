// src/components/TextCompare.js
import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { diffWords } from 'diff';
import './TextCompare.css';

const STORAGE_KEY_1 = 'text-compare-left';
const STORAGE_KEY_2 = 'text-compare-right';

const monacoOptions = {
  selectOnLineNumbers: true,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line',
  automaticLayout: true,
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  minimap: { enabled: false },
  fontSize: 16,
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 0,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
  },
};

function offsetToPos(text, offset) {
  const lines = text.slice(0, offset).split('\n');
  const lineNumber = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { lineNumber, column };
}

function getDecorations(text, otherText, side) {
  let diffs, walkText;
  if (side === 'left') {
    diffs = diffWords(text, otherText);
    walkText = text;
  } else {
    diffs = diffWords(otherText, text);
    walkText = text;
  }
  let decorations = [];
  let pos = 0;
  for (let i = 0; i < diffs.length; i++) {
    const part = diffs[i];
    const length = part.value.length;
    if (side === 'left') {
      if (part.removed) {
        const start = pos;
        const end = pos + length;
        const startPos = offsetToPos(walkText, start);
        const endPos = offsetToPos(walkText, end);
        decorations.push({
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          options: {
            inlineClassName: 'monaco-diff-removed',
          },
        });
      }
      if (!part.added) pos += length;
    } else {
      if (part.added) {
        const start = pos;
        const end = pos + length;
        const startPos = offsetToPos(walkText, start);
        const endPos = offsetToPos(walkText, end);
        decorations.push({
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          options: {
            inlineClassName: 'monaco-diff-added',
          },
        });
      }
      if (!part.removed) pos += length;
    }
  }
  return decorations;
}

const TextCompare = () => {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const leftEditorRef = useRef(null);
  const rightEditorRef = useRef(null);
  const monacoRef = useRef(null);
  const leftDecorations = useRef([]);
  const rightDecorations = useRef([]);
  const isScrolling = useRef(false);
  const scrollAnimationFrame = useRef(null);

  useEffect(() => {
    setText1(localStorage.getItem(STORAGE_KEY_1) || '');
    setText2(localStorage.getItem(STORAGE_KEY_2) || '');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_1, text1);
  }, [text1]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_2, text2);
  }, [text2]);

  // Decorations for left editor
  useEffect(() => {
    if (leftEditorRef.current && monacoRef.current) {
      const decorations = getDecorations(text1, text2, 'left');
      leftDecorations.current = leftEditorRef.current.deltaDecorations(leftDecorations.current, decorations);
    }
  }, [text1, text2]);

  // Decorations for right editor
  useEffect(() => {
    if (rightEditorRef.current && monacoRef.current) {
      const decorations = getDecorations(text2, text1, 'right');
      rightDecorations.current = rightEditorRef.current.deltaDecorations(rightDecorations.current, decorations);
    }
  }, [text1, text2]);

  // Add scroll synchronization
  useEffect(() => {
    if (leftEditorRef.current && rightEditorRef.current) {
      const leftEditor = leftEditorRef.current;
      const rightEditor = rightEditorRef.current;

      const handleLeftScroll = () => {
        if (isScrolling.current) return;
        isScrolling.current = true;
        
        if (scrollAnimationFrame.current) {
          cancelAnimationFrame(scrollAnimationFrame.current);
        }

        scrollAnimationFrame.current = requestAnimationFrame(() => {
          const scrollTop = leftEditor.getScrollTop();
          rightEditor.setScrollTop(scrollTop);
          isScrolling.current = false;
        });
      };

      const handleRightScroll = () => {
        if (isScrolling.current) return;
        isScrolling.current = true;
        
        if (scrollAnimationFrame.current) {
          cancelAnimationFrame(scrollAnimationFrame.current);
        }

        scrollAnimationFrame.current = requestAnimationFrame(() => {
          const scrollTop = rightEditor.getScrollTop();
          leftEditor.setScrollTop(scrollTop);
          isScrolling.current = false;
        });
      };

      leftEditor.onDidScrollChange(handleLeftScroll);
      rightEditor.onDidScrollChange(handleRightScroll);

      return () => {
        if (scrollAnimationFrame.current) {
          cancelAnimationFrame(scrollAnimationFrame.current);
        }
        leftEditor.dispose();
        rightEditor.dispose();
      };
    }
  }, [leftEditorRef.current, rightEditorRef.current]);

  return (
    <div className="text-compare-wrapper">
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100vh"
          width="100%"
          language="json"
          theme="vs-dark"
          value={text1}
          onChange={v => setText1(v || '')}
          options={monacoOptions}
          onMount={(editor, monaco) => {
            leftEditorRef.current = editor;
            monacoRef.current = monaco;
          }}
        />
      </div>
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100vh"
          width="100%"
          language="json"
          theme="vs-dark"
          value={text2}
          onChange={v => setText2(v || '')}
          options={monacoOptions}
          onMount={(editor, monaco) => {
            rightEditorRef.current = editor;
            monacoRef.current = monaco;
          }}
        />
      </div>
    </div>
  );
};

export default TextCompare;
