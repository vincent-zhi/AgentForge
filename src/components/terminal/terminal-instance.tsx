import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { bridge } from '@/ipc/bridge';

interface TerminalInstanceProps {
  terminalId?: string;
}

const PROMPT = '\r\n$ ';

const TerminalInstance: React.FC<TerminalInstanceProps> = ({ terminalId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef('');
  const isExecutingRef = useRef(false);

  const executeCommand = useCallback(async (command: string) => {
    if (!terminalRef.current || isExecutingRef.current) return;
    isExecutingRef.current = true;
    try {
      const result = await bridge.runtime.executeCommand(command) as {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
      };
      if (result.stdout) {
        terminalRef.current.write(result.stdout.replace(/\n/g, '\r\n'));
      }
      if (result.stderr) {
        terminalRef.current.write(`\x1b[31m${result.stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
      }
      if (result.exitCode !== 0 && result.exitCode !== undefined) {
        terminalRef.current.write(`\x1b[33mexit code: ${result.exitCode}\x1b[0m\r\n`);
      }
    } catch (err) {
      terminalRef.current.write(`\x1b[31m${String(err)}\x1b[0m\r\n`);
    }
    terminalRef.current.write(PROMPT);
    isExecutingRef.current = false;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#0B0D10',
        foreground: '#F2F4F6',
        cursor: '#FF7A1A',
        selectionBackground: '#FF7A1A40',
        black: '#0B0D10',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#8B5CF6',
        cyan: '#06B6D4',
        white: '#F2F4F6',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    try {
      fitAddon.fit();
    } catch {
      // ignore fit errors on initial mount
    }

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.write('\x1b[1m\x1b[36mAgentForge Terminal\x1b[0m');
    terminal.write(PROMPT);

    const dataDisposable = terminal.onData((data: string) => {
      if (isExecutingRef.current) return;

      if (data === '\r') {
        const command = inputBufferRef.current.trim();
        terminal.write('\r\n');
        inputBufferRef.current = '';
        if (command) {
          executeCommand(command);
        } else {
          terminal.write(PROMPT);
        }
      } else if (data === '\x7f') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        inputBufferRef.current = '';
        terminal.write('^C\r\n');
        terminal.write(PROMPT);
      } else if (data >= ' ') {
        inputBufferRef.current += data;
        terminal.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // ignore fit errors during resize
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalId, executeCommand]);

  return <div ref={containerRef} className="h-full w-full" />;
};

TerminalInstance.displayName = 'TerminalInstance';

export { TerminalInstance };
