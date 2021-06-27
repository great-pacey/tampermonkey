// ==UserScript==
// @name         看订单量
// @namespace    You
// @version      0.1
// @author       You
// @icon         https://www.google.com/s2/favicons?domain=aliexpress.com
// @match        https://www.aliexpress.com/wholesale*
// @require      https://unpkg.com/axios/dist/axios.min.js
// @grant        unsafeWindow
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
	'use strict ';
	var headers = {
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36'
	};

	const isFlex = !!document.body.querySelector('.JIIxO');

	function logTip(total) {
		this.total = total;
		this.parent = document.body;
		this.span = document.createElement('span');
		this.count = 0;
		this.span.innerText = `${this.count}/${total}`;
		this.span.style.position = 'fixed';
		this.span.style.zIndex = 100;
		this.span.style.top = 0;
		this.span.style.left = 0;
		this.parent.appendChild(this.span);
	}

	logTip.prototype.update = function () {
		this.span.innerText = `${++this.count}/${this.total}`;
	}

	logTip.prototype.remove = function () {
		this.parent.removeChild(this.span);
	}

	function getRealOrderNum(id) {
		const url = 'https://www.aliexpress.com/item/' + id + '.html';
		return axios.get(url, { headers }).then(res => {
			const reg = /\"formatTradeCount\"\:\"(\d+)\"/g;
			const order = reg.exec(res.data)[1];
			return order;
		})
	}

	function getOrders(ids) {
		console.log(ids.length);
		const updateSpan = new logTip(ids.length);
		return new Promise(resolve => {
			let result = [], count = 0;
			(function loop() {
				if (ids.length === 0) {
					updateSpan.remove();
					resolve(result);
				} else {
					getRealOrderNum(ids.shift()).then(order => {
						result.push(order);
						console.log(++count);
						updateSpan.update();
						loop();
					});
				}
			})();
		});
	}

	const CLASS_NAME = 'tm_class_name'

	function createSpan(n) {
		const el = document.createElement('span');
		el.style.fontWeight = 'bold';
		el.style.color = n > 0 ? 'red' : n == 0 ? '' : 'green ';
		el.style.position = 'absolute';
		el.style.right = 0;
		el.style.top = 0;
		el.style.fontSize = '20px';
		el.innerText = n;
		el.classList.value = CLASS_NAME;
		return el;
	}

	function setEls(orders) {
		const selector = isFlex ? '.JIIxO ._1OUGS ._9tla3' : '.list-item .place-container';
		const els = [].slice.call(document.body.querySelectorAll(selector));
		orders.forEach((n, I) => { 
			const el = els[I], span = el.querySelector('.' + CLASS_NAME);
			if (span) {
				span.innerText = n;
			} else {
				el.appendChild(createSpan(n)) 
			}
		});
	}

	const sum = arr => arr.reduce((p, n) => p + n, 0);

	function getIds() {
		const selector = isFlex ? '.JIIxO ._1OUGS ._9tla3' : '.list-items .place-container>a';
		return [].slice.call(document.body.querySelectorAll(selector)).map(I => I.getAttribute('href')).map(I => /\/item\/(\d+)\.html/g.exec(I)[1]);
	}

	function run() {
		var ids = getIds();
		console.log(ids);
		const selector = isFlex ? '.JIIxO ._1OUGS' : '.list-items .list-item';
		const oldOrders = [].slice.call(document.body.querySelectorAll(selector)).map(I => {
			const soldSelector = isFlex ? '._2i3yA' : '.sale-value';
			const e = I.querySelector(soldSelector);
            console.log(e)
			return e ? Number(e.innerText.slice(0, -4)) || 0 : 0;
		});
        console.log(oldOrders)
		getOrders(ids).then(numbers => numbers.map((n, I) => n - oldOrders[I])).then(a => {
			GM_setClipboard(a);
			console.log(a, sum(a));
			setEls(a);
		});
	}

	GM_registerMenuCommand('Start get', run);
})();
