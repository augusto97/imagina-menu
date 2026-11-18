// Compatibilidad con el botón móvil de un tema. Uso:
//   wp eval-file tests/e2e/theme-setup.php astra   (activa el tema, asigna un menú y usa su selector)
//   node tests/e2e/themes.cjs astra "<selector que imprimió theme-setup>"
const { chromium, devices } = require('playwright');
const theme = process.argv[2], sel = process.argv[3];
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({...devices['Pixel 7'], deviceScaleFactor: 1})).newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(String(e).slice(0,120)));
  await p.goto(( process.env.IMM_URL || 'http://localhost:8890' ) + '/', {waitUntil:'networkidle'});
  const cands = await p.$$eval(sel, els => els.map(e => { const r = e.getBoundingClientRect(); return { vis: r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden', tag: e.tagName, cls: e.className?.toString().slice(0,60) }; }));
  const target = p.locator(sel).filter({ visible: true }).first();
  let open = false, cls = 0;
  if (await target.count()) {
    await target.click({ timeout: 5000 }).catch(e => errs.push('click: ' + String(e).slice(0, 80)));
    await p.waitForTimeout(600);
    open = await p.evaluate(() => document.getElementById('imm-drawer')?.open || document.getElementById('imm-drawer')?.matches(':popover-open'));
  }
  await p.screenshot({ path: `${__dirname}/results/theme-${theme}.png` });
  console.log(JSON.stringify({ theme, matches: cands.length, visible: cands.filter(c=>c.vis).length, open, errs }));
  // Toggles candidatos visibles del tema (para corregir selectores)
  if (!open) console.log(JSON.stringify(await p.$$eval('button, a', els => els.filter(e => { const r = e.getBoundingClientRect(); const t=(e.className||'')+' '+(e.getAttribute('aria-label')||''); return r.width>0 && r.top < 120 && /menu|toggle|nav|burger/i.test(t); }).map(e => e.tagName + '.' + String(e.className).replace(/\s+/g,'.') + ' [' + (e.getAttribute('aria-label')||'') + ']').slice(0,6))));
  await b.close();
})();
