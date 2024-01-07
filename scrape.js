const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const express = require('express');
const cors = require('cors');

let pagination;
let keyword;
let keywordRes = '';
let keywordRes1 = '';
let index = 0;
let data = [];

const app = express();

app.use(cors());

app.get('/api/products/new', async (req, res) => {
  keyword = 'new product 2024';
  pagination = 1;
  getKeywordArr();
  const products = await generateAliexpress();
  console.log(products.length)
  res.json(products);
});

app.get('/api/products/search', async (req, res) => {
  keyword = req.query.keyword;
  pagination = req.query.pagination;
  getKeywordArr();
  const products = await generateAliexpress();
  // console.log(products.length)
  res.json(products);
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const delay = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getKeywordArr = () => {
  keywordRes = '';
  keywordRes1 = '';
  for (const item of keyword.split(' ')) {
    if (index == 0) keywordRes1 += item;
    else keywordRes1 += '+' + item;
    keywordRes += '-' + item;
    index++;
  }
}


const scrollDown = async (page) => {
  const height = await page.evaluate('document.body.scrollHeight');
  let scrollStep = 0;
  const perScroll = 400;

  while (true) {
    await page.evaluate('window.scrollTo(' + scrollStep * perScroll + ', ' + (scrollStep + 1) * perScroll + ')');
    scrollStep++;
    if (scrollStep > height / perScroll + 1) break;
  }
  await delay(200);
}

const scraping = async (page, browser) => {
  try {
    data = [];
    const htmlcontent = await page.content();
    const $ = cheerio.load(htmlcontent);
    const targetContent = $('#card-list');
    if (!targetContent) return data;
    targetContent[0].children.forEach(e => {
      let temp = {};

      tempUrl = $('.multi--container--1UZxxHY', e)[0];
      if (tempUrl) {
        temp['url'] = tempUrl.attribs.href;
      }

      tempTitle = $('.multi--titleText--nXeOvyr', e)[0];
      if (tempTitle) {
        temp['title'] = tempTitle.children[0].data;
      }

      tempPrice = $('.multi--price-sale--U-S0jtj', e)[0];
      temp['price'] = '';
      tempPrice.children.forEach(price => {
        temp['price'] += price.children[0].data;
      });

      temp['image'] = [];
      tempImage = $('.images--imageWindow--1Z-J9gn', e)[0];
      if (tempImage) {
        tempImage.children.forEach(image => {
          temp['image'].push(image.attribs.src);
        });
      } else {
        tempImage = $('.multi--img--1IH3lZb', e)[0];
        temp['image'].push(tempImage.attribs.src);
      }

      temp['storeName'] = '';
      tempStore = $('.cards--storeLink--XkKUQFS', e)[0];
      if (tempStore) {
        temp['storeName'] = tempStore.children[0].data;
      }

      temp['shippingCost'] = '';
      tempShippingCost = $('.multi--serviceStyle--1Z6RxQ4', e)[0];
      if (tempShippingCost) {
        temp['shippingCost'] = tempShippingCost.children[0].data;
      }
      data.push(temp);
    });

    const tempPagination = $('.comet-pagination-item');
    const totpage = tempPagination[tempPagination.length - 1].children[0].children[0].data;
    console.log(totpage)
    await browser.close();
    const res = {};
    res['details'] = data;
    res['totalPage'] = totpage;
    return res;
  } catch (error) {
    console.log('scraping function error:', error);
    await delay(200);
    await scrollDown(page);
    await scraping(page, browser);
  }
}

const generateAliexpress = async () => {
  const browser = await puppeteer.launch({
    // headless: 'new',
    headless: true,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  await page.goto(`https://www.aliexpress.us/w/wholesale${keywordRes}.html?page=${pagination}&g=y&SearchText=${keywordRes1}`);

  try {
    await scrollDown(page);
    const data = await scraping(page, browser);
    return data;

  } catch (error) {
    console.log('generateAliexpress error: ', error)
    await delay(200);
    await scrollDown(page);
    await scraping(page, browser);
  }
}