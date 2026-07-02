import * as esbuild from 'esbuild';
import * as vm from 'vm';

export class PreviewService {
  async renderComponent(code: string): Promise<string> {
    try {
      const cleanCode = this.cleanCode(code);
      const wrappedCode = this.wrapCode(cleanCode);

      // Use esbuild to bundle the code
      const result = await esbuild.build({
        stdin: {
          contents: wrappedCode,
          loader: 'jsx',
          resolveDir: process.cwd(),
        },
        bundle: true,
        write: false,
        format: 'iife',
        globalName: 'AppComponent',
        target: 'es2020',
        platform: 'browser',
        define: {
          'process.env.NODE_ENV': '"production"',
        },
      });

      const bundledCode = result.outputFiles[0].text;
      const html = this.executeInSandbox(bundledCode);
      return html;
    } catch (error) {
      console.error('Preview render error:', error);
      return this.getErrorHtml((error as Error).message);
    }
  }

  private cleanCode(code: string): string {
    return code
      .replace(/^import\s+.*?from\s+['"].*?['"]\s*;?\s*$/gm, '')
      .replace(/^import\s*\{[^}]*\}\s*from\s+['"].*?['"]\s*;?\s*$/gm, '')
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s+/gm, '')
      .trim();
  }

  private wrapCode(code: string): string {
    return `
      // Mock React for SSR
      const React = {
        createElement: (type, props, ...children) => {
          if (typeof type === 'string') {
            const propsStr = props ? Object.entries(props)
              .filter(([k]) => !k.startsWith('on'))
              .map(([k, v]) => {
                if (k === 'className') return 'class="' + v + '"';
                if (typeof v === 'object') return '';
                return k + '="' + v + '"';
              }).filter(Boolean).join(' ') : '';
            const kids = children.flat().map(c => {
              if (typeof c === 'string' || typeof c === 'number') return String(c);
              if (c && c._html) return c._html;
              return '';
            }).join('');
            return { _html: '<' + type + ' ' + propsStr + '>' + kids + '</' + type + '>' };
          }
          if (typeof type === 'function') {
            try {
              return type({ ...props, children });
            } catch(e) {
              return { _html: '<div style="color:#f87171;padding:10px">Error: ' + e.message + '</div>' };
            }
          }
          return { _html: '' };
        },
        Fragment: ({ children }) => {
          const kids = [].concat(children).flat().map(c => c && c._html ? c._html : String(c || '')).join('');
          return { _html: kids };
        },
        useState: (init) => [init, () => {}],
        useEffect: () => {},
        useRef: (init) => ({ current: init }),
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
      };
      
      // Make React hooks available globally
      const useState = React.useState;
      const useEffect = React.useEffect;
      const useRef = React.useRef;
      const useCallback = React.useCallback;
      const useMemo = React.useMemo;

      // User's component code
      ${code}

      // Export for execution
      if (typeof Component !== 'undefined') {
        window.__COMPONENT__ = Component;
      } else if (typeof App !== 'undefined') {
        window.__COMPONENT__ = App;
      }
    `;
  }

  private executeInSandbox(bundledCode: string): string {
    const sandbox: Record<string, any> = {
      window: {},
      document: { createElement: () => ({}) },
      console,
    };

    try {
      const script = new vm.Script(bundledCode, { filename: 'component.js' });
      const context = vm.createContext(sandbox);
      script.runInContext(context);

      const Component = sandbox.window.__COMPONENT__;
      if (!Component) {
        return this.getErrorHtml('No Component or App function found');
      }

      const element = Component({});
      const html = element._html || '';

      return this.wrapInFullHtml(html);
    } catch (error) {
      return this.getErrorHtml((error as Error).message);
    }
  }

  private wrapInFullHtml(content: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; min-height: 100vh; font-family: system-ui, sans-serif; }
    #root { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .glass { background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 32px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .flex { display: flex; } .items-center { align-items: center; } .gap-4 { gap: 16px; }
    .mb-6 { margin-bottom: 24px; } .text-white { color: white; } .text-gray { color: #9ca3af; }
    .text-xl { font-size: 20px; } .text-sm { font-size: 14px; } .font-bold { font-weight: bold; }
    .rounded-full { border-radius: 50%; } .bg-gradient { background: linear-gradient(135deg, #f97316, #ec4899); }
    .p-4 { padding: 16px; } .rounded-xl { border-radius: 12px; } .bg-white5 { background: rgba(255,255,255,0.05); }
    .text-center { text-align: center; } .text-2xl { font-size: 28px; } .text-orange { color: #f97316; }
    .grid { display: grid; } .grid-2 { grid-template-columns: 1fr 1fr; } .gap-3 { gap: 12px; }
    .w-full { width: 100%; } .py-3 { padding: 12px; } .border-none { border: none; }
    .text-base { font-size: 16px; } .cursor { cursor: pointer; }
    [data-click] { cursor: pointer; user-select: none; }
    [data-click]:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div id="root">${content}</div>
  <script>
    let count = 0;
    document.querySelectorAll('[data-click]').forEach(el => {
      el.addEventListener('click', () => {
        count++;
        const span = el.querySelector('span');
        if (span) span.textContent = count;
      });
    });
  <\/script>
</body>
</html>`;
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; }
    .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 24px; max-width: 400px; color: #f87171; }
    .error h3 { margin-bottom: 8px; }
    .error pre { font-size: 12px; opacity: 0.8; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="error">
    <h3>渲染错误</h3>
    <pre>${message}</pre>
  </div>
</body>
</html>`;
  }
}
