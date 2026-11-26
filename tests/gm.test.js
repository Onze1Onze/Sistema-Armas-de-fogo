import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path) => readFile(resolve(process.cwd(), path), "utf8");

test("o painel do mestre possui monitor de jogadores e botão Simulador", async () => {
  const html = await read("index.html");
  assert.match(html, /id="gm-view"/);
  assert.match(html, /id="gm-player-list"/);
  assert.match(html, /id="gm-player-total"/);
  assert.match(html, /id="gm-simulator-button"[^>]*>SIMULADOR</);
});

test("a extensão consulta a party do Owlbear e reage a entrada, saída e mudanças", async () => {
  const app = await read("src/app.js");
  assert.match(app, /candidate\.player\.getRole\(\)/);
  assert.match(app, /obr\.party\.getPlayers\(\)/);
  assert.match(app, /obr\.party\.onChange\(/);
  assert.match(app, /player\.metadata\?\[METADATA_KEY\]/);
});

test("o monitor do mestre não altera o armazenamento dos jogadores", async () => {
  const app = await read("src/app.js");
  const gmBranch = app.slice(app.indexOf('if (currentRole === "GM"'));
  assert.doesNotMatch(gmBranch, /setMetadata\(/);
  assert.match(gmBranch, /setupGMDashboard\(\)/);
});

test("o painel do mestre é quadrado e não usa cantos arredondados", async () => {
  const css = await read("src/styles.css");
  const gmCss = css.slice(css.indexOf("/* GM monitor: additive interface"));
  assert.match(gmCss, /\.gm-simulator-button\s*\{[\s\S]*border-radius:\s*0/);
  assert.match(gmCss, /\.gm-view\s*\{[\s\S]*background:/);
});

test("o simulador usa o mesmo painel de armas em modo local", async () => {
  const app = await read("src/app.js");
  assert.match(app, /mode=simulator/);
  assert.match(app, /if \(isSimulatorMode\)/);
  assert.match(app, /restoreLocalState\(\);/);
});
