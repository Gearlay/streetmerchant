import { Link, Store } from './store/model';
import chalk from 'chalk';
import { config } from './config';
import winston from 'winston';
import axios from 'axios';

export type StockData = {
  brand: string;
  series: string;
  name: string;
  store: string;
  stock: number | null;
  price?: number | null;
  url: string;
  meta?: string | null;
};

const prettyJson = winston.format.printf(info => {
  const timestamp = new Date().toLocaleTimeString();

  let out = `${chalk.grey(`[${timestamp}]`)} ${info.level} ${chalk.grey(
    '::'
  )} ${info.message}`;

  if (Object.keys(info.metadata).length > 0) {
    out = `${out} ${chalk.magenta(JSON.stringify(info.metadata, null, 2))}`;
  }

  return out;
});

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.metadata({
      fillExcept: ['level', 'message', 'timestamp'],
    }),
    prettyJson
  ),
  level: config.logLevel,
  transports: [new winston.transports.Console({})],
});

export const Print = {
  backoff(
    link: Link,
    store: Store,
    parameters: { delay: number; statusCode: number },
    color?: boolean
  ): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow(
          `BACKOFF DELAY status=${parameters.statusCode} delay=${parameters.delay}`
        )
      );
    }

    return `✖ ${buildProductString(link, store)} :: BACKOFF DELAY status=${parameters.statusCode
      } delay=${parameters.delay}`;
  },
  badStatusCode(
    link: Link,
    store: Store,
    statusCode: number,
    color?: boolean
  ): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow(`STATUS CODE ERROR ${statusCode}`)
      );
    }

    return `✖ ${buildProductString(
      link,
      store
    )} :: STATUS CODE ERROR ${statusCode}`;
  },
  bannedSeller(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('BANNED SELLER')
      );
    }

    return `✖ ${buildProductString(link, store)} :: BANNED SELLER`;
  },
  captcha(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('CAPTCHA')
      );
    }

    return `✖ ${buildProductString(link, store)} :: CAPTCHA`;
  },
  cloudflare(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('CLOUDFLARE, WAITING')
      );
    }

    return `✖ ${buildProductString(link, store)} :: CLOUDFLARE, WAITING`;
  },
  inStock(
    link: Link,
    store: Store,
    color?: boolean,
    sms?: boolean,
    meta?: string | null
  ): string {
    const data: StockData = {
      brand: link.brand,
      series: link.series,
      name: link.model,
      store: store.name,
      stock: 1,
      price: link.price,
      url: link.associateLink ? link.associateLink : link.url,
      meta: meta,
    };

    let url = `${process.env.SSURL}/stock`;
    if (store.bulk) {
      if (!meta) {
        console.log('Meta is empty for a BULK request!');
      }
      url += "/bulk";
    }

    axios.post(url, data).then(
      resp => {
        console.log('Successfully posted to stock stalker server');
      },
      error => {
        console.log('Failed to post to stock stalker server');
        console.log(error);
      }
    );

    const productString = `${buildProductString(link, store)} :: IN STOCK`;

    if (color) {
      return chalk.bgGreen.white.bold(`🚀🚨 ${productString} 🚨🚀`);
    }

    if (sms) {
      return productString;
    }

    return `🚀🚨 ${productString} 🚨🚀`;
  },
  inStockWaiting(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        'ℹ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('IN STOCK, WAITING')
      );
    }

    return `ℹ ${buildProductString(link, store)} :: IN STOCK, WAITING`;
  },
  maxPrice(
    link: Link,
    store: Store,
    maxPrice: number,
    color?: boolean
  ): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow(`PRICE ${link.price ?? ''} EXCEEDS LIMIT ${maxPrice}`)
      );
    }

    return `✖ ${buildProductString(link, store)} :: PRICE ${link.price ?? ''
      } EXCEEDS LIMIT ${maxPrice}`;
  },
  message(
    message: string,
    topic: string,
    store: Store,
    color?: boolean
  ): string {
    if (color) {
      return (
        '✖ ' +
        buildSetupString(topic, store, true) +
        ' :: ' +
        chalk.yellow(message)
      );
    }

    return `✖ ${buildSetupString(topic, store)} :: ${message}`;
  },
  noResponse(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('NO RESPONSE')
      );
    }

    return `✖ ${buildProductString(link, store)} :: NO RESPONSE`;
  },
  outOfStock(
    link: Link,
    store: Store,
    color?: boolean,
    meta?: string | null
  ): string {
    const data: StockData = {
      brand: link.brand,
      series: link.series,
      name: link.model,
      store: store.name,
      stock: 0,
      price: link.price,
      url: link.associateLink ? link.associateLink : link.url,
      meta: meta,
    };

    axios.post(`${process.env.SSURL}/stock`, data).then(
      resp => {
        console.log('Successfully posted to stock stalker server');
      },
      error => {
        console.log('Failed to post to stock stalker server');
        console.log(error);
      }
    );

    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.red('OUT OF STOCK')
      );
    }

    return `✖ ${buildProductString(link, store)} :: OUT OF STOCK`;
  },
  productInStock(link: Link): string {
    let productString = `Product Page: ${link.url}`;
    if (link.cartUrl) productString += `\nAdd To Cart Link: ${link.cartUrl}`;

    return productString;
  },
  rateLimit(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('RATE LIMIT EXCEEDED')
      );
    }

    return `✖ ${buildProductString(link, store)} :: RATE LIMIT EXCEEDED`;
  },
  recursionLimit(link: Link, store: Store, color?: boolean): string {
    if (color) {
      return (
        '✖ ' +
        buildProductString(link, store, true) +
        ' :: ' +
        chalk.yellow('CLOUDFLARE RETRY LIMIT REACHED, ABORT')
      );
    }

    return `✖ ${buildProductString(
      link,
      store
    )} :: CLOUDFLARE RETRY LIMIT REACHED, ABORT`;
  },
};

function buildSetupString(
  topic: string,
  store: Store,
  color?: boolean
): string {
  if (color) {
    return chalk.cyan(`[${store.name}]`) + chalk.grey(` [setup (${topic})]`);
  }

  return `[${store.name}] [setup (${topic})]`;
}

function buildProductString(link: Link, store: Store, color?: boolean): string {
  if (color) {
    if (store.currentProxyIndex !== undefined && store.proxyList) {
      const proxy = `${store.currentProxyIndex + 1}/${store.proxyList.length}`;
      return (
        chalk.gray(`[${proxy}]`) +
        chalk.cyan(` [${store.name}]`) +
        chalk.grey(` [${link.brand} (${link.series})] ${link.model}`)
      );
    } else {
      return (
        chalk.cyan(`[${store.name}]`) +
        chalk.grey(` [${link.brand} (${link.series})] ${link.model}`)
      );
    }
  }

  if (store.currentProxyIndex !== undefined && store.proxyList) {
    const proxy = `${store.currentProxyIndex + 1}/${store.proxyList.length}`;
    return `[${proxy}] [${store.name}] [${link.brand} (${link.series})] ${link.model}`;
  } else {
    return `[${store.name}] [${link.brand} (${link.series})] ${link.model}`;
  }
}
