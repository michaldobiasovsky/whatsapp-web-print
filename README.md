# WhatsApp Web Print

A Tampermonkey userscript that adds a floating print button for opened images on WhatsApp Web.
Designed for clean, centered, and scaled printing without messy browser headers.

## Prerequisites: Install Tampermonkey

Before installing the script, you need the Tampermonkey extension by Jan Biniok.

- Official website: [https://www.tampermonkey.net/](https://www.tampermonkey.net/)

### For Firefox 🦊

1. Go to the [Firefox Add-ons Store](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Click **Add to Firefox**.

### For Google Chrome 🌐 (Important!)

1. Go to the [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Click **Add to Chrome**.
3. Enable Developer Mode:
   - Go to `chrome://extensions`.
   - In the top-right corner, toggle **Developer mode** to **ON**.
4. Permissions:
   - In the Tampermonkey extension settings, ensure **Allow access to file URLs** or **Allow User Scripts** is enabled if prompted.
5. ⚠️**Restart your browser**⚠️:
   - For the changes to take effect and for the script to load correctly, close and reopen Chrome entirely. 🔄

## Installation

### Preferred method (automatic updates)

1. Open the script page on GreasyFork: [WhatsApp Web Print](https://greasyfork.org/cs/scripts/568147-whatsapp-web-print).
2. Click **Install this script**.
3. Confirm installation in the Tampermonkey tab that opens.

### Manual method

1. Open your Tampermonkey Dashboard.
2. Create a **New Userscript**.
3. Copy the entire content of `script.user.js` from this repository and paste it into the editor.
4. Save (`Ctrl+S`) and reload WhatsApp Web.

## Usage

1. Open any image in a WhatsApp Web chat so it covers the screen.
2. Click the green Print Icon 🖨️ in the bottom-right corner.
3. The print dialog will open automatically. Confirm your settings and print.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
