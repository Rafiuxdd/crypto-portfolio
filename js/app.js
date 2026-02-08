
const portfolio = [
  { simbolo: "BTC", cantidad: 0.015, precioCompra: 42000, cgId: "bitcoin"  },
  { simbolo: "ETH", cantidad: 0.30,  precioCompra: 2300,  cgId: "ethereum" },
  { simbolo: "SOL", cantidad: 12,    precioCompra: 95,    cgId: "solana"   },
  { simbolo: "ADA", cantidad: 500,   precioCompra: 0.45,  cgId: "cardano"  },
];

const COLORS = {
  BTC: "#f2c94c", // amarillo
  ETH: "#7b61ff", // morado
  SOL: "#2dd4bf", // turquesa
  ADA: "#3b82f6", // azul
};

const preciosActuales = { BTC: 0, ETH: 0, SOL: 0, ADA: 0 };

const UI = {
  canvas: document.getElementById("donutCanvas"),
  totalUsd: document.getElementById("totalUsd"),
  pnlTotal: document.getElementById("pnlTotal"),
  cards: document.getElementById("cards"),
  lastUpdate: document.getElementById("lastUpdate"),
  assetCountCenter: document.getElementById("assetCountCenter"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  btnRefresh: document.getElementById("btnRefresh"),
};

UI.btnRefresh.addEventListener("click", () => actualizarTodo(true));

function money(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function num(n, d=2){
  return Number(n).toLocaleString("en-US", { minimumFractionDigits:d, maximumFractionDigits:d });
}
function nowTime(){
  const d = new Date();
  return d.toLocaleString("es-SV", { hour12: true });
}

function calcularValorActual(portafolio, precios) {
  let total = 0;
  for (const c of portafolio) total += c.cantidad * precios[c.simbolo];
  return total;
}

function calcularPnLTotal(portafolio, precios) {
  let pnl = 0;
  for (const c of portafolio) {
    const p = precios[c.simbolo];
    const valor = c.cantidad * p;
    const costo = c.cantidad * c.precioCompra;
    pnl += (valor - costo);
  }
  return pnl;
}

function buildReporte(portafolio, precios) {
  const rep = [];
  for (const c of portafolio) {
    const p = precios[c.simbolo];
    const valorActual = c.cantidad * p;
    const costo = c.cantidad * c.precioCompra;
    const pnl = valorActual - costo;
    const cambioPct = ((p - c.precioCompra) / c.precioCompra) * 100;

    rep.push({
      simbolo: c.simbolo,
      color: COLORS[c.simbolo],
      cantidad: c.cantidad,
      precioCompra: c.precioCompra,
      precioActual: p,
      valorActual,
      costo,
      pnl,
      cambioPct
    });
  }
  return rep;
}

async function obtenerPrecios() {
  const ids = portfolio.map(x => x.cgId).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo obtener precios");
  const data = await res.json();

  for (const c of portfolio) {
    const usd = data?.[c.cgId]?.usd;
    if (typeof usd === "number") preciosActuales[c.simbolo] = usd;
  }
}

function renderCards(reporte) {
  UI.cards.innerHTML = "";

  for (const r of reporte) {
    const card = document.createElement("article");
    card.className = "card";
    card.style.borderColor = r.color;

    const pnlPos = r.pnl >= 0;
    const pctPos = r.cambioPct >= 0;

    const pnlClass = pnlPos ? "pos" : "neg";
    const pctClass = pctPos ? "pos" : "neg";

    let qtyDecimals = 4;
    if (r.simbolo === "ADA") qtyDecimals = 2;

    card.innerHTML = `
      <div class="cardHead">
        <div class="badge">
          <span class="dot2" style="background:${r.color}"></span>
          ${r.simbolo}
        </div>
        <div class="priceNow">${money(r.precioActual)}</div>
      </div>

      <div class="rows">
        <div class="row"><span>Cantidad</span><b>${num(r.cantidad, qtyDecimals)}</b></div>
        <div class="row"><span>Total USD</span><b class="valueStrong">${money(r.valorActual)}</b></div>
        <div class="row"><span>Costo compra</span><b>${money(r.costo)}</b></div>

        <div class="row">
          <span>PnL</span>
          <b class="chip ${pnlClass}">${money(r.pnl)}</b>
        </div>

        <div class="row">
          <span>Cambio %</span>
          <b class="chip ${pctClass}">${num(r.cambioPct,2)}%</b>
        </div>
      </div>
    `;

    UI.cards.appendChild(card);
  }
}

function drawDonut(reporte) {
  const canvas = UI.canvas;
  const ctx = canvas.getContext("2d");

  const rect = canvas.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height || rect.width);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  const total = reporte.reduce((a, r) => a + r.valorActual, 0);

  const ring = size * 0.09;
  const radius = size * 0.36;
  const gap = (Math.PI / 180) * 2;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = ring;
  ctx.stroke();

  let angle = -Math.PI / 2;

  for (const r of reporte) {
    const frac = total > 0 ? (r.valorActual / total) : 0;
    const seg = frac * (Math.PI * 2);

    const a0 = angle + gap/2;
    const a1 = angle + seg - gap/2;

    if (a1 > a0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = ring;
      ctx.lineCap = "round";
      ctx.stroke();

      const mid = (a0 + a1) / 2;
      const labelRadius = radius + ring * 1.10;
      const tx = cx + Math.cos(mid) * labelRadius;
      const ty = cy + Math.sin(mid) * labelRadius;

      const pct = frac * 100;
      const label = `${r.simbolo} ${pct.toFixed(1)}%`;

      ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "rgba(232,238,246,.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.60)";
      ctx.shadowBlur = 10;
      ctx.fillText(label, tx, ty);
      ctx.shadowBlur = 0;
    }

    angle += seg;
  }
}

function generarAlertas(reporte, callback) {
  const alertas = [];
  for (const r of reporte) {
    const msg = callback(r);
    if (msg) alertas.push(msg);
  }
  return alertas;
}
function callbackAlertas(r) {
  if (r.cambioPct > 10) return `📈 ALERTA: ${r.simbolo} subió ${r.cambioPct.toFixed(2)}%`;
  if (r.cambioPct < -5) return `📉 ALERTA: ${r.simbolo} bajó ${r.cambioPct.toFixed(2)}%`;
  return null;
}

function setStatus(ok, text){
  UI.statusDot.style.background = ok ? "#2ee59d" : "#ff6b6b";
  UI.statusText.textContent = text;
}

async function actualizarTodo(manual=false) {
  try {
    setStatus(true, manual ? "Actualizando…" : "En línea");
    await obtenerPrecios();

    const reporte = buildReporte(portfolio, preciosActuales);
    const total = calcularValorActual(portfolio, preciosActuales);
    const pnl = calcularPnLTotal(portfolio, preciosActuales);

    UI.totalUsd.textContent = money(total);

    UI.pnlTotal.textContent = `PnL: ${money(pnl)}`;
    UI.pnlTotal.className = "pnlBadge " + (pnl >= 0 ? "pos" : "neg");

    UI.assetCountCenter.textContent = `${reporte.length} Assets`;
    UI.lastUpdate.textContent = nowTime();

    renderCards(reporte);
    drawDonut(reporte);

    const alertas = generarAlertas(reporte, callbackAlertas);
    console.clear();
    console.log("=== PORTAFOLIO CRIPTO (Tiempo real) ===");
    console.log("Valor total actual:", total.toFixed(2));
    console.log("PnL total:", pnl.toFixed(2));
    console.log("Alertas:", alertas.length ? alertas : "Sin alertas");
    console.table(reporte.map(r => ({
      simbolo: r.simbolo,
      valorActual: Number(r.valorActual.toFixed(2)),
      pnl: Number(r.pnl.toFixed(2)),
      cambioPct: Number(r.cambioPct.toFixed(2))
    })));

    setStatus(true, "En línea");
  } catch (err) {
    console.error(err);
    setStatus(false, "Error de conexión");
  }
}

window.addEventListener("resize", () => {
  const reporte = buildReporte(portfolio, preciosActuales);
  drawDonut(reporte);
});

actualizarTodo();
setInterval(actualizarTodo, 30000);
