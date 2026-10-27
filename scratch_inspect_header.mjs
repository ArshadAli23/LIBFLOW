import { spawn } from 'child_process';
import http from 'http';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\arsha\\AppData\\Local\\Temp\\edge_inspect_header',
    '--disable-gpu',
    '--no-first-run',
    'http://localhost:5173/'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2000));
  const targets = await getJson('http://127.0.0.1:9222/json');
  const pageTarget = targets.find(t => t.url && t.url.includes('5173')) || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };
  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  await new Promise(r => setTimeout(r, 3000));

  // Navigate to login
  await send('Runtime.evaluate', {
    expression: `
      const signInBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Sign In');
      if (signInBtn) signInBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // Login as Librarian
  await send('Runtime.evaluate', {
    expression: `
      const libBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Librarian');
      if (libBtn) libBtn.click();
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }, 300);
    `
  });
  await new Promise(r => setTimeout(r, 2500));

  // Now inspect header elements
  const headerInfo = await send('Runtime.evaluate', {
    expression: `
      const header = document.querySelector('header');
      ({
        html: header?.innerHTML,
        buttons: Array.from(header?.querySelectorAll('button, div[class*="cursor-pointer"]') || []).map(b => ({
          tag: b.tagName,
          className: b.className,
          text: b.innerText,
          ariaLabel: b.getAttribute('aria-label')
        }))
      })
    `,
    returnByValue: true
  });

  console.log('Header elements on Librarian dashboard:');
  console.log(JSON.stringify(headerInfo.result?.value?.buttons, null, 2));

  // Now click on the profile element
  await send('Runtime.evaluate', {
    expression: `
      const avatar = document.querySelector('header .border-l div.cursor-pointer');
      if (avatar) avatar.click();
    `
  });
  await new Promise(r => setTimeout(r, 600));

  // Now check menu items
  const menuItems = await send('Runtime.evaluate', {
    expression: `
      Array.from(document.querySelectorAll('[role="menu"] button')).map(b => b.innerText)
    `,
    returnByValue: true
  });
  console.log('Menu items after clicking avatar:', menuItems.result?.value);

  ws.close();
  edgeProc.kill();
}

main().catch(console.error);
