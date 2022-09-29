'use strict';

import fetch from 'node-fetch';
import Jimp from 'jimp';
import 'dotenv/config';

import { shopItem as shopItemImage, finishProgram } from './src/utils.js';

console.log("[INFO] Verificando os itens da loja");

const shopData = await fetch('https://fortnite-api.com/v2/shop/br/combined?language=pt-BR', {
    headers: {
        //Authorization: process.env.API_TOKEN
    }
}).then(async res => {
    if (res.ok) return await res.json();
    await finishProgram(`[ERROR] O Status Code recebido é direrente do esperado: ${res.status}`);
}).then(jsonRes => jsonRes.data).catch(err => {
    console.log(err);
});

const currentDate = shopData.date.replace("T", "-").split(`-`);
const shopItems = [...shopData.featured.entries, ...shopData.daily.entries];

console.log(`[INFO] Loja verificada, ${shopItems.length} itens encontrados`);

console.log('[INFO] Gerando imagem dos itens\n');

const missingItemImage = await Jimp.read('./src/images/QuestionMark.png');
const largeItemOverlay = await Jimp.read('./src/images/LargeOverlay.png');
const smallItemOverlay = await Jimp.read('./src/images/SmallOverlay.png');
const shopBackground = await Jimp.read('./src/images/Background.png');
const vbucksIcon = await Jimp.read('./src/images/VBucks.png');

const titleFont = await Jimp.loadFont('./src/fonts/burbark/burbark_200.fnt');
const dateFont = await Jimp.loadFont('./src/fonts/burbark/burbark_64.fnt');
const burbankFont20 = await Jimp.loadFont('./src/fonts/burbark/burbark_20.fnt');
const burbankFont16 = await Jimp.loadFont('./src/fonts/burbark/burbark_16.fnt');

const itemPromises = [];

shopItems.forEach((shopItem) => {
    itemPromises.push(new Promise(async (resolve) => {
        const firstItem = shopItem.items[0];
        const itemRarity = firstItem.rarity.backendValue.split("EFortRarity::")[1];
        const itemSeries = firstItem.series?.backendValue;
        let itemBackground;
        let itemImage;

        try {
            if (itemSeries) itemBackground = await Jimp.read(`./src/images/series/${itemSeries}.png`);
            else itemBackground = await Jimp.read(`./src/images/rarities/${itemRarity}.png`);
        } catch {
            itemBackground = await Jimp.read(`./src/images/rarities/Common.png`);
        }

        try {
            if (shopItem.bundle?.image) itemImage = await Jimp.read(shopItem.bundle.image);
            else if (firstItem.type.backendValue == "AthenaItemWrap") itemImage = await Jimp.read(firstItem.images.icon || firstItem.images.featured || firstItem.images.smallIcon);
            else itemImage = await Jimp.read(firstItem.images.featured || firstItem.images.icon || firstItem.images.smallIcon);
        } catch {
            itemImage = missingItemImage;
        }

        itemBackground.resize(256, 256).blit(itemImage.resize(256, 256), 0, 0);

        const itemText = (shopItem.bundle ? shopItem.bundle.name : firstItem.name).toUpperCase();
        const textHeight = Jimp.measureTextHeight(burbankFont20, itemText, 245);
        const PriceWidth = 26 + 5 + Jimp.measureText(burbankFont20, `${shopItem.finalPrice}`);

        let priceTextPos;

        if (textHeight <= 22) {
            itemBackground.blit(smallItemOverlay, 0, 0);
            priceTextPos = 198;
        } else {
            itemBackground.blit(largeItemOverlay, 0, 0);
            priceTextPos = 178;
        }

        if (shopItem.bundle || shopItem.items.length >= 2) {
            const subItemsText = `${shopItem.bundle ? shopItem.items.length : "+" + (shopItem.items.length - 1)}`;
            const subItemsTextWidth = Jimp.measureText(burbankFont16, subItemsText);
            const subItemTag = new Jimp(subItemsTextWidth + 4, 20, 0x0);
            subItemTag.print(burbankFont16, 2, 4, subItemsText);
            itemBackground.blit(subItemTag, 243 - subItemsTextWidth, 226);
        }

        let priceTag = new Jimp(PriceWidth, 26, 0x0);
        priceTag.blit(vbucksIcon.resize(26, 26), 1, 0);

        itemBackground.print(burbankFont20, 8, priceTextPos, {
            text: itemText,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
        }, 240);

        priceTag.print(burbankFont20, 31, 5, {
            text: shopItem.finalPrice.toString()
        });

        itemBackground.blit(priceTag, (128 - (PriceWidth / 2)), 220);

        console.log(`Item pronto: "${itemText}"`)
        resolve(new shopItemImage(itemText, shopItem.bundle, itemSeries, itemRarity, itemBackground));
    }));
});

const collumsCount = shopItems.length > 18 ? shopItems.length > 21 ? 8 : 7 : 6;

shopBackground.resize(256 * collumsCount + 15 * (collumsCount - 1) + 100, 256 * Math.ceil(shopItems.length / collumsCount) + 15 * (Math.ceil(shopItems.length / collumsCount) - 1) + 350);

const titleText = 'LOJA DE ITENS';
const leftWatermark = 'Apoie Um Criador: Sprintermax';
const rightWatermark = 'https://twitter.com/Sprintermax';
const dateText = `DIA ${currentDate[2]}/${currentDate[1]}/${currentDate[0]}`;

const titleWidth = Jimp.measureText(titleFont, titleText);
const dateWidth = Jimp.measureText(dateFont, dateText);
const watermarkWidth = Jimp.measureText(burbankFont20, rightWatermark);

shopBackground.print(titleFont, ((shopBackground.bitmap.width / 2) - (titleWidth / 2)), 35, titleText);
shopBackground.print(dateFont, ((shopBackground.bitmap.width / 2) - (dateWidth / 2)), 215, dateText);

shopBackground.print(burbankFont20, 10, shopBackground.bitmap.height - 30, leftWatermark);
shopBackground.print(burbankFont20, shopBackground.bitmap.width - watermarkWidth - 10, shopBackground.bitmap.height - 30, rightWatermark);

let currentShopRow = 0;
let currentShopColumn = 0;
let lastLineOffset = 0;

const itemImages = await Promise.all(itemPromises);

itemImages.sort((a, b) => {
    const namePoints = a.itemName > b.itemName ? 1 : a.itemName < b.itemName ? -1 : 0;
    return b.sortPoints - a.sortPoints + namePoints;
});

console.log('\n[INFO] Gerando imagem da loja');

itemImages.forEach(({ image }) => {

    if (lastLineOffset === 0 && currentShopRow === Math.floor(itemImages.length / collumsCount)) lastLineOffset = (256 * (collumsCount - itemImages.length % collumsCount) + (collumsCount - itemImages.length % collumsCount) * 15) / 2;

    shopBackground.blit(image, lastLineOffset + 256 * currentShopColumn + 15 * currentShopColumn + 50, 256 * currentShopRow + 15 * currentShopRow + 300);

    if ((currentShopColumn + 1) % collumsCount === 0) {
        currentShopRow += 1;
        currentShopColumn = 0;
    } else currentShopColumn += 1;

});

shopBackground.write(`./ImagensGeradas/ItemShop-_${currentDate[2]}-${currentDate[1]}-${currentDate[0]}_FN-API.com-${shopData.hash}.png`);

console.log('[INFO] Imagem da loja criada');
