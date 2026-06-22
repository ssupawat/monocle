import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FILE = pathToFileURL(path.resolve('./index.html')).href;

const results = [];
function check(name, cond, detail=''){
  results.push({name, ok:!!cond, detail});
  console.log(`${cond?'✓':'✗'} ${name}${cond?'':`  — ${detail}`}`);
}

const browser = await chromium.launch({ channel:'chrome' });
try {
  const page = await browser.newPage({ viewport:{width:1280,height:800} });
  page.on('console', m => { if(m.type()==='error') console.log('  [console.error]', m.text()); });
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  await page.goto(FILE);
  await page.waitForTimeout(300);

  // ---- helpers ----------------------------------------------------------
  const blockRect = async (label) => {
    const el = await page.evaluateHandle((lbl) => {
      const inputs = [...document.querySelectorAll('.block__input')];
      return inputs.find(i => i.value.trim() === lbl)?.closest('.block') || null;
    }, label);
    const isNull = await el.evaluate(node => node === null);
    if (isNull) return null;
    return el.asElement();
  };

  // lasso-select blocks by label: draws a box around them
  const lassoSelect = async (labels) => {
    const rects = await page.evaluate((lbls) => {
      const canvas = document.getElementById('canvas');
      const cr = canvas.getBoundingClientRect();
      return lbls.map(lbl => {
        const inp = [...document.querySelectorAll('.block__input')].find(i => i.value.trim() === lbl);
        const el = inp?.closest('.block');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height };
      });
    }, labels);
    if (rects.some(r => !r)) throw new Error('block not found for lasso');
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    rects.forEach(r => { x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h); });
    const pad = 10; x1 -= pad; y1 -= pad; x2 += pad; y2 += pad;
    const canvasWrap = await page.locator('#canvasWrap');
    const wrapBox = await canvasWrap.boundingBox();
    const ox = wrapBox.x, oy = wrapBox.y;
    // draw lasso
    await page.mouse.move(ox + x1, oy + y1);
    await page.mouse.down();
    await page.mouse.move(ox + x2, oy + y2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  };

  // click a block to conclude (after lasso) — click the block header, not the input
  const concludeTo = async (label) => {
    const el = await blockRect(label);
    const header = await el.$('.block__head');
    const box = await header.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
  };

  // ---- TEST 1: boot / Modus Ponens -------------------------------------
  console.log('\n=== Test 1: Modus Ponens example ===');
  const blockCount = await page.locator('.block').count();
  check('3 blocks present', blockCount === 3, `got ${blockCount}`);

  const verdict = await page.locator('#verdictBody').innerText();
  check('verdict is Valid', /Valid/.test(verdict) && !/Invalid/.test(verdict), verdict.replace(/\s+/g,' ').trim());

  // ---- TEST 2: halo wraps premises only --------------------------------
  console.log('\n=== Test 2: halo around premise cluster ===');
  const halo = await page.locator('svg rect.halo').count();
  check('exactly one halo rect', halo === 1, `got ${halo}`);

  if (halo === 1) {
    const data = await page.evaluate(() => {
      const h = document.querySelector('svg rect.halo');
      const hb = h.getBoundingClientRect();
      const ids = [...document.querySelectorAll('.block')].map(el=>{
        const r = el.getBoundingClientRect();
        return { label: el.querySelector('.block__input').value,
                 inside: r.left>=hb.left-1 && r.right<=hb.right+1 && r.top>=hb.top-1 && r.bottom<=hb.bottom+1 };
      });
      return { halo:{x:hb.x,y:hb.y,w:hb.width,h:hb.height}, ids };
    });
    check('halo encloses P1 "p"',     data.ids.some(b=>b.label==='p'     && b.inside));
    check('halo encloses P2 "p → q"', data.ids.some(b=>b.label==='p → q' && b.inside));
    check('halo excludes C "q"',      data.ids.some(b=>b.label==='q'     && !b.inside));
  }

  // ---- TEST 3: ⊨ arrow leaves the halo edge, not P2's center ------------
  console.log('\n=== Test 3: ⊨ arrow origin on halo edge ===');
  const arrow = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('svg > path')];
    // entails path has the arrow marker
    const entails = paths.find(p => p.getAttribute('marker-end'));
    if(!entails) return null;
    const d = entails.getAttribute('d');           // "Mx,y Lx2,y2"
    const m = d.match(/M([\d.]+),([\d.]+)\s+L([\d.]+),([\d.]+)/);
    if(!m) return null;
    const [_, x1,y1,x2,y2] = m.map(Number);
    return {x1,y1,x2,y2};
  });
  check('⊨ arrow path found', arrow!==null);
  if (arrow) {
    // read halo in the SAME coordinate space as the path `d` (SVG user units = canvas-local)
    const halo = await page.evaluate(() => {
      const h = document.querySelector('svg rect.halo');
      if(!h) return null;
      return { x:+h.getAttribute('x'), y:+h.getAttribute('y'),
               w:+h.getAttribute('width'), h:+h.getAttribute('height') };
    });
    check('halo readable in svg coords', !!halo);
    if (halo) {
      const onHaloEdge =
        (Math.abs(arrow.x1 - halo.x) < 5 || Math.abs(arrow.x1 - (halo.x+halo.w)) < 5 ||
         Math.abs(arrow.y1 - halo.y) < 5 || Math.abs(arrow.y1 - (halo.y+halo.h)) < 5) &&
        arrow.x1 >= halo.x-5 && arrow.x1 <= halo.x+halo.w+5 &&
        arrow.y1 >= halo.y-5 && arrow.y1 <= halo.y+halo.h+5;
      check('arrow origin on halo edge', onHaloEdge,
            `origin=(${arrow.x1.toFixed(0)},${arrow.y1.toFixed(0)}) halo={x:${halo.x.toFixed(0)},y:${halo.y.toFixed(0)} ${halo.w.toFixed(0)}x${halo.h.toFixed(0)}}`);
    }
    const p2 = await blockRect('p → q'); const p2b = await p2.boundingBox();
    // convert p2 viewport center to canvas-local by subtracting canvas offset
    const canvasBox = await page.locator('#canvas').boundingBox();
    const p2cx = p2b.x + p2b.width/2 - canvasBox.x, p2cy = p2b.y + p2b.height/2 - canvasBox.y;
    const distFromP2 = Math.hypot(arrow.x1-p2cx, arrow.y1-p2cy);
    check('arrow origin NOT at P2 center', distFromP2 > 20, `dist=${distFromP2.toFixed(0)}px`);
  }

  // ---- TEST 4: rewire to ¬q → Invalid (counterexample) ----------------
  console.log('\n=== Test 4: thought-experiment rewire ===');
  // simpler: select the entails visible path via its hit sibling, then Del
  const entailsHit = await page.evaluate(() => {
    // hit path has no marker; find the hit that pairs with the marker'd visible path
    const visible = [...document.querySelectorAll('svg > path')].find(p=>p.getAttribute('marker-end'));
    if(!visible) return null;
    const d = visible.getAttribute('d');
    const hit = [...document.querySelectorAll('svg > path.hit')].find(p=>p.getAttribute('d')===d);
    return hit ? d : null;
  });
  check('found entails hit path', !!entailsHit);
  if (entailsHit) {
    await page.evaluate((d)=>{ [...document.querySelectorAll('svg > path.hit')].find(p=>p.getAttribute('d')===d)?.dispatchEvent(new MouseEvent('click',{bubbles:true})) }, entailsHit);
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    const stillThere = await page.locator('svg > path[marker-end]').count();
    check('⊨ wire deleted', stillThere === 0, `remaining=${stillThere}`);
  }

  // add a ¬q block
  await page.click('#addBtn');
  await page.waitForTimeout(150);
  const inputs = page.locator('.block__input');
  const lastInput = inputs.nth(await inputs.count()-1);
  await lastInput.fill('\u00ACq');
  await page.waitForTimeout(200);

  // lasso-select p and p→q, then click ¬q to conclude
  await lassoSelect(['p', 'p → q']);
  await concludeTo('\u00ACq');
  await page.waitForTimeout(300);

  const verdict2 = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('rewired verdict is Invalid', /Invalid/.test(verdict2), verdict2);
  check('counterexample p=T,q=T shown', /p\s*=\s*T/i.test(verdict2) && /q\s*=\s*T/i.test(verdict2),
        `expected the sole counterexample p=T,q=T (premises (p→q)∧p true, ¬q false). got: ${verdict2}`);

  // ---- TEST 5: lone premise (no ∧) → no halo, arrow from block ---------
  console.log('\n=== Test 5: single premise, no halo ===');
  await page.click('#clearBtn');
  await page.waitForTimeout(150);
  await page.click('#addBtn'); await page.waitForTimeout(100);
  await page.locator('.block__input').last().fill('p');
  await page.waitForTimeout(100);
  await page.click('#addBtn'); await page.waitForTimeout(100);
  await page.locator('.block__input').last().fill('q');
  await page.waitForTimeout(150);
  // drag the q block away so it doesn't overlap p (fresh blocks spawn at center)
  await page.evaluate(() => {
    const blocks=[...document.querySelectorAll('.block')];
    if(blocks.length>=2){
      // move via state by dispatching a synthetic drag is fiddly; instead set position through the app
    }
  });
  // simpler: move q by simulating a drag with mouse
  const qEl = await blockRect('q');
  const qbox = await qEl.boundingBox();
  await page.mouse.move(qbox.x+8, qbox.y+8);
  await page.mouse.down();
  await page.mouse.move(qbox.x+260, qbox.y+120, {steps:8});
  await page.mouse.up();
  await page.waitForTimeout(120);
  // ⊨ from p to q: lasso-select p, then click q
  await lassoSelect(['p']);
  await concludeTo('q');
  await page.waitForTimeout(200);
  const haloCount = await page.locator('svg rect.halo').count();
  check('no halo for single premise', haloCount === 0, `got ${haloCount}`);
  const arrowFromBlock = await page.evaluate(() => {
    const visible=[...document.querySelectorAll('svg > path')].find(p=>p.getAttribute('marker-end'));
    if(!visible) return null;
    return visible.getAttribute('d');
  });
  // origin should match p block center (convert viewport→canvas-local)
  const canvasBox = await page.locator('#canvas').boundingBox();
  const pb = await (await blockRect('p')).boundingBox();
  const m = arrowFromBlock.match(/M([\d.]+),([\d.]+)/);
  const ax=parseFloat(m[1]), ay=parseFloat(m[2]);
  const cx=pb.x+pb.width/2 - canvasBox.x, cy=pb.y+pb.height/2 - canvasBox.y;
  check('single-premise arrow from block center', Math.hypot(ax-cx,ay-cy)<25, `arrow=(${ax.toFixed(0)},${ay.toFixed(0)}) center=(${cx.toFixed(0)},${cy.toFixed(0)})`);

  // ---- TEST 6: multi-step chain (Q1: derived block reused as premise) -----
  console.log('\n=== Test 6: multi-step chain ===');
  await page.click('#clearBtn'); await page.waitForTimeout(150);

  // build: P1=A, P2=A→B, {P1,P2}⊨D1=B ; then {D1,P3=B→C}⊨D2=C
  async function addFill(lbl){ await page.click('#addBtn'); await page.waitForTimeout(100); await page.locator('.block__input').last().fill(lbl); await page.waitForTimeout(120); }

  await addFill('A');           // P1
  await addFill('A → B');       // P2
  await addFill('B');           // D1 target
  await addFill('B → C');       // P3
  await addFill('C');           // D2 target

  // space blocks out deterministically via the app's test hook
  const layout=[['A',80,80],['A → B',80,260],['B',420,170],['B → C',760,80],['C',760,400]];
  for(const [l,x,y] of layout){ await page.evaluate(([l,x,y])=>window.__argBuilder.moveBlock(l,x,y),[l,x,y]); }
  await page.waitForTimeout(120);
  // Step 1: lasso A + A→B, conclude B
  await lassoSelect(['A', 'A → B']);
  await concludeTo('B');
  await page.waitForTimeout(150);

  // Step 2: lasso B + B→C, conclude C
  await lassoSelect(['B', 'B → C']);
  await concludeTo('C');
  await page.waitForTimeout(200);

  const verdict6 = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('two steps present', (verdict6.match(/step\s+\d+/gi)||[]).length===2, verdict6);
  check('Step 1 valid (A ∧ (A→B) ⊨ B)', /step 1[\s\S]*?valid/i.test(verdict6) && !/step 1[\s\S]*?invalid/i.test(verdict6), verdict6);
  check('Step 2 valid (B ∧ (B→C) ⊨ C)', /step 2[\s\S]*?valid/i.test(verdict6) && !/step 2[\s\S]*?invalid/i.test(verdict6), verdict6);

  // derived block B should be labeled “Derived · Step 1”
  const bRole = await page.evaluate(()=>{
    const inp=[...document.querySelectorAll('.block__input')].find(i=>i.value.trim()==='B');
    return inp?.closest('.block')?.querySelector('.block__role')?.textContent || null;
  });
  check('B labeled Derived · Step 1', /Derived.*Step 1/.test(bRole||''), bRole);

  // now corrupt step 2: change C to ¬C → should be Invalid (counterexample)
  const cInp = page.locator('.block__input').filter({hasText:''}).elementHandles ? null : null;
  const cEl = await blockRect('C');
  await (await cEl.$('.block__input')).fill('¬C');
  await page.waitForTimeout(200);
  const verdict6b = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('Step 2 invalid when target=¬C', /step 2[\s\S]*?invalid/i.test(verdict6b), verdict6b);

  // ---- TEST 7: Derived block shows "why invalid" (counterexample on the block) ----
  console.log('\n=== Test 7: block-level “why invalid” ===');
  // state: Step 2 target is ¬C, invalid with counterexample B=T,C=T
  const whyC = await page.evaluate(()=>{
    const inp=[...document.querySelectorAll('.block__input')].find(i=>i.value.trim()==='¬C');
    const el=inp?.closest('.block');
    return { why: el?.querySelector('.block__why')?.innerText?.replace(/\s+/g,' ').trim() || null,
             isBad: !!el?.querySelector('.block__why--bad') };
  });
  check('¬C block has .block__why--bad', whyC.isBad, JSON.stringify(whyC));
  check('¬C block lists counterexample B=T, C=T', /invalid at/i.test(whyC.why||'') && /B=T/i.test(whyC.why) && /C=T/i.test(whyC.why), JSON.stringify(whyC));

  // Valid derived block (B) should show ✓ valid, NOT the bad class
  const whyB = await page.evaluate(()=>{
    const inp=[...document.querySelectorAll('.block__input')].find(i=>i.value.trim()==='B');
    const el=inp?.closest('.block');
    return { why: el?.querySelector('.block__why')?.innerText?.trim() || '',
             isBad: !!el?.querySelector('.block__why--bad') };
  });
  check('B block shows valid (not invalid)', /valid/i.test(whyB.why) && !whyB.isBad, JSON.stringify(whyB));

  // ---- TEST 8: Derived block truth-table = argument table (6 cols for MP) ----
  console.log('\n=== Test 8: Derived block shows argument table ===');
  // reset to the Modus Ponens example in-place (clears persisted state too; reload would re-flush via beforeunload)
  await page.evaluate(()=>window.__argBuilder.reset()); await page.waitForTimeout(300);
  // expand the conclusion block q
  const qEl8 = await blockRect('q');
  await (await qEl8.$('[data-act="table"]')).click();
  await page.waitForTimeout(150);

  const tbl = await page.evaluate(()=>{
    const inp=[...document.querySelectorAll('.block__input')].find(i=>i.value.trim()==='q');
    const el=inp?.closest('.block');
    const t=el?.querySelector('table.tt'); if(!t) return null;
    const headers=[...t.querySelectorAll('thead th')].map(h=>h.textContent.trim());
    const rows=[...t.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].map(d=>d.textContent.trim()));
    return {headers, rows};
  });
  check('argument table present', !!tbl);
  if(tbl){
    // expected headers: premise(p), premise(p→q), conclusion(q), conditional(φ)
    check('4 columns (2 prem + concl + φ)', tbl.headers.length===4, JSON.stringify(tbl.headers));
    check('last header is φ', tbl.headers[tbl.headers.length-1]==='φ', JSON.stringify(tbl.headers));
    check('4 rows (2 vars → 2²=4)', tbl.rows.length===4, JSON.stringify(tbl.rows.length));
    // φ column must be all T → tautology → valid
    const phiCol = tbl.rows.map(r=>r[r.length-1].replace(/\s*⚠$/,''));
    check('φ column all T (tautology)', phiCol.every(x=>x==='T'), JSON.stringify(phiCol));
    check('verdict badge says tautology/valid', /tautology|valid/i.test(
      await page.evaluate(()=>{ const i=[...document.querySelectorAll('.block__input')].find(x=>x.value.trim()==='q'); const el=i?.closest('.block'); return el?.querySelector('.block__truth .badge')?.innerText || ''; })
    ));
  }

  // Invalid case: change conclusion to ¬q → φ column must contain an F
  await (await (await blockRect('q')).$('.block__input')).fill('¬q');
  await page.waitForTimeout(200);
  const tbl2 = await page.evaluate(()=>{
    const t=document.querySelector('.block__truth table.tt');
    return [...t.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].slice(-1)[0].textContent.trim());
  });
  check('invalid case: φ column has an F', tbl2.some(x=>x.startsWith('F')), JSON.stringify(tbl2));

  // ---- TEST 9: P1-1 chain propagation (invalid upstream flags downstream) ----
  console.log('\n=== Test 9: chain validity propagation ===');
  await page.evaluate(()=>window.__argBuilder.reset()); await page.waitForTimeout(120);
  await page.click('#clearBtn'); await page.waitForTimeout(150);  // truly empty canvas
  // Step1 (invalid): p ⊨ q   → counterexample p=T,q=F
  // Step2 (valid alone, but depends on invalid Step1): {q, q→r} ⊨ r
  async function add9(lbl){ await page.click('#addBtn'); await page.waitForTimeout(80); await page.locator('.block__input').last().fill(lbl); await page.waitForTimeout(100); }
  await add9('p'); await add9('q'); await add9('q → r'); await add9('r');
  // space them out via the test hook so clicks don't collide
  const lay9=[['p',80,80],['q',420,80],['q → r',420,260],['r',760,260]];
  for(const [l,x,y] of lay9){ await page.evaluate(([l,x,y])=>window.__argBuilder.moveBlock(l,x,y),[l,x,y]); }
  await page.waitForTimeout(120);
  // Step1: p ⊨ q (lasso-select p, click q)
  await lassoSelect(['p']);
  await concludeTo('q');
  await page.waitForTimeout(150);
  // Step2: lasso q + (q→r), conclude r
  await lassoSelect(['q', 'q → r']);
  await concludeTo('r'); await page.waitForTimeout(200);

  const verdict9 = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('branch verdict flags invalid', /branch 1[\s\S]*?invalid/i.test(verdict9), verdict9);
  check('Step 1 itself invalid', /step 1[\s\S]*?invalid/i.test(verdict9), verdict9);
  // Step 2's derived block r should show the ⚠ depends warning (its own step is valid but upstream Step1 isn't)
  const step2why = await page.evaluate(()=>{
    const i=[...document.querySelectorAll('.block__input')].find(x=>x.value.trim()==='r');
    return i?.closest('.block')?.querySelector('.block__why')?.innerText?.replace(/\s+/g,' ').trim() || null;
  });
  check('downstream block r shows ⚠ depends on invalid Step 1', /depends on invalid step 1/i.test(step2why||''), step2why);

  // ---- TEST 10: P1-1 cycle guard (mutual-recursion must not stack-overflow) ----
  console.log('\n=== Test 10: chain cycle guard ===');
  await page.click('#clearBtn'); await page.waitForTimeout(150);
  // blocks: A, B. Step1: A ⊨ B. Step2: B ⊨ A.  Each step's premise is the other step's conclusion → cycle.
  await page.click('#addBtn'); await page.waitForTimeout(80); await page.locator('.block__input').last().fill('A'); await page.waitForTimeout(80);
  await page.click('#addBtn'); await page.waitForTimeout(80); await page.locator('.block__input').last().fill('B'); await page.waitForTimeout(80);
  for(const [l,x,y] of [['A',80,80],['B',420,80]]){ await page.evaluate(([l,x,y])=>window.__argBuilder.moveBlock(l,x,y),[l,x,y]); }
  await page.waitForTimeout(100);
  // Step1: A ⊨ B (lasso-select A, click B)
  await lassoSelect(['A']);
  await concludeTo('B');
  await page.waitForTimeout(150);
  // Step2: B ⊨ A (lasso-select B, click A)
  await lassoSelect(['B']);
  await concludeTo('A'); await page.waitForTimeout(300);
  // If the cycle guard works, renderVerdict completes without throwing and we get a verdict string
  const cyclic = await page.evaluate(()=>{ try{ return document.querySelector('#verdictBody').innerText.replace(/\s+/g,' ').trim(); }catch(e){ return 'THREW: '+e.message; } });
  check('no stack overflow on cyclic steps', !/^THREW/.test(cyclic), cyclic.slice(0,120));
  check('verdict panel rendered both steps', /step \d/i.test(cyclic), cyclic.slice(0,120));

  // ---- TEST 11: P1-2 pattern detection tags (merged from variant C) ----
  console.log('\n=== Test 11: pattern detection ===');
  await page.evaluate(()=>window.__argBuilder.reset()); await page.waitForTimeout(200);
  // boot = Modus Ponens → should be tagged
  const mpTag = await page.evaluate(()=>document.querySelector('.pattern-tag')?.textContent || '');
  check('MP tagged on boot', /Modus Ponens/.test(mpTag), mpTag);

  // build Affirming the Consequent by hand: {p→q, q} ⊨ p
  await page.click('#clearBtn'); await page.waitForTimeout(100);
  for (const l of ['p → q','q','p']){ await page.click('#addBtn'); await page.waitForTimeout(80); await page.locator('.block__input').last().fill(l); await page.waitForTimeout(80); }
  for(const [l,x,y] of [['p → q',80,80],['q',420,80],['p',760,260]]){ await page.evaluate(([l,x,y])=>window.__argBuilder.moveBlock(l,x,y),[l,x,y]); }
  await page.waitForTimeout(100);
  // lasso-select p→q and q, then conclude p
  await lassoSelect(['p → q', 'q']);
  await concludeTo('p'); await page.waitForTimeout(200);
  const tags = await page.evaluate(()=>[...document.querySelectorAll('.pattern-tag')].map(t=>t.textContent||''));
  check('Affirming the Consequent tagged as fallacy', tags.some(t=>/Affirming the Consequent.*fallacy/i.test(t)), tags.join(' | '));

  // ---- TEST 12: loadExample fires on fresh storage (Modus Ponens default) ----
  console.log('\n=== Test 12: loadExample default ===');
  await page.evaluate(()=>{ localStorage.removeItem('argument-builder:v1'); });
  await page.evaluate(()=>window.__argBuilder.reset());
  await page.waitForTimeout(300);
  const exBlocks = await page.evaluate(()=>[...document.querySelectorAll('.block__input')].map(i=>i.value.trim()));
  check('example loads 3 blocks', exBlocks.length===3, JSON.stringify(exBlocks));
  check('example has p', exBlocks.includes('p'));
  check('example has p → q', exBlocks.includes('p → q'));
  check('example has q (conclusion)', exBlocks.includes('q'));
  const exWires = await page.evaluate(()=>window.__argBuilder.state.wires.map(w=>w.type));
  check('example has 2 entails wires', exWires.length===2 && exWires.every(t=>t==='entails'), JSON.stringify(exWires));
  const exVerdict = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('example verdict valid', /valid/i.test(exVerdict) && !/invalid/i.test(exVerdict), exVerdict.slice(0,80));

  // ---- TEST 13: hint shows on first visit, hides on dismiss (computed display) ----
  console.log('\n=== Test 13: first-visit hint dismiss ===');
  await page.evaluate(()=>{ localStorage.removeItem('monocle:hintSeen'); });
  await page.reload(); await page.waitForTimeout(400);
  const hintShown = await page.evaluate(()=>getComputedStyle(document.getElementById('hint')).display);
  check('hint visible on first visit', hintShown!=='none', `display=${hintShown}`);
  await page.click('#hintClose'); await page.waitForTimeout(200);
  const hintAfter = await page.evaluate(()=>getComputedStyle(document.getElementById('hint')).display);
  check('hint hidden after dismiss (display=none)', hintAfter==='none', `display=${hintAfter}`);
  await page.reload(); await page.waitForTimeout(300);
  const hintReload = await page.evaluate(()=>getComputedStyle(document.getElementById('hint')).display);
  check('hint stays hidden on reload', hintReload==='none', `display=${hintReload}`);

  // ---- TEST 14: premises panel ----
  console.log('\n=== Test 14: premises panel ===');
  await page.evaluate(()=>window.__argBuilder.reset()); await page.waitForTimeout(300);
  const seeded = await page.evaluate(()=>state.premises.map(p=>({s:p.symbol,d:p.description})));
  check('example seeds 2 premises', seeded.length===2, JSON.stringify(seeded));
  check('p has description', seeded.find(p=>p.s==='p' && p.d.includes('raining'))!=null, JSON.stringify(seeded));
  // open panel
  await page.click('#premFab'); await page.waitForTimeout(150);
  const panelOpen = await page.evaluate(()=>!document.getElementById('premPanel').hidden);
  check('premises panel opens on fab click', panelOpen===true);
  // add a premise
  await page.click('#premAdd'); await page.waitForTimeout(100);
  const afterAdd = await page.evaluate(()=>state.premises.length);
  check('add premise grows list', afterAdd===3, `len=${afterAdd}`);
  // type into the new row
  const lastSym = await page.locator('.premise-row__sym').last();
  await lastSym.fill('r'); await page.waitForTimeout(100);
  const symSaved = await page.evaluate(()=>state.premises[2].symbol);
  check('symbol input persists to state', symSaved==='r', `got=${symSaved}`);
  // custom autocomplete: focus a block input and clear it to see all premise symbols
  const blockInput = page.locator('.block__input').first();
  await blockInput.click(); await page.waitForTimeout(150);
  await blockInput.fill(''); await page.waitForTimeout(150);
  const acItems = await page.evaluate(()=>{ const ac=document.querySelector('.ac'); if(!ac||ac.hidden) return []; return [...ac.querySelectorAll('.ac__sym')].map(s=>s.textContent.trim()); });
  check('autocomplete shows r (from block input)', acItems.includes('r'), JSON.stringify(acItems));
  // premise field should exclude its own symbol
  await page.locator('.premise-row__sym').last().click(); await page.waitForTimeout(150);
  const acSelf = await page.evaluate(()=>{ const ac=document.querySelector('.ac'); if(!ac||ac.hidden) return []; return [...ac.querySelectorAll('.ac__sym')].map(s=>s.textContent.trim()); });
  check('premise field excludes its own symbol r', !acSelf.includes('r'), JSON.stringify(acSelf));
  // delete a premise
  await page.locator('.premise-row__del').first().click(); await page.waitForTimeout(100);
  const afterDel = await page.evaluate(()=>state.premises.length);
  check('delete removes premise', afterDel===2, `len=${afterDel}`);

  // ---- TEST 15: examples dropdown ----
  console.log('\n=== Test 15: examples dropdown ===');
  // open menu
  await page.click('#examplesBtn'); await page.waitForTimeout(150);
  const itemCount = await page.locator('.examples-menu__item').count();
  check('menu lists 5 examples', itemCount===5, `count=${itemCount}`);
  // load witch (fallacy)
  await page.locator('.examples-menu__item[data-ex="witch"]').click(); await page.waitForTimeout(300);
  const witchBlocks = await page.evaluate(()=>state.blocks.map(b=>b.label));
  check('witch loads 3 blocks', witchBlocks.length===3 && witchBlocks.includes('p → q') && witchBlocks.includes('q') && witchBlocks.includes('p'), JSON.stringify(witchBlocks));
  const witchPrem = await page.evaluate(()=>state.premises.map(p=>p.description));
  check('witch seeds premises', witchPrem.some(d=>/witch/i.test(d)) && witchPrem.some(d=>/float/i.test(d)), JSON.stringify(witchPrem));
  const witchVerdict = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('witch verdict invalid', /invalid/i.test(witchVerdict), witchVerdict.slice(0,80));
  // load fire (modus tollens, valid)
  await page.click('#examplesBtn'); await page.waitForTimeout(150);
  await page.locator('.examples-menu__item[data-ex="fire"]').click(); await page.waitForTimeout(300);
  const fireBlocks = await page.evaluate(()=>state.blocks.map(b=>b.label));
  check('fire loads ¬q and ¬p', fireBlocks.includes('¬q') && fireBlocks.includes('¬p') && fireBlocks.includes('p → q'), JSON.stringify(fireBlocks));
  const fireVerdict = (await page.locator('#verdictBody').innerText()).replace(/\s+/g,' ').trim();
  check('fire verdict valid', /valid/i.test(fireVerdict) && !/invalid/i.test(fireVerdict), fireVerdict.slice(0,80));
  // menu closes on outside click
  await page.click('#examplesBtn'); await page.waitForTimeout(150);
  const openBefore = await page.evaluate(()=>!document.getElementById('examplesMenu').hidden);
  await page.mouse.click(700,400); await page.waitForTimeout(200);  // outside click on canvas
  const openAfter = await page.evaluate(()=>document.getElementById('examplesMenu').hidden);
  check('menu closes on outside click', openBefore===true && openAfter===true, `before=${openBefore} after=${openAfter}`);

  await page.screenshot({ path:'test-final.png' });
} finally {
  await browser.close();
}

const failed = results.filter(r=>!r.ok);
const pass = results.length - failed.length;
console.log(`\n=== ${pass}/${results.length} passed, ${failed.length} failed ===`);
process.exit(failed.length ? 1 : 0);
