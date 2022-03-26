// ==UserScript==
// @name         收集搜索数据
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @updateURL    https://gitee.com/great-pacey/tampermonkey/raw/master/collect.walamrt.user.js
// @match        https://www.walmart.com/*
// @icon         https://www.google.com/s2/favicons?domain=walmart.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async function () {
    const action_time = '14:00';
    let press_count = 0, total_count;
    let continueFlag = true;
    let stopFlag = false;
    const requestFailWord = [];
    GM_registerMenuCommand('机器验证', () => { continueFlag = true });
    GM_registerMenuCommand('开始', main);
    GM_registerMenuCommand('停止', function () { stopFlag = true; });

    async function test() {
        const keywords = await getKeywords();
        searchWordInBulk(keywords);
    }

    async function getWordJson() {
        const url = `http:127.0.0.1:3000/keywords`;
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: function(res) {
                    resolve(JSON.parse(res.responseText));
                }
            })
        })
    }

    function sendSever(list, wordObj) {
        const { keyword, productGroup } = wordObj;
        const { year, month, date, hour, minute } = genNowDateObj();
        const data = list.map(o => {
            const { productId, IsSponsored, Promote, FulfillmentBadges, IsSaveWithWFS, Price, Reviews, Title, Description, No } = o;
            const time = `${formatNum(hour)}:${formatNum(minute)}`;
            return {
                productGroup, keyword, No, productId, time,
                IsSponsored, Promote, FulfillmentBadges, IsSaveWithWFS,
                Price, Reviews, Title, Description, date, month,
                year, hour, fullDate: `${year}-${month}-${date} ${time}`
            };
        });

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "POST",
                url: 'http:127.0.0.1:3000/products',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                onload: resolve
            });
        })
    }

    async function main() {
        searchLoop();
    }

    async function getKeywords() {
        const keywords = await getWordJson();
        total_count = keywords.length;
        return keywords;
    }

    function searchLoop() {
        const [action_h, action_m] = action_time.split(':');

        async function loop() {
            const [h, m] = getUSATime();
            if (h === action_h && m === action_m) {
                const keywords = await getKeywords();
                searchWordInBulk(keywords);
            } else {
                console.log('等待开始', markTime());
                setTimeout(loop, 59*1000);
            }
        }
        loop();
    }

    function formatNum(n) {
        return n > 9 ? String(n) : '0' + n;
    }

    async function searchWord(wordObj) {
        let products;
        try {
            if (stopFlag) return;
            const { keyword } = wordObj;
            products = await collectWord(keyword);
            if (!products.length) {
                requestFailWord.push(wordObj);
                return;
            }
            products = products.filter(i => i.__typename === "Product");
            products = formatProduct(products);
            sendSever(products, wordObj);
            console.log(`${markTime()}，${keyword}请求成功`, `${++press_count}/${total_count}`);
        } catch (error) {
            console.log(products);
        }
    }

    async function searchWordInBulk(keywords) {
        let ws = keywords.slice();
        async function loop() {
            if (!ws.length) {
                console.log(requestFailWord, '请求未完成');
                await researchFailWord();
                press_count = 0;
                console.log(`已经完成`);
                console.log('=======================');
                await requestStructureData();
                searchLoop();
                return;
            };
            const wordObj = ws.shift();
            await searchWord(wordObj);
            await wait(randomNum(800, 1200));
            loop();
        }
        loop();
    }

    async function requestStructureData() {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "POST",
                url: 'http:127.0.0.1:3000/structure',
                onload: resolve
            });
        })
    }

    async function researchFailWord() {
        async function loop() {
            if (!requestFailWord.length) return;
            const wordObj = requestFailWord.shift();
            await searchWord(wordObj);
            await wait(randomNum(800, 1200));
            loop();
        }
        loop();
    }

    async function collectWord(word) {
        let result = [];
        const page1 = await requestWord(word);
        if (page1.length === 0) return result;
        console.log(`${word}第1页OK`);
        await wait(randomNum(1000, 2000));
        const page2 = await requestWord(word, 2);
        if (page2.length === 0) {
            result = page1;
            return result;
        }
        console.log(`${word}第2页OK`);
        await wait(randomNum(1000, 2000));
        const page3 = await requestWord(word, 3);
        if (page3.length === 0) {
            result = page1.concat(page2);
            return result;
        }
        console.log(`${word}第3页OK`);
        await wait(randomNum(1000, 2000));
        const page4 = await requestWord(word, 4);
        if (page4.length === 0) {
            result = page1.concat(page2).concat(page3);
            return result;
        }
        console.log(`${word}第4页OK`);
        return page1.concat(page2).concat(page3).concat(page4);
    }

    async function wait(num) {
        return new Promise(resolve => {
            setTimeout(resolve, num);
        });
    }

    function formatProduct(products) {
        return products.map((i, n) => {
            return {
                No: n + 1,
                productId: i.usItemId,
                Price: String(i.price) || String(i.priceInfo.minPriceForVariant),
                IsSponsored: normalization(i.sponsoredProduct),
                Promote: i.flag,
                IsSaveWithWFS: normalization(i.fulfillmentIcon),
                FulfillmentBadges: i.fulfillmentBadges.join(';'),
                Reviews: i.rating.numberOfReviews,
                Title: i.name,
                Description: i.description
            };
        });
    }

    function normalization(param) {
        return param ? 'Y' : '';
    }

    function requestWord(word, page = 1) {
        var url = 'https://www.walmart.com/search?q=' + formatWord(word) + '&page=' + page + '&affinityOverride=default';
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url,
                onload: async function (res) {
                    let result;
                    try {
                        const reg = /<script\b(?:\s+[^>]*)?__NEXT_DATA__(?:[^>]*)?>(.*?)<\/script\s*>/i;
                        const text = res.responseText.match(reg)[1];
                        result = JSON.parse(text).props.pageProps.initialData.searchResult.itemStacks[0].items;
                    } catch (err) {
                        if (isRobotVerification(res.responseText)) {
                            await requestSendEmail();
                            await pauseToWaitVerification();
                            result = await requestWord(word, page);
                        } else {
                            console.log(`${word}异常，html: `, res.responseText);
                        }
                    } finally {
                        resolve(result);
                    }
                },
                onerror: async function (res) {
                    console.log(`${word}第${page}页请求触发error`, res);
                    resolve([]);
                }
            });
        })
    }

    function pauseToWaitVerification() {
        continueFlag = false;
        return new Promise(resolve => {
            (function loop() {
                const fn = continueFlag ? resolve : loop;
                setTimeout(fn, 950);
            })();
        });
    }

    function requestSendEmail() {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "POST",
                url: 'http:127.0.0.1:3000/sendEmail',
                data: 'send email',
                onload: resolve
            });
        })
    }

    function formatWord(word) {
        return word.replace(/\s/g, '+');
    }

    function genNowDateObj() {
        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const hour = d.getHours();
        const minute = d.getMinutes();
        return { year, month, date, hour, minute };
    }

    function markTime() {
        const date = new Date();
        return date.getHours() + ':' + date.getMinutes();
    }

    function randomNum(minNum, maxNum) {
        switch (arguments.length) {
            case 1:
                return parseInt(Math.random() * minNum + 1, 10);
            case 2:
                return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
            default:
                return 0;
        }
    }

    function isRobotVerification(html) {
        return html.includes('<title>Robot or human?</title>');
    }

    function getUSATime() {
        const d = new Date();
        return [d.getHours(), d.getMinutes()].map(formatNum);
    }
})();
