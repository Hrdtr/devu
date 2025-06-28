import type { ExecConfigBase, ExecEvent } from '../_shared/types'
import type { Input, Options } from './definition'
import { config as appConfig } from '@/config'

export * from './definition'

export type ExecConfig = ExecConfigBase & {
  options: Options
}

export async function* exec(input: Input, config: ExecConfig): AsyncGenerator<ExecEvent> {
  if (config.abortSignal?.aborted) {
    yield { type: 'result', data: null, error: 'Execution aborted before start' }
    return
  }

  const transpiler = new Bun.Transpiler({
    target: 'browser',
    allowBunRuntime: false,
  })

  try {
    let transpiledCode: string
    try {
      transpiledCode = transpiler.transformSync(input.js, 'js')
    }
    catch (error) {
      yield {
        type: 'result',
        data: null,
        error: error instanceof Error ? error.message : String(error),
      }
      return
    }

    const importMap = config.options.importMap ?? {}
    const importMapString = Object.keys(importMap).length > 0
      ? `<script type="importmap">${JSON.stringify({ imports: importMap })}</script>`
      : ''

    const htmlContent = `<!DOCTYPE html>
<html ${config.options.rootAttributes}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML Playground</title>
  <style>
    body { margin: 0; padding: 8px; font-family: sans-serif; color: #333 }
    ${input.css}
  </style>
  ${importMapString}
  ${config.options.additionalHeadChildren}
</head>
<body>
  ${input.html}
  <script type="module">
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      };
    };

    const stringify = (arg) => {
      try {
        if (arg instanceof Error) return arg; // Pass through
        if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg, getCircularReplacer(), 2);
        return String(arg);
      } catch (e) {
        return '[Unserializable object: ' + e.message + ']';
      }
    };

    const formatTable = (data) => {
      if (!data || typeof data !== 'object') return stringify(data);

      const isArrayOfObjects = Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null);
      const isObjectOfObjects = !Array.isArray(data) && Object.values(data).every(item => typeof item === 'object' && item !== null);

      if (!isArrayOfObjects && !isObjectOfObjects) {
          // Fallback for simple objects or arrays
          const headers = ['(index)', 'Value'];
          const rows = Object.entries(data).map(([key, value]) => [key, stringify(value)]);
          return createAsciiTable(headers, rows);
      }

      const allKeys = new Set();
      const dataArray = Array.isArray(data) ? data : Object.values(data);
      dataArray.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
      
      const headers = ['(index)', ...allKeys];
      const rows = (Array.isArray(data) ? data : Object.entries(data)).map((item, index) => {
          const rowData = Array.isArray(data) ? item : item[1];
          const rowIndex = Array.isArray(data) ? String(index) : item[0];
          const row = [rowIndex];
          for (const key of allKeys) {
              row.push(stringify(rowData[key]));
          }
          return row;
      });

      return createAsciiTable(headers, rows);
    };

    const createAsciiTable = (headers, rows) => {
        const colWidths = headers.map(h => h.length);
        rows.forEach(row => {
            row.forEach((cell, i) => {
                const cellStr = String(cell);
                if (cellStr.length > colWidths[i]) {
                    colWidths[i] = cellStr.length;
                }
            });
        });

        const formatRow = (row, widths) => '│ ' + row.map((cell, i) => String(cell).padEnd(widths[i])).join(' │ ') + ' │';
        const separator = '├─' + colWidths.map(w => '─'.repeat(w)).join('─┼─') + '─┤';
        const topBorder = '┌─' + colWidths.map(w => '─'.repeat(w)).join('─┬─') + '─┐';
        const bottomBorder = '└─' + colWidths.map(w => '─'.repeat(w)).join('─┴─') + '─┘';

        let table = topBorder + '\\n';
        table += formatRow(headers, colWidths) + '\\n';
        table += separator + '\\n';
        rows.forEach(row => {
            table += formatRow(row, colWidths) + '\\n';
        });
        table += bottomBorder;
        return table;
    };

    const originalConsole = {};
    const timers = {};
    const counters = {};
    let groupIndent = '';

    const consoleMethods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'clear', 'count', 'countReset', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeLog', 'timeEnd'];

    consoleMethods.forEach(level => {
      if (typeof console[level] === 'function') {
        originalConsole[level] = console[level];
      }
    });

    console.log = (...args) => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [groupIndent + args.map(stringify).join(' ')], level: 'log' }, '*');
      originalConsole.log.apply(console, args);
    };
    console.warn = (...args) => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [groupIndent + args.map(stringify).join(' ')], level: 'warn' }, '*');
      originalConsole.warn.apply(console, args);
    };
    console.error = (...args) => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [groupIndent + args.map(stringify).join(' ')], level: 'error' }, '*');
      originalConsole.error.apply(console, args);
    };
    console.info = (...args) => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [groupIndent + args.map(stringify).join(' ')], level: 'info' }, '*');
      originalConsole.info.apply(console, args);
    };
    console.debug = (...args) => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [groupIndent + args.map(stringify).join(' ')], level: 'debug' }, '*');
      originalConsole.debug.apply(console, args);
    };
    console.table = (data) => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [formatTable(data)], level: 'log' }, '*');
      originalConsole.table.apply(console, [data]);
    };
    console.clear = () => {
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', level: 'clear' }, '*');
      originalConsole.clear.apply(console);
    };
    console.count = (label = 'default') => {
      counters[label] = (counters[label] || 0) + 1;
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [label + ': ' + counters[label]], level: 'log' }, '*');
      originalConsole.count.apply(console, [label]);
    };
    console.countReset = (label = 'default') => {
      counters[label] = 0;
      window.parent.postMessage({ executionId: '${config.id}', key: 'default', value: [label + ': 0'], level: 'log' }, '*');
      originalConsole.countReset.apply(console, [label]);
    };
    console.group = (...label) => {
      if (label.length > 0) {
        console.log(...label);
      }
      groupIndent += '  ';
      originalConsole.group.apply(console, label);
    };
    console.groupCollapsed = (...label) => {
      if (label.length > 0) {
        console.log(...label);
      }
      groupIndent += '  ';
      originalConsole.groupCollapsed.apply(console, label);
    };
    console.groupEnd = () => {
      groupIndent = groupIndent.slice(0, -2);
      originalConsole.groupEnd.apply(console);
    };
    console.time = (label = 'default') => {
      timers[label] = Date.now();
      originalConsole.time.apply(console, [label]);
    };
    console.timeLog = (label = 'default', ...args) => {
      const startTime = timers[label];
      if (startTime) {
        const duration = Date.now() - startTime;
        console.log(label + ': ' + duration + 'ms', ...args);
      } else {
        console.warn('Timer ' + label + ' does not exist.');
      }
      originalConsole.timeLog.apply(console, [label, ...args]);
    };
    console.timeEnd = (label = 'default') => {
      const startTime = timers[label];
      if (startTime) {
        const duration = Date.now() - startTime;
        console.log(label + ': ' + duration + 'ms');
        delete timers[label];
      } else {
        console.warn('Timer ' + label + ' does not exist.');
      }
      originalConsole.timeEnd.apply(console, [label]);
    };

    window.addEventListener('error', (event) => {
      console.error(event.error || event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  </script>

  <script>
    // Proxy fetch requests
    const apiServiceBaseUrl = 'http://localhost:${appConfig.port}'

    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      let originalUrl;

      if (input instanceof Request) {
        originalUrl = new URL(input.url, window.parent.origin);
        // Create a new Request object with the proxied URL but keep all properties of the original request
        const proxiedUrl = apiServiceBaseUrl + '/proxy?url=' + encodeURIComponent(originalUrl.toString());
        const proxiedRequest = new Request(proxiedUrl, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          referrerPolicy: input.referrerPolicy,
          integrity: input.integrity,
          keepalive: input.keepalive,
          signal: input.signal
        });
        return originalFetch(proxiedRequest);
      } else {
        // input is a string URL
        originalUrl = new URL(input, window.parent.origin);
        const proxiedUrl = apiServiceBaseUrl + '/proxy?url=' + encodeURIComponent(originalUrl.toString());
        return originalFetch(proxiedUrl, init);
      }
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const parsedUrl = new URL(url, window.parent.origin);
      const proxiedUrl = apiServiceBaseUrl + '/proxy?url=' + encodeURIComponent(parsedUrl.toString());
      return originalOpen.call(this, method, proxiedUrl, ...rest);
    };
  </script>

  <script type="module">
    ${transpiledCode}
  </script>
</body>
</html>`

    yield {
      type: 'result',
      data: { key: 'default', value: htmlContent },
      error: null,
    }
    console.info(`[code-playground:html] Execution ${config.id} complete`)
  }
  catch (error) {
    yield {
      type: 'result',
      data: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
