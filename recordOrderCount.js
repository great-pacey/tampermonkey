// ==UserScript==
// @name         记录订单量
// @namespace    pacey
// @version      0.1
// @author       You
// @match        *://www.aliexpress.com/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://unpkg.com/axios/dist/axios.min.js
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_deleteValue
// @grant unsafeWindow
// @grant GM_registerMenuCommand
// ==/UserScript==

(function () {
  const GM_key = 'recordMap';
  const run_time = '09:30', step = 60 * 1000;
  let msg = '';

  GM_registerMenuCommand('查看', () => {
    const id = getId();
    const recordMap = GM_getValue(GM_key) || {};
    console.log(recordMap);
  })

  GM_registerMenuCommand('记录当前', record);

  GM_registerMenuCommand('移除当前', () => {
    const id = getId();
    const recordMap = GM_getValue(GM_key) || {};
    delete recordMap[id];
    GM_setValue(GM_key, recordMap);
  });

  function updateRecordsById(id, count) {
    const recordMap = GM_getValue(GM_key) || {};
    const records = recordMap[id] || [];
    records.push({ count, date: getDateStr() });
    recordMap[id] = records;
    GM_setValue(GM_key, recordMap);
  }

  function record() {
    const id = getId();
    if (!id) return;
    getOrderCountById(id).then(count => {
      updateRecordsById(id, count);
      alert('记录成功');
    });
  }

  function getDateStr() {
    const date = new Date();
    const month = formatNumStr(date.getMonth() + 1);
    const day = formatNumStr(date.getDate());
    return month + '-' + day;
  }

  function formatNumStr(n) {
    return Number(n) < 10 ? '0' + n : String(n);
  }

  function getOrderCountById(id) {
    const headers = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36'
    };
    const url = 'https://www.aliexpress.com/item/' + id + '.html';
    return axios.get(url, { headers }).then(res => {
      const reg = /\"formatTradeCount\"\:\"(\d+)\"/;
      return Number(res.data.match(reg)[1]);
    });
  }

  function getId() {
    const url = window.location.href;
    const id = url.match(/\/item\/(\d+)\.html/);
    return id ? id[1] : null;
  }

  function checkTime() {
    const date = new Date();
    const r_h = Number(run_time.split(':')[0]);
    const r_m = Number(run_time.split(':')[1]);
    const h = date.getHours();
    const min = date.getMinutes();
    msg = h + ':' + min + ' ; ' + r_h + ':' + r_m;
    return r_h === h && r_m === min;
  }

  function updateRecords() {
    const recordMap = GM_getValue(GM_key);
    const ids = Object.keys(recordMap);
    return new Promise(resolve => {
      (function loop() {
        if (ids.length === 0) {
          resolve();
        } else {
          const id = ids.shift();
          getOrderCountById(id).then(count => {
            updateRecordsById(id, count);
            loop();
          });
        }
      })();
    });
  }

  function autoRecord() {
    setInterval(() => {
      if (checkTime()) {
        updateRecords().then(() => {
          console.log('updated!!!');
        });
      } else {
        console.log(msg);
      }
    }, step);
  }

  autoRecord();
})();
