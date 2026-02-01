const fs = require('fs');
const indexPath = './index.html';
const timestamp = Date.now();

try {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Updates app.js?v=...
    html = html.replace(/\/app\.js\?v=\d+/g, `/app.js?v=${timestamp}`);
    
    // Updates style.css?v=...
    html = html.replace(/\/style\.css\?v=\d+/g, `/style.css?v=${timestamp}`);

    fs.writeFileSync(indexPath, html);
    console.log("✅ LeoCore: Versioned app.js and style.css (" + timestamp + ")");
} catch (err) {
    console.error("❌ Error updating index.html:", err);
}
