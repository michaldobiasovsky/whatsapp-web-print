// ==UserScript==
// @name         WhatsApp Web Print & OCR
// @name:cs      WhatsApp Web Tisk a OCR
// @namespace    http://tampermonkey.net/
// @version      2.0
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
            apiKeyPrompt: 'Vložte Gemini API klíč:',
            analyzing: 'Analyzuji... ⏳',
            noText: 'Text nenalezen.',
            apiError: 'Chyba API.',
            copyBtn: 'Zkopírovat',
            printBtn: 'Tisk textu',
            closeBtn: 'Zavřít',
            copiedAlert: 'Zkopírováno!',
            menuSetKey: '🔑 Nastavit API klíč',
            menuTogglePrint: '🖨️ Tisk obrázků: ',
            menuToggleOCR: '🔍 AI OCR (Text): ',
            on: 'ZAPNUTO',
            off: 'VYPNUTO'
        },
        en: {
            apiKeyPrompt: 'Enter Gemini API key:',
            analyzing: 'Analyzing... ⏳',
            noText: 'No text found.',
            apiError: 'API Error.',
            copyBtn: 'Copy',
            printBtn: 'Print Text',
            closeBtn: 'Close',
            copiedAlert: 'Copied!',
            menuSetKey: '🔑 Set API Key',
            menuTogglePrint: '🖨️ Image Print: ',
            menuToggleOCR: '🔍 AI OCR (Text): ',
            on: 'ON',
            off: 'OFF'
        }
    };

    const t = (key) => i18n[lang][key];

    // Load user preferences
    let isPrintEnabled = GM_getValue('SETTING_PRINT', true);
    let isOcrEnabled = GM_getValue('SETTING_OCR', true);

    // 2. Tampermonkey Menu Registration
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

    // 3. UI Elements creation
    const printFab = document.createElement('div');
    printFab.style.cssText = 'position:fixed; bottom:30px; right:30px; z-index:10000; background-color:#00a884; color:white; width:60px; height:60px; border-radius:50%; display:none; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.4); border:2px solid white;';
    printFab.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`;

    const ocrFab = document.createElement('div');
    ocrFab.style.cssText = 'position:fixed; bottom:100px; right:30px; z-index:10000; background-color:#1a73e8; color:white; width:60px; height:60px; border-radius:50%; display:none; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.4); border:2px solid white; font-weight:bold; font-size:22px; font-family:sans-serif;';
    ocrFab.innerText = 'T';

    const modal = document.createElement('div');
    modal.id = 'wa-ocr-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:20000; display:none; justify-content:center; align-items:center;';
    modal.innerHTML = `
        <div style="background:white; width:85%; max-width:700px; padding:25px; border-radius:12px; display:flex; flex-direction:column; gap:15px;">
            <div id="wa-ocr-res-text" style="width:100%; height:300px; border:1px solid #ccc; border-radius:6px; padding:12px; font-family:sans-serif; overflow-y:auto; white-space:pre-wrap; background:#fff; color:#111; font-size:14px; user-select:text!important; cursor:text;"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="wa-ocr-print-text" style="padding:10px 18px; border-radius:6px; cursor:pointer; border:none; font-weight:bold; background:#555; color:white;">${t('printBtn')}</button>
                <button id="wa-ocr-copy" style="padding:10px 18px; border-radius:6px; cursor:pointer; border:none; font-weight:bold; background:#00a884; color:white;">${t('copyBtn')}</button>
                <button id="wa-ocr-close" style="padding:10px 18px; border-radius:6px; cursor:pointer; border:none; font-weight:bold; background:#eee; color:#333;">${t('closeBtn')}</button>
            </div>
        </div>
    `;

    // 4. Core Functions
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
        const key = GM_getValue('GEMINI_API_KEY');
        if (!key) return alert(t('apiKeyPrompt'));
        modal.style.display = 'flex';
        const area = document.getElementById('wa-ocr-res-text');
        area.innerText = t('analyzing');
        const fullBase64 = await getBase64(url);
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                contents: [{ parts: [{ text: "EXTRACT TEXT ONLY. NO INTRO. NO CONVERSATION." }, { inline_data: { mime_type: "image/jpeg", data: fullBase64.split(',')[1] } }] }]
            }),
            onload: (res) => {
                const json = JSON.parse(res.responseText);
                area.innerText = (json.candidates?.[0]?.content?.parts?.[0]?.text || t('noText')).replace(/^(Sure|Here is|Extracted):?\s*/i, "").trim();
            },
            onerror: () => area.innerText = t('apiError')
        });
    }

    // 5. Event Handling
    window.addEventListener('keydown', (e) => {
        // Esc key closes the modal or image
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            e.preventDefault(); e.stopImmediatePropagation();
            modal.style.display = 'none';
        } else if (isPrintEnabled && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            const img = document.querySelector('img._ao3e[src^="blob:"]');
            if (img && img.offsetParent) { e.preventDefault(); e.stopImmediatePropagation(); handlePrint(img.src); }
        }
    }, true);

    // Monitor DOM for image preview
    setInterval(() => {
        if (!document.body) return;
        if (!document.getElementById('wa-print-fab')) {
            document.body.append(printFab, ocrFab, modal);
            document.getElementById('wa-ocr-close').onclick = () => modal.style.display = 'none';
            document.getElementById('wa-ocr-copy').onclick = () => {
                navigator.clipboard.writeText(document.getElementById('wa-ocr-res-text').innerText);
                alert(t('copiedAlert'));
            };
            document.getElementById('wa-ocr-print-text').onclick = () => {
                const pWin = window.open('', '_blank');
                pWin.document.write(`<html><head><title> </title><style>@page{margin:15mm;} body{font-family:sans-serif; padding:10px;} pre{white-space:pre-wrap; font-size:14px;}</style></head><body><pre>${document.getElementById('wa-ocr-res-text').innerText}</pre></body></html>`);
                pWin.document.close();
                setTimeout(() => { pWin.print(); pWin.close(); }, 500);
            };
        }
        const img = document.querySelector('img._ao3e[src^="blob:"]');
        const isVisible = img && img.offsetParent;
        printFab.style.display = (isVisible && isPrintEnabled) ? 'flex' : 'none';
        ocrFab.style.display = (isVisible && isOcrEnabled) ? 'flex' : 'none';
        if (isVisible) {
            printFab.onclick = () => handlePrint(img.src);
            ocrFab.onclick = () => handleOCR(img.src);
        } else { modal.style.display = 'none'; }
    }, 500);
})();
