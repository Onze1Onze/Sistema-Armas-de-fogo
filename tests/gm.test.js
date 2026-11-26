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
  assert.ok(app.includes("player?.metadata?.[METADATA_KEY]"));
});

test("o monitor do mestre não altera o armazenamento dos jogadores", async () => {
  const app = await read("src/app.js");
  const gmBranchStart = app.indexOf("async function setupGMDashboard");
  const gmBranchEnd = app.indexOf("function renderWeaponCards");
  const gmBranch = app.slice(gmBranchStart, gmBranchEnd);
  assert.doesNotMatch(gmBranch, /setMetadata\(/);
  assert.match(app, /setupGMDashboard\(\)/);
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

test("o nome remoto vem dos metadados publicados pelo próprio jogador", async () => {
  const app = await read("src/app.js");
  assert.ok(app.includes('const PLAYER_NAME_KEY = "com.onze1.ficha-onze.weapon-ammo.player-name"'));
  assert.ok(app.includes("await player.getName()"));
  assert.ok(app.includes("await player.setMetadata({ [PLAYER_NAME_KEY]: name })"));
  assert.ok(app.includes("metadata[PLAYER_NAME_KEY]"));
  const status = app.slice(app.indexOf("function playerStatus"), app.indexOf("function renderWeaponCards"));
  assert.equal(status.includes("getName"), false);
});

test("a interface normal reaparece quando o SDK está indisponível ou falha", async () => {
  const app = await read("src/app.js");
  const unavailableStart = app.indexOf("if (!candidate?.isAvailable)");
  const unavailableEnd = app.indexOf("await new Promise", unavailableStart);
  assert.ok(unavailableStart >= 0 && app.slice(unavailableStart, unavailableEnd).includes("showPlayerView()"));
  assert.ok(app.includes('console.warn("SDK do Owlbear indisponível; usando armazenamento local.", error);\n    showPlayerView();'));
});

test("o jogador identificado deixa o estado pendente antes da sincronização", async () => {
  const app = await read("src/app.js");
  const playerStart = app.indexOf("// A confirmed player must leave the pending state");
  const metadataStart = app.indexOf("const metadata = await candidate.player.getMetadata()", playerStart);
  assert.ok(playerStart >= 0 && app.slice(playerStart, metadataStart).includes("showPlayerView()"));
});

test("o mestre mostra apenas participantes PLAYER e escapa IDs de conexão", async () => {
  const app = await read("src/app.js");
  assert.ok(app.includes('filter((player) => player?.role === "PLAYER")'));
  assert.ok(app.includes('data-player-id="${escapeHtml(status.id)}"'));
});


test("o simulador tem fallback quando a abertura do modal falha", async () => {
  const app = await read("src/app.js");
  const start = app.indexOf("async function openSimulator");
  const end = app.indexOf("function releaseOwlbearListeners", start);
  const source = app.slice(start, end);
  assert.match(source, /try \{/);
  assert.match(source, /catch \(error\)/);
  assert.match(source, /window\.location\.assign\(simulatorUrl\)/);
  assert.match(source, /if \(isOpeningSimulator\) return/);
});

test("listeners da party e do jogador são removidos no pagehide", async () => {
  const app = await read("src/app.js");
  assert.match(app, /window\.addEventListener\("pagehide", releaseOwlbearListeners, \{ once: true \}\)/);
  assert.match(app, /gmPartyUnsubscribe = obr\.party\.onChange\(refresh\)/);
  assert.match(app, /playerChangeUnsubscribe = candidate\.player\.onChange/);
  assert.match(app, /unsubscribe\(\)/);
});

test("a leitura inicial da party não sobrescreve um evento mais recente", async () => {
  const app = await read("src/app.js");
  const start = app.indexOf("async function setupGMDashboard");
  const end = app.indexOf("function renderWeaponCards", start);
  const source = app.slice(start, end);
  assert.ok(source.indexOf("obr.party.onChange(refresh)") < source.indexOf("obr.party.getPlayers()"));
  assert.match(source, /if \(partyRevision === initialRevision\) refresh\(players\)/);
});
