const http = require("http");
const net = require("net");
const crypto = require("crypto");
const fs = require("fs");

function getJson(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port: Number(process.env.CDP_PORT || 9222), path }, (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

function encodeFrame(text) {
  const payload = Buffer.from(text);
  const header = [0x81];
  if (payload.length < 126) {
    header.push(0x80 | payload.length);
  } else if (payload.length < 65536) {
    header.push(0x80 | 126, payload.length >> 8, payload.length & 255);
  } else {
    throw new Error("CDP payload too large");
  }
  const mask = crypto.randomBytes(4);
  const output = Buffer.alloc(header.length + 4 + payload.length);
  Buffer.from(header).copy(output);
  mask.copy(output, header.length);
  for (let index = 0; index < payload.length; index += 1) {
    output[header.length + 4 + index] = payload[index] ^ mask[index % 4];
  }
  return output;
}

function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > buffer.length) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) break;
      const high = buffer.readUInt32BE(offset + 2);
      const low = buffer.readUInt32BE(offset + 6);
      if (high > 0 || low > Number.MAX_SAFE_INTEGER) {
        throw new Error("WebSocket frame is too large for this helper");
      }
      length = low;
      headerLength = 10;
    }
    const masked = Boolean(second & 0x80);
    const maskOffset = offset + headerLength;
    const payloadOffset = maskOffset + (masked ? 4 : 0);
    if (payloadOffset + length > buffer.length) break;
    let payload = buffer.subarray(payloadOffset, payloadOffset + length);
    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }
    if ((first & 0x0f) === 1) frames.push(payload.toString());
    offset = payloadOffset + length;
  }
  return { frames, rest: buffer.subarray(offset) };
}

