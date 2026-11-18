/**
 * Wrapper de `next dev` / `next build` / `next start`.
 *
 * Lê o arquivo .env.local (se existir) antes de iniciar o Node do Next para
 * que variáveis que precisam existir *antes* do processo subir — como
 * NODE_EXTRA_CA_CERTS em redes corporativas com inspeção TLS — sejam
 * respeitadas. Sem .env.local, apenas repassa o comando.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envFile = resolve(root, ".env.local");
const env = { ...process.env };

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    const value = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (!(m[1] in env)) env[m[1]] = value;
  }
}

if (env.NODE_EXTRA_CA_CERTS && !existsSync(env.NODE_EXTRA_CA_CERTS)) {
  console.warn(`[dev] NODE_EXTRA_CA_CERTS aponta para arquivo inexistente: ${env.NODE_EXTRA_CA_CERTS}`);
  delete env.NODE_EXTRA_CA_CERTS;
}

const args = process.argv.slice(2);
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, ...args], { stdio: "inherit", env, cwd: root });
child.on("exit", (code) => process.exit(code ?? 0));
