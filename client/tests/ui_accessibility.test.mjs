import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Design System, Responsive Tokens, and Accessibility', () => {
  const tokensCssPath = path.resolve(__dirname, '../src/styles/tokens.css');
  const indexCssPath = path.resolve(__dirname, '../src/index.css');

  test('Design tokens CSS file exists and exports required light theme variables', () => {
    assert.ok(fs.existsSync(tokensCssPath), 'tokens.css must exist');
    const content = fs.readFileSync(tokensCssPath, 'utf8');

    const expectedTokens = [
      '--canvas',
      '--canvas-subtle',
      '--canvas-text',
      '--canvas-muted',
      '--surface',
      '--surface-hover',
      '--border-subtle',
      '--border-strong',
      '--brand',
      '--brand-foreground',
      '--status-available-bg',
      '--status-overdue-bg',
      '--status-warning-bg',
      '--status-info-bg',
      '--status-neutral-bg',
      '--font-sans',
      '--font-serif',
      '--font-mono',
    ];

    for (const token of expectedTokens) {
      assert.ok(content.includes(token), `tokens.css must declare ${token}`);
    }
  });

  test('Design tokens CSS defines complete dark mode overrides', () => {
    const content = fs.readFileSync(tokensCssPath, 'utf8');
    assert.ok(content.includes('.dark {'), 'Must have .dark selector block');

    const darkTokens = [
      '--canvas:',
      '--surface:',
      '--border-subtle:',
      '--brand:',
      '--status-available-bg:',
      '--status-overdue-bg:',
      '--status-warning-bg:',
      '--status-info-bg:',
    ];

    for (const token of darkTokens) {
      assert.ok(content.includes(token), `Dark theme must override ${token}`);
    }
  });

  test('Controlled radius hierarchy enforces doppelrand styling', () => {
    const content = fs.readFileSync(tokensCssPath, 'utf8');
    const radii = ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-full'];
    for (const r of radii) {
      assert.ok(content.includes(r), `Must define radius step ${r}`);
    }
  });

  test('Accessibility: Reduced motion media query disables animations and transitions', () => {
    assert.ok(fs.existsSync(indexCssPath), 'index.css must exist');
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');

    assert.ok(
      indexCss.includes('@media (prefers-reduced-motion: reduce)'),
      'Must contain prefers-reduced-motion media query'
    );
    assert.ok(
      indexCss.includes('animation-duration: 0.01ms !important'),
      'Must neutralize animation-duration under reduced motion'
    );
    assert.ok(
      indexCss.includes('transition-duration: 0.01ms !important'),
      'Must neutralize transition-duration under reduced motion'
    );
    assert.ok(
      indexCss.includes('scroll-behavior: auto !important'),
      'Must disable smooth scrolling under reduced motion'
    );
  });

  test('Print stylesheet suppresses interactive headers and sidebars', () => {
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');
    assert.ok(indexCss.includes('@media print'), 'Must contain @media print block');
    assert.ok(indexCss.includes('aside'), 'Must target aside in print media');
    assert.ok(indexCss.includes('header'), 'Must target header in print media');
    assert.ok(indexCss.includes('nav'), 'Must target nav in print media');
    assert.ok(indexCss.includes('display: none !important'), 'Must hide interactive UI elements during printing');
  });
});