async function connect(wsUrl, onEvent = () => {}) {
  const url = new URL(wsUrl);
  const key = crypto.randomBytes(16).toString("base64");
  const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
  let nextId = 1;
  let buffer = Buffer.alloc(0);
  let handshaken = false;
  const pending = new Map();

  function send(method, params = {}) {
    const message = { id: nextId, method, params };
    nextId += 1;
    socket.write(encodeFrame(JSON.stringify(message)));
    return new Promise((resolve, reject) => pending.set(message.id, { resolve, reject }));
  }

  await new Promise((resolve, reject) => {
    socket.on("connect", () => {
      socket.write(
        `GET ${url.pathname} HTTP/1.1\r\n` +
          `Host: ${url.host}\r\n` +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Key: ${key}\r\n` +
          "Sec-WebSocket-Version: 13\r\n\r\n",
      );
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!handshaken) {
        const marker = buffer.indexOf("\r\n\r\n");
        if (marker < 0) return;
        const head = buffer.subarray(0, marker).toString();
        if (!head.includes("101")) {
          reject(new Error(head));
          return;
        }
        handshaken = true;
        buffer = buffer.subarray(marker + 4);
        resolve();
      }
      if (handshaken && buffer.length) {
        const decoded = decodeFrames(buffer);
        buffer = decoded.rest;
        for (const frame of decoded.frames) {
          const message = JSON.parse(frame);
          if (message.id && pending.has(message.id)) {
            const { resolve: done, reject: fail } = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) fail(new Error(JSON.stringify(message.error)));
            else done(message);
          } else if (message.method) {
            onEvent(message);
          }
        }
      }
    });
    socket.on("error", reject);
  });

  return { send, close: () => socket.end() };
}

async function inspect({ match, navigate }) {
  const tabs = await getJson("/json/list");
  const target = tabs.find((tab) => tab.url.includes(match));
  if (!target) throw new Error(`No Chrome tab matched ${match}`);
  const client = await connect(target.webSocketDebuggerUrl);
  const capturedEvents = [];
  let eventClient = null;
  if (process.env.CDP_CAPTURE_EVENTS) {
    eventClient = await connect(target.webSocketDebuggerUrl, (message) => {
      if (["Runtime.exceptionThrown", "Runtime.consoleAPICalled", "Log.entryAdded"].includes(message.method)) {
        capturedEvents.push(message);
      }
    });
  }
  let scrapedTables;
  const evalResults = {};
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  if (process.env.CDP_CAPTURE_EVENTS) {
    await eventClient.send("Runtime.enable");
    await eventClient.send("Log.enable");
    await eventClient.send("Page.enable");
  }
  if (navigate) {
    await client.send("Page.navigate", { url: navigate });
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }
  if (process.env.CDP_BEFORE_CLICK_EVAL) {
    const beforeEval = await client.send("Runtime.evaluate", {
      expression: process.env.CDP_BEFORE_CLICK_EVAL,
      returnByValue: true,
      awaitPromise: true,
    });
    evalResults.beforeClick = beforeEval.result.result.value;
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.CDP_AFTER_EVAL_MS || 300)));
  }
  if (process.env.CDP_BEFORE_CLICK_EVAL_FILE) {
    const captureConfig = process.env.CDP_CAPTURE_CONFIG || "{}";
    const beforeExpression = fs.readFileSync(process.env.CDP_BEFORE_CLICK_EVAL_FILE, "utf8").replaceAll("__CDP_CAPTURE_CONFIG__", captureConfig);
    const beforeEval = await client.send("Runtime.evaluate", {
      expression: beforeExpression,
      returnByValue: true,
      awaitPromise: true,
    });
    evalResults.beforeClickFile = beforeEval.result.result.value;
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.CDP_AFTER_EVAL_MS || 300)));
  }
  if (process.env.CDP_CLICK_TEXT) {
    const clickText = JSON.stringify(process.env.CDP_CLICK_TEXT);
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const wanted = ${clickText}.trim().toLowerCase();
        const buttons = Array.from(document.querySelectorAll('button,a,[role="button"]'));
        const target = buttons.find((el) => (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().toLowerCase() === wanted);
        if (!target) return false;
        target.click();
        return true;
      })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.CDP_AFTER_CLICK_MS || 700)));
  }
  if (process.env.CDP_AFTER_CLICK_EVAL) {
    const afterEval = await client.send("Runtime.evaluate", {
      expression: process.env.CDP_AFTER_CLICK_EVAL,
      returnByValue: true,
      awaitPromise: true,
    });
    evalResults.afterClick = afterEval.result.result.value;
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.CDP_AFTER_EVAL_MS || 300)));
  }
  if (process.env.CDP_SCRAPE_TABLE_PAGES) {
    const pageCount = Number(process.env.CDP_SCRAPE_TABLE_PAGES);
    const tableSelector = process.env.CDP_SCRAPE_TABLE_SELECTOR || "table";
    scrapedTables = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const scrapeResult = await client.send("Runtime.evaluate", {
        expression: `(() => Array.from(document.querySelectorAll(${JSON.stringify(tableSelector)})).map((table) => ({
          headers: Array.from(table.querySelectorAll('th')).map((cell) => cell.innerText.trim()).filter(Boolean),
          rows: Array.from(table.querySelectorAll('tbody tr')).map((row) =>
            Array.from(row.querySelectorAll('td')).map((cell) => cell.innerText.trim())
          ).filter((row) => row.some(Boolean))
        })))()`,
        returnByValue: true,
        awaitPromise: true,
      });
      scrapedTables.push(scrapeResult.result.result.value);
      if (pageIndex < pageCount - 1) {
        await client.send("Runtime.evaluate", {
          expression: `(() => {
            const target = Array.from(document.querySelectorAll('button')).find((button) => button.innerText.trim() === 'NEXT >' && !button.disabled);
            if (!target) return false;
            target.click();
            return true;
          })()`,
          returnByValue: true,
          awaitPromise: true,
        });
        await new Promise((resolve) => setTimeout(resolve, Number(process.env.CDP_AFTER_CLICK_MS || 900)));
      }
    }
  }
  const textLimit = Number(process.env.CDP_TEXT_LIMIT || 4000);
  const htmlSelector = process.env.CDP_HTML_SELECTOR;
  const htmlLimit = Number(process.env.CDP_HTML_LIMIT || 6000);
  const expression = `(() => ({
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((el) => el.innerText.trim()).filter(Boolean).slice(0, 40),
    buttons: Array.from(document.querySelectorAll('button')).map((button) => button.innerText || button.getAttribute('aria-label') || button.title).filter(Boolean).slice(0, 80),
    inputs: Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
      tag: el.tagName,
      type: el.type || '',
      placeholder: el.placeholder || '',
      value: el.value || '',
      text: el.innerText || ''
    })).slice(0, 80),
    headers: Array.from(document.querySelectorAll('table')).map((table) => Array.from(table.querySelectorAll('th')).map((th) => th.innerText.trim()).filter(Boolean)).filter((row) => row.length),
    html: ${htmlSelector ? `((document.querySelector(${JSON.stringify(htmlSelector)}) || {}).outerHTML || '').slice(0, ${Number.isFinite(htmlLimit) ? htmlLimit : 6000})` : "undefined"},
    text: document.body.innerText.slice(0, ${Number.isFinite(textLimit) ? textLimit : 4000})
  }))()`;
  const result = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (process.env.CDP_SCREENSHOT_FILE) {
    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
    });
    fs.writeFileSync(process.env.CDP_SCREENSHOT_FILE, Buffer.from(screenshot.result.data, "base64"));
  }
  client.close();
  if (eventClient) eventClient.close();
  const value = result.result.result.value;
  if (Object.keys(evalResults).length) value.evalResults = evalResults;
  if (scrapedTables) value.scrapedTables = scrapedTables;
  if (process.env.CDP_CAPTURE_EVENTS) value.events = capturedEvents.slice(0, 30);
  return value;
}

async function main() {
  const [, , match, navigate] = process.argv;
  if (!match) {
    console.error("Usage: node scripts/cdp_inspect.cjs <url-substring> [navigate-url]");
    process.exit(2);
  }
  const result = await inspect({ match, navigate });
  const output = JSON.stringify(result, null, 2);
  if (process.env.CDP_OUTPUT_FILE) {
    fs.writeFileSync(process.env.CDP_OUTPUT_FILE, `${output}\n`);
  } else {
    console.log(output);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
