// ==UserScript==
// @name         WhatsApp Web Print
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Centered printing of images on WhatsApp Web with maximum scaling and safe margins.
// @author       Michal Dobiášovký
// @match        https://web.whatsapp.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/michaldobiasovsky/whatsapp-web-print/main/script.user.js
// @updateURL    https://raw.githubusercontent.com/michaldobiasovsky/whatsapp-web-print/main/script.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Button styling (bottom right)
    const style = document.createElement('style');
    style.innerHTML = `
        #wa-print-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 10000;
            background-color: #00a884;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: none;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            border: 2px solid white;
            transition: all 0.3s ease;
        }
        #wa-print-fab:hover { transform: scale(1.1); background-color: #008f6f; }
        #wa-print-fab svg { width: 30px; height: 30px; }
    `;
    document.head.appendChild(style);

    const fab = document.createElement('div');
    fab.id = 'wa-print-fab';
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`;
    document.body.appendChild(fab);

    function printImage(imgSrc) {
        const printWin = window.open('', '_blank');
        printWin.document.title = 'WhatsApp Print';

        const styleSheet = printWin.document.createElement('style');
        styleSheet.textContent = `
            @page {
                margin: 0; /* Hides header and footer (URLs/titles) */
            }
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background-color: white;
            }
            .print-container {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                position: absolute;
                top: 0;
                left: 0;
            }
            img {
                /* Proportional scaling with safe margins */
                max-width: 90%;
                max-height: 90%;
                width: auto;
                height: auto;
                display: block;
                object-fit: contain;
                margin: auto;
            }
        `;
        printWin.document.head.appendChild(styleSheet);

        const container = printWin.document.createElement('div');
        container.className = 'print-container';

        const img = printWin.document.createElement('img');
        img.src = imgSrc;

        container.appendChild(img);
        printWin.document.body.appendChild(container);

        img.onload = function() {
            printWin.focus();
            setTimeout(() => {
                printWin.print();
                printWin.close();
            }, 500); // Small delay to ensure high-quality rendering
        };
    }

    // Monitor for open images (using WhatsApp's internal class)
    setInterval(() => {
        const currentImg = document.querySelector('img._ao3e[src^="blob:"]');
        if (currentImg && currentImg.offsetParent !== null) {
            fab.style.display = 'flex';
            fab.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                printImage(currentImg.src);
            };
        } else {
            fab.style.display = 'none';
        }
    }, 500);

})();
