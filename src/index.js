import rp from 'request-promise';
import cheerio from 'cheerio';
import * as priceHelper from './price';

const debug = require('debug')('amazon-wish-list');

class AmazonWishList {
  constructor(tld = 'de') {
    this.baseUrl = ['https://amazon.', tld].join('');
    this.config = {
      profile: {
        url: [this.baseUrl, 'gp/profile/'].join('/')
      },
      lists: {
        url: [this.baseUrl, 'gp/registry/wishlist/?cid='].join('/'),
        selectors: {
          listLinks: "#your-lists-nav a[id^='wl-list-link-']"
        }
      },
      list: {
        url: [this.baseUrl, 'gp/registry/wishlist/'].join('/'),
        selectors: {
          title: '#profile-list-name',
          pageLinks: 'a.wl-see-more',
          items: '#item-page-wrapper #g-items div.a-fixed-right-grid',
          itemTitle: 'h3',
          itemId: 'h3 a',
          itemPriority: '.g-item-comment-row span span.a-hidden',
          itemComment: '.g-item-comment .g-comment-quote.a-text-quote',
          itemPriceText: '.a-price .a-offscreen',
          itemCurrency: '.a-price .a-price-symbol'
        }
      }
    };
  
    this.getProfileUrl = function (cid) {
      const uri = [this.config.profile.url, cid].join('');
      debug('profile url %o', uri);
      return uri;
    };
  
    this.getListsUrl = function (cid) {
      const uri = [this.config.lists.url, cid].join('');
      debug('lists url %o', uri);
      return uri;
    };
  
    this.getListUrl = function (id) {
      const uri = [this.config.list.url, id].join('');
      debug('list url %o', uri);
      return uri;
    };
  
    this.getItemUrl = function (id) {
      return [this.baseUrl, 'dp', id].join('/');
    };
  
    this.getPage = function (url) {
      const uri = [this.baseUrl, url].join('');
      debug('fetch page %o', uri);
      var options = {
        uri: uri,
        transform: (body) => cheerio.load(body)
      };
    
      return rp(options);
    }
  
    this.getItems = function ($) {
      return new Promise((resolve, reject) => {
        const selectors = this.config.list.selectors;
        const $items = $(selectors.items);
        const items = [];
  
        debug('found items: %o', $items.length);
        $items.each((index, element) => {
          // product not available
          if ($(selectors.itemId, element).length === 0) {
            return;
          }
          const title = $(selectors.itemTitle, element).text().trim();
          const id = $(selectors.itemId, element).attr('href').split('/')[2];
          const link = this.getItemUrl(id);
          const priority = parseInt($(selectors.itemPriority, element).text().trim()) | 0;
          const comment = $(selectors.itemComment, element).text().trim();
          let priceText = $(selectors.itemPriceText, element).text().trim();
          let currency = $(selectors.itemCurrency, element).text().trim();
          let price = priceHelper.getPrice(priceText);
          
          items.push({
            id: id,
            title: title,
            link: link,
            priority: priority,
            comment: comment,
            currency: currency ? currency : 'N/A',
            price: price ? price : 'N/A'
          });
        });
  
        resolve(items);
      });
    }
  }
  
  getByCid(cid, filter = 'unpurchased', sort = '') {
    const options = {uri: this.getProfileUrl(cid)};
    
    return rp(options).then(() => {
      const options = {
        uri: this.getListsUrl(cid),
        transform: (body) => cheerio.load(body)
      };
  
      return rp(options);
    }).then(($) => {
      var promises = [];
      var lists = [];
  
      const $lists = $(this.config.lists.selectors.listLinks);
      $lists.each((index, item) => {
        const url = $(item).attr('href');
        const id = url.split('/')[4];
  
        promises.push(this.getById(id, filter, sort));
      });
  
      return Promise.all(promises).then(function (responses) {
        for (let response of responses) {
          lists.push(response);
        }
    
        return new Promise((resolve, reject) => resolve(lists));
      });
    });
  }
  
  getById(id, filter = 'unpurchased', sort = '') {
    const selectors = this.config.list.selectors;
    const options = {
      uri: this.getListUrl(id),
      qs: {
        filter: filter,
        sort: sort
      },
      transform: (body) => cheerio.load(body)
    };
    
    let pagesList = [];
    
    let fetchAllPages = () => {
      return new Promise((resolve, reject) => {
        rp(options).then(($) => {
          pagesList.push($);
          fetchNextPage($, resolve)
        }).catch(reject);
      });
    };
    
    let fetchNextPage = ($, resolve) => {
      const $pages = $(selectors.pageLinks);
      if (!$pages || $pages.length === 0) {
        return resolve();
      }
      $pages.each((index, element) => {
        const url = $(element).attr('href');
        this.getPage(url).then(($) => {
          pagesList.push($);
          fetchNextPage($, resolve);
        });
      });
    };
    
    return new Promise((resolve, reject) => {
      fetchAllPages().then(() => {
        debug('pages count:', pagesList.length);
        
        const list = {
          title: pagesList[0](selectors.title).text().trim(),
          id: id,
          items: []
        };
        
        let items = [];
        pagesList.forEach(($) => {
          items.push(this.getItems($));
        });
        
        Promise.all(items).then(function (responses) {
          for (let response of responses) {
            list.items = list.items.concat(response);
          }
          
          resolve(list);
        });
      }).catch(reject);
    });
  }
}

export default AmazonWishList;
