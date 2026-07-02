import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";

const OUT = "data/emareez-import/raw-tables.json";
const ROUTES = [
  ["suppliers", "https://e-mareez.com/pms/dashboard/supplier", 20],
  ["categories", "https://e-mareez.com/pms/dashboard/category", 12],
  ["formulas", "https://e-mareez.com/pms/dashboard/medicineformula", 80],
  ["manufacturers", "https://e-mareez.com/pms/dashboard/manufacturer", 60],
  ["shelves", "https://e-mareez.com/pms/dashboard/shelf", 5],
  ["medicalProducts", "https://e-mareez.com/pms/dashboard/medicines", 80],
  ["nonMedicalProducts", "https://e-mareez.com/pms/dashboard/nonmedicines", 10],
  ["batches", "https://e-mareez.com/pms/dashboard/batch", 10],
  ["returnPolicy", "https://e-mareez.com/pms/dashboard/return-policy", 3],
];

function encodeFrame(data) {
  const payload = Buffer.from(data);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, 0x80 | payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

function createFrameParser(onMessage) {
  let buffer = Buffer.alloc(0);
  return (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const b0 = buffer[0];
      const b1 = buffer[1];
      let length = b1 & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        length = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const masked = Boolean(b1 & 0x80);
      const maskOffset = masked ? 4 : 0;
      if (buffer.length < offset + maskOffset + length) return;
      let payload = buffer.subarray(offset + maskOffset, offset + maskOffset + length);
      if (masked) {
        const mask = buffer.subarray(offset, offset + 4);
        const decoded = Buffer.alloc(payload.length);
        for (let i = 0; i < payload.length; i += 1) decoded[i] = payload[i] ^ mask[i % 4];
        payload = decoded;
      }
      buffer = buffer.subarray(offset + maskOffset + length);
      const opcode = b0 & 0x0f;
      if (opcode === 1) onMessage(payload.toString());
    }
  };
}

async function connect(wsUrl) {
  const url = new URL(wsUrl);
  const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
  let handshakeBuffer = Buffer.alloc(0);
  let id = 1;
  const pending = new Map();

  await new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    socket.once("connect", () => {
      socket.write(
        `GET ${url.pathname} HTTP/1.1\r\n` +
          `Host: ${url.host}\r\n` +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Key: ${key}\r\n` +
          "Sec-WebSocket-Version: 13\r\n\r\n",
      );
    });
    const onHandshake = (chunk) => {
      handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
      const end = handshakeBuffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const header = handshakeBuffer.subarray(0, end).toString();
      if (!header.startsWith("HTTP/1.1 101")) {
        reject(new Error(header.split("\r\n")[0]));
        return;
      }
      const rest = handshakeBuffer.subarray(end + 4);
      socket.off("data", onHandshake);
      const parser = createFrameParser((raw) => {
        const message = JSON.parse(raw);
        if (message.id && pending.has(message.id)) {
          pending.get(message.id)(message);
          pending.delete(message.id);
        }
      });
      socket.on("data", parser);
      if (rest.length) parser(rest);
      resolve();
    };
    socket.on("data", onHandshake);
    socket.on("error", reject);
  });

  return {
    close: () => socket.end(),
    send(method, params = {}) {
      const requestId = id;
      id += 1;
      socket.write(encodeFrame(JSON.stringify({ id: requestId, method, params })));
      return new Promise((resolve) => pending.set(requestId, resolve));
    },
  };
}

async function main() {
  const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
  const target = targets.find((item) => item.type === "page" && item.url.startsWith("https://e-mareez.com/"));
  if (!target) throw new Error("No logged-in E-Mareez Chrome tab found on port 9222.");

  const cdp = await connect(target.webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.text || "Evaluation failed");
    return result.result.result.value;
  };
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");

  const output = { capturedAt: new Date().toISOString(), pages: {} };
  for (const [key, url, maxPages] of ROUTES) {
    console.log(`capturing ${key}`);
    await cdp.send("Page.navigate", { url });
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const page = { url, tables: [], pages: [] };
    const seen = new Set();
    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const snapshot = await evaluate(`(() => {
        const norm = (value) => (value || "").replace(/\\s+/g, " ").trim();
        const tables = [...document.querySelectorAll("table")].map((table) => {
          const headers = [...table.querySelectorAll("thead th")].map((cell) => norm(cell.innerText));
          const rows = [...table.querySelectorAll("tbody tr")].map((row) => [...row.children].map((cell) => norm(cell.innerText))).filter((row) => row.some(Boolean));
          return { headers, rows };
        }).filter((table) => table.headers.length || table.rows.length);
        const bodyText = norm(document.body.innerText).slice(0, 1200);
        return { href: location.href, bodyText, tables };
      })()`);
      const signature = JSON.stringify(snapshot.tables);
      if (seen.has(signature)) break;
      seen.add(signature);
      page.pages.push(snapshot);
      snapshot.tables.forEach((table, tableIndex) => {
        if (!page.tables[tableIndex]) page.tables[tableIndex] = { headers: table.headers, rows: [] };
        page.tables[tableIndex].rows.push(...table.rows);
      });
      const clicked = await evaluate(`(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.innerText.trim() === "NEXT >" || item.innerText.includes("NEXT"));
        if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return false;
        button.click();
        return true;
      })()`);
      if (!clicked) break;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    output.pages[key] = page;
  }
  await fs.mkdir("data/emareez-import", { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
  cdp.close();
  console.log(`wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
