
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM();
const DOMParser = dom.window.DOMParser;

const markup = `
    <link rel="stylesheet" href="style.css">
    <div class="card">Hello</div>
`;

const parser = new DOMParser();
const doc = parser.parseFromString(markup, 'text/html');

console.log('Head children:', doc.head.children.length);
for (let i = 0; i < doc.head.children.length; i++) {
    console.log('Head child:', doc.head.children[i].tagName);
}

console.log('Body children:', doc.body.children.length);
for (let i = 0; i < doc.body.children.length; i++) {
    console.log('Body child:', doc.body.children[i].tagName);
}
