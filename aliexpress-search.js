// ==UserScript==
// @name         复制速卖通搜索页信息
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @updateURL    https://github.com/great-pacey/tampermonkey/blob/main/aliexpress-search.js
// @match        *://www.aliexpress.com/*
// @icon         https://www.google.com/s2/favicons?domain=tampermonkey.net
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function main() {
    'use strict';

    GM_registerMenuCommand('复制标题', function() {
        const lists = document.body.querySelectorAll('.list-items .item-title')
        if (!lists || !lists.length) {
            setTimeout(main, 10);
            return
        }
        const texts = [].slice.call(lists).map((l, i) => i+1+'、'+l.innerText)
        const str = texts.join('\n')
        GM_setClipboard(str)
    }, 'r');
})();

function majorityElement (nums) {
    var map = {}, max = 1, result = nums[0];
    nums.forEach(n => {
        if (n in map){
           map[n] += 1;
           if (map[n]>max){
               max = map[n];result = n;
           }
        } else {
           map[n] = 1;
        }
    })
    return result;
}

(function main() {
    'use strict';
    GM_registerMenuCommand('复制价格', function() {
        const lists = document.body.querySelectorAll('.price-current')
        if (!lists || !lists.length) {
            setTimeout(main, 10);
            return
        }
        const texts = [].slice.call(lists).map(i => Number(i.innerText.replace('US $', '')))
        alert(texts)
        texts.sort((a,b)=>a-b);
        var str = '价格： ' + texts.join('   ');
        str += '\n平均价: ' + texts.reduce((a,b)=>a+b)/texts.length;
        str += '\n众数： ' + majorityElement(texts);
        GM_setClipboard(str);
    }, 'r');
})();
