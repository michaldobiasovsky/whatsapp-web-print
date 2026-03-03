// ==UserScript==
// @name         WhatsApp Web Print & OCR
// @name:cs      WhatsApp Web Tisk a OCR
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  A tool for WhatsApp Web that enables image printing and AI-powered text recognition (OCR).
// @description:cs Nástroj pro WhatsApp Web umožňující tisk obrázků a rozpoznávání textu (OCR) pomocí AI.
// @author       Michal Dobiášovský
// @match        https://web.whatsapp.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      generativelanguage.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 1. Localization and Settings
    const lang = (navigator.language || navigator.userLanguage).startsWith('cs') || (navigator.language || navigator.userLanguage).startsWith('sk') ? 'cs' : 'en';

    const i18n = {
        cs: {
            apiKeyPrompt: 'Vložte Gemini API klíč (získáte na aistudio.google.com):',
            analyzing: 'Analyzuji... ⏳',
            noText: 'Text nenalezen.',
            apiError: 'Chyba API.',
            copyBtn: 'Zkopírovat',
            printBtn: 'Tisk výběru',
            closeBtn: 'Zavřít',
            copiedAlert: 'Zkopírováno!',
            menuSetKey: '🔑 Nastavit API klíč',
            menuTogglePrint: '🖨️ Tisk obrázků: ',
            menuToggleOCR: '🔍 AI OCR (Text): ',
            on: 'ZAPNUTO',
            off: 'VYPNUTO',
            aiPrompt: 'EXTRACT TEXT ONLY. NO INTRO. NO CONVERSATION. Output only raw text.'
        },
        en: {
            apiKeyPrompt: 'Enter Gemini API key (get it at aistudio.google.com):',
            analyzing: 'Analyzing... ⏳',
            noText: 'No text found.',
            apiError: 'API Error.',
            copyBtn: 'Copy Text',
            printBtn: 'Print Selection',
            closeBtn: 'Close',
            copiedAlert: 'Copied!',
            menuSetKey: '🔑 Set API Key',
            menuTogglePrint: '🖨️ Image Print: ',
            menuToggleOCR: '🔍 AI OCR (Text): ',
            on: 'ON',
            off: 'OFF',
            aiPrompt: 'EXTRACT TEXT ONLY. NO INTRO. NO CONVERSATION. Output only raw text.'
        }
    };

    const t = (key) => i18n[lang][key];

    let isPrintEnabled = GM_getValue('SETTING_PRINT', true);
    let isOcrEnabled = GM_getValue('SETTING_OCR', true);

    // 2. Menu Commands
    GM_registerMenuCommand(t('menuSetKey'), () => {
        const key = prompt(t('apiKeyPrompt'), GM_getValue('GEMINI_API_KEY', ''));
        if (key !== null) GM_setValue('GEMINI_API_KEY', key.trim());
    });

    GM_registerMenuCommand(t('menuTogglePrint') + (isPrintEnabled ? t('on') : t('off')), () => {
        GM_setValue('SETTING_PRINT', !isPrintEnabled);
        location.reload();
    });

    GM_registerMenuCommand(t('menuToggleOCR') + (isOcrEnabled ? t('on') : t('off')), () => {
        GM_setValue('SETTING_OCR', !isOcrEnabled);
        location.reload();
    });

    // 3. UI Elements & Selection CSS Fix
    const selectionStyle = document.createElement('style');
    selectionStyle.innerHTML = `
        #wa-ocr-res-text {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            cursor: text !important;
        }
        #wa-ocr-modal * {
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(selectionStyle);

    const printFab = document.createElement('div');
    printFab.id = 'wa-print-fab';
    printFab.style.cssText = 'position:fixed; bottom:30px; right:30px; z-index:10000; background-color:#00a884; color:white; width:60px; height:60px; border-radius:50%; display:none; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.4); border:2px solid white;';
    printFab.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`;

    const ocrFab = document.createElement('div');
    ocrFab.id = 'wa-ocr-fab';
    ocrFab.style.cssText = 'position:fixed; bottom:100px; right:30px; z-index:10000; background-color:#1a73e8; color:white; width:60px; height:60px; border-radius:50%; display:none; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.4); border:2px solid white; font-weight:bold; font-size:22px; font-family:sans-serif;';
    ocrFab.innerText = 'T';

    const modal = document.createElement('div');
    modal.id = 'wa-ocr-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:20000; display:none; justify-content:center; align-items:center;';
    modal.innerHTML = `
        <div style="background:white; width:85%; max-width:700px; padding:25px; border-radius:12px; display:flex; flex-direction:column; gap:15px;">
            <div id="wa-ocr-res-text" style="width:100%; height:300px; border:1px solid #ccc; border-radius:6px; padding:12px; font-family:sans-serif; overflow-y:auto; white-space:pre-wrap; background:#fff; color:#111; font-size:14px;"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="wa-ocr-print-text" style="padding:10px 18px; border-radius:6px; cursor:pointer; border:none; font-weight:bold; background:#555; color:white;">${t('printBtn')}</button>
                <button id="wa-ocr-copy" style="padding:10px 18px; border-radius:6px; cursor:pointer; border:none; font-weight:bold; background:#00a884; color:white;">${t('copyBtn')}</button>
                <button id="wa-ocr-close" style="padding:10px 18px; border-radius:6px; cursor:pointer; border:none; font-weight:bold; background:#eee; color:#333;">${t('closeBtn')}</button>
            </div>
        </div>
    `;

    // 4. Core Logic
    async function getBase64(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url: url, responseType: "blob",
                onload: (res) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(res.response);
                }
            });
        });
    }

    async function handlePrint(url) {
        const dataUrl = await getBase64(url);
        const pWin = window.open('', '_blank');
        pWin.document.write(`<html><head><title> </title><style>@page{margin:0;} body{margin:0;display:grid;place-items:center;height:100vh;} img{max-width:94%;max-height:94%;object-fit:contain;}</style></head><body><img src="${dataUrl}"></body></html>`);
        pWin.document.close();
        setTimeout(() => { pWin.print(); pWin.close(); }, 500);
    }

    async function handleOCR(url) {
        let key = GM_getValue('GEMINI_API_KEY');
        if (!key) {
            key = prompt(t('apiKeyPrompt'));
            if (!key) return;
            GM_setValue('GEMINI_API_KEY', key.trim());
        }

        modal.style.display = 'flex';
        const area = document.getElementById('wa-ocr-res-text');
        area.innerText = t('analyzing');
        const fullBase64 = await getBase64(url);

        GM_xmlhttpRequest({
            method: "POST",
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                contents: [{ parts: [{ text: t('aiPrompt') }, { inline_data: { mime_type: "image/jpeg", data: fullBase64.split(',')[1] } }] }]
            }),
            onload: (res) => {
                const json = JSON.parse(res.responseText);
                let result = json.candidates?.[0]?.content?.parts?.[0]?.text || t('noText');
                area.innerText = result.replace(/^(Sure|Here is|Extracted):?\s*/i, "").trim();
            },
            onerror: () => area.innerText = t('apiError')
        });
    }

    // 5. Events
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            e.preventDefault(); e.stopImmediatePropagation();
            modal.style.display = 'none';
        } else if (isPrintEnabled && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            const img = document.querySelector('img._ao3e[src^="blob:"]');
            if (img && img.offsetParent) { e.preventDefault(); e.stopImmediatePropagation(); handlePrint(img.src); }
        }
    }, true);

    setInterval(() => {
        if (!document.body) return;

        // Prevent Interval from disturbing the DOM if modal is active
        if (!document.getElementById('wa-print-fab')) {
            document.body.append(printFab, ocrFab, modal);
            document.getElementById('wa-ocr-close').onclick = () => modal.style.display = 'none';
            document.getElementById('wa-ocr-copy').onclick = () => {
                const text = document.getElementById('wa-ocr-res-text').innerText;
                navigator.clipboard.writeText(text);
                alert(t('copiedAlert'));
            };
            document.getElementById('wa-ocr-print-text').onclick = () => {
                const selection = window.getSelection().toString();
                const fullText = document.getElementById('wa-ocr-res-text').innerText;
                const textToPrint = (selection && selection.trim().length > 0) ? selection : fullText;

                const pWin = window.open('', '_blank');
                pWin.document.write(`<html><head><title> </title><style>@page{margin:15mm;} body{font-family:sans-serif; padding:10px;} pre{white-space:pre-wrap; font-size:14px;}</style></head><body><pre>${textToPrint}</pre></body></html>`);
                pWin.document.close();
                setTimeout(() => { pWin.print(); pWin.close(); }, 500);
            };
        }

        const img = document.querySelector('img._ao3e[src^="blob:"]');
        const isVisible = img && img.offsetParent;

        // Only toggle FAB visibility, don't re-append to avoid focus loss
        if (isVisible) {
            if (isPrintEnabled) printFab.style.display = 'flex';
            if (isOcrEnabled) ocrFab.style.display = 'flex';
            printFab.onclick = () => handlePrint(img.src);
            ocrFab.onclick = () => handleOCR(img.src);
        } else {
            printFab.style.display = 'none';
            ocrFab.style.display = 'none';
            if (modal.style.display === 'flex') modal.style.display = 'none';
        }
    }, 500);
})();
