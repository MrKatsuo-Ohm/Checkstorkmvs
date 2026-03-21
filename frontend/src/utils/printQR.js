// printQR.js — generate QR code print page สำหรับ serial list
export function printSerialQR(itemName, serials) {
  if (!serials || serials.length === 0) return;

  const rows = serials.map(s => `
    <div class="qr-card">
      <div class="qr-img" id="qr-${s.replace(/[^a-zA-Z0-9]/g,'')}"></div>
      <div class="qr-label">${itemName}</div>
      <div class="qr-serial">${s}</div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<title>QR Serials — ${itemName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun','Tahoma',sans-serif; background: #fff; padding: 16px; }
  h1 { font-size: 14px; color: #334155; margin-bottom: 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .qr-card {
    border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 10px; width: 130px; text-align: center;
    break-inside: avoid;
  }
  .qr-img { display: flex; justify-content: center; margin-bottom: 6px; }
  .qr-img canvas, .qr-img img { width: 90px !important; height: 90px !important; }
  .qr-label { font-size: 9px; color: #64748b; margin-bottom: 3px; line-height: 1.3;
    max-height: 2.6em; overflow: hidden; }
  .qr-serial { font-size: 10px; font-weight: 700; color: #1e293b;
    font-family: monospace; word-break: break-all; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <h1>QR Code — ${itemName} (${serials.length} ชิ้น)</h1>
  <div class="grid">${rows}</div>
  <script>
    document.querySelectorAll('.qr-card').forEach(card => {
      const serial = card.querySelector('.qr-serial').textContent;
      const id = 'qr-' + serial.replace(/[^a-zA-Z0-9]/g,'');
      const el = document.getElementById(id);
      if (el) new QRCode(el, { text: serial, width: 90, height: 90, correctLevel: QRCode.CorrectLevel.M });
    });
    setTimeout(() => window.print(), 800);
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}
