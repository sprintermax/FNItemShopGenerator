"use strict";

import fetch from "node-fetch";
import fs from "fs";
import Jimp from "jimp";
import "dotenv/config";

import gitUpload from "./src/github_upload.js";
import discordWebhook from "./src/discord_webhook.js";

if (!process.env.FNAPI_IO_TOKEN) throw new Error("required FNAPI_IO_TOKEN not found on env");

import { shopItem as shopItemImage, finishProgram } from "./src/utils.js";

console.log("[INFO] Verificando os itens da loja");

const requestHeaders = {}
if (process.env.FNAPI_IO_TOKEN) requestHeaders.Authorization = process.env.FNAPI_IO_TOKEN;

const shopData = await fetch("https://fortniteapi.io/v2/shop?lang=pt-BR", {
  headers: requestHeaders,
})
  .then(async (res) => {
    if (res.ok) return await res.json();
    await finishProgram(
      `[ERROR] O Status Code recebido é direrente do esperado: ${res.status}`
    );
  })
  .catch((err) => {
    console.log(err);
  });
  
  fs.writeFileSync("Latest_io_Api.json", JSON.stringify(shopData, null, "\t"));

const currentDate = shopData.lastUpdate.date.replace(" ", "-").split(`-`);
const shopItems = shopData.shop.filter(item => item.mainType != "sparks_song");

console.log(`[INFO] Loja verificada, ${shopItems.length} itens encontrados`);

console.log("[INFO] Gerando imagem dos itens\n");

const missingItemImage = await Jimp.read("./src/images/QuestionMark.png");
const largeItemOverlay = await Jimp.read("./src/images/LargeOverlay.png");
const smallItemOverlay = await Jimp.read("./src/images/SmallOverlay.png");
const shopBackground = await Jimp.read("./src/images/Background.png");
const vbucksIcon = await Jimp.read("./src/images/VBucks.png");

const titleFont = await Jimp.loadFont("./src/fonts/burbark/burbark_200.fnt");
const dateFont = await Jimp.loadFont("./src/fonts/burbark/burbark_64.fnt");
const burbankFont20 = await Jimp.loadFont("./src/fonts/burbark/burbark_20.fnt");
const burbankFont16 = await Jimp.loadFont("./src/fonts/burbark/burbark_16.fnt");

const itemPromises = [];

shopItems.forEach((shopItem) => {
  itemPromises.push(
    new Promise(async (resolve) => {
      try {
		  const firstItem = shopItem.granted[0];
		  const itemRarity = shopItem.rarity?.id || firstItem?.rarity?.id || "common";
		  const itemSeries = shopItem.series?.id || firstItem?.series?.id;
		  let itemBackground;
		  let itemImage;

		  try {
			if (itemSeries)
			  itemBackground = await Jimp.read(
				`./src/images/series/${itemSeries}.png`
			  );
			else
			  itemBackground = await Jimp.read(
				`./src/images/rarities/${itemRarity}.png`
			  );
		  } catch {
			itemBackground = await Jimp.read("./src/images/rarities/Common.png");
		  }

		  try {
			if (shopItem.mainType === "wrap")
			  itemImage = await Jimp.read(
				firstItem.images.icon ||
				firstItem.images.featured ||
				(shopItem.displayAssets.find((DA) => DA.primaryMode == "BattleRoyale")?.background || shopItem.displayAssets[0].background) // .background was .url
			  );
			else
			  itemImage = await Jimp.read(
				(shopItem.displayAssets.find((DA) => DA.primaryMode == "BattleRoyale")?.background || shopItem.displayAssets[0].background) ||
				firstItem.images.icon
			  );
		  } catch {
			itemImage = missingItemImage;
		  }

		  itemBackground.resize(256, 256).blit(itemImage.resize(256, 256), 0, 0);

		  const itemText = shopItem.displayName?.toUpperCase() || "?????";
		  const textHeight = Jimp.measureTextHeight(burbankFont20, itemText, 245);
		  const PriceWidth =
			26 +
			5 +
			Jimp.measureText(burbankFont20, `${shopItem.price.finalPrice}`);

		  let priceTextPos;

		  if (textHeight <= 22) {
			itemBackground.blit(smallItemOverlay, 0, 0);
			priceTextPos = 198;
		  } else {
			itemBackground.blit(largeItemOverlay, 0, 0);
			priceTextPos = 178;
		  }

		  if (shopItem.mainType === "bundle" || shopItem.granted.length >= 2) {
			const subItemsText = `${shopItem.mainType === "bundle"
			  ? shopItem.granted.length
			  : "+" + (shopItem.granted.length - 1)
			  }`;
			const subItemsTextWidth = Jimp.measureText(burbankFont16, subItemsText);
			const subItemTag = new Jimp(subItemsTextWidth + 4, 20, 0x0);
			subItemTag.print(burbankFont16, 2, 4, subItemsText);
			itemBackground.blit(subItemTag, 243 - subItemsTextWidth, 226);
		  }

		  let priceTag = new Jimp(PriceWidth, 26, 0x0);
		  priceTag.blit(vbucksIcon.resize(26, 26), 1, 0);

		  itemBackground.print(
			burbankFont20,
			8,
			priceTextPos,
			{
			  text: itemText,
			  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			},
			240
		  );

		  priceTag.print(burbankFont20, 31, 5, {
			text: shopItem.price.finalPrice.toString(),
		  });

		  itemBackground.blit(priceTag, 128 - PriceWidth / 2, 220);

		  console.log(`Item pronto: "${itemText}"`);
		  resolve(
			new shopItemImage(
			  itemText,
			  shopItem.section?.id,
			  shopItem.mainType,
			  itemSeries,
			  itemRarity,
			  itemBackground
			)
		  );
	  } catch (err) {
		  console.log(JSON.stringify(shopItem))
		  throw err
	  }
    })
  );
});

const collumsCount = shopItems.length > 48 ? (shopItems.length > 90 ? 16 : 12) : 8;

// const collumsCount = Math.ceil(Math.sqrt(shopItems.length))

shopBackground.resize(
  256 * collumsCount + 15 * (collumsCount - 1) + 100,
  256 * Math.ceil(shopItems.length / collumsCount) +
  15 * (Math.ceil(shopItems.length / collumsCount) - 1) +
  350
);

const titleText = "LOJA DE ITENS";
const leftWatermark = "discord.gg/fortnitebr-pt";
const rightWatermark = "https://fn.gg/itemshop";
const dateText = `DIA ${currentDate[2]}/${currentDate[1]}/${currentDate[0]}`;

const titleWidth = Jimp.measureText(titleFont, titleText);
const dateWidth = Jimp.measureText(dateFont, dateText);
const watermarkWidth = Jimp.measureText(burbankFont20, rightWatermark);

shopBackground.print(
  titleFont,
  shopBackground.bitmap.width / 2 - titleWidth / 2,
  35,
  titleText
);
shopBackground.print(
  dateFont,
  shopBackground.bitmap.width / 2 - dateWidth / 2,
  215,
  dateText
);

shopBackground.print(
  burbankFont20,
  10,
  shopBackground.bitmap.height - 30,
  leftWatermark
);
shopBackground.print(
  burbankFont20,
  shopBackground.bitmap.width - watermarkWidth - 10,
  shopBackground.bitmap.height - 30,
  rightWatermark
);

let currentShopRow = 0;
let currentShopColumn = 0;
let lastLineOffset = 0;

const itemImages = await Promise.all(itemPromises);

itemImages.sort((a, b) => {
  const namePoints =
    a.itemName > b.itemName ? 1 : a.itemName < b.itemName ? -1 : 0;
  const sectionPoints =
    a.sectionName > b.sectionName ? 2 : a.sectionName < b.sectionName ? -2 : 0;
  //return b.sortPoints - a.sortPoints + namePoints;
  return b.sortPoints - a.sortPoints + sectionPoints + namePoints;
});

console.log("\n[INFO] Gerando imagem da loja");

itemImages.forEach(({ image }) => {
  if (
    lastLineOffset === 0 &&
    currentShopRow === Math.floor(itemImages.length / collumsCount)
  )
    lastLineOffset =
      (256 * (collumsCount - (itemImages.length % collumsCount)) +
        (collumsCount - (itemImages.length % collumsCount)) * 15) /
      2;

  shopBackground.blit(
    image,
    lastLineOffset + 256 * currentShopColumn + 15 * currentShopColumn + 50,
    256 * currentShopRow + 15 * currentShopRow + 300
  );

  if ((currentShopColumn + 1) % collumsCount === 0) {
    currentShopRow += 1;
    currentShopColumn = 0;
  } else currentShopColumn += 1;
});

const savePath = './ImagensGeradas/';

function saveImage(version = 1) {
  return new Promise(async (resolve, reject) => {
    const fileName = `${String(currentDate[2]).padStart(2, '0')}-${String(currentDate[1]).padStart(2, '0')}-${String(currentDate[0]).padStart(2, '0')}_v${version}.png`;
    if (fs.existsSync(savePath + fileName)) return resolve(await saveImage(version + 1));
    await shopBackground.writeAsync(savePath + fileName);
    resolve(fileName);
  })
}

saveImage().then((savedFile) => {
  console.log("[INFO] Imagem da loja criada");
  if (process.env.UPLOAD_TO_DISCORD_WEBHOOK.toLocaleLowerCase() === 'yes') discordWebhook(savePath, savedFile);
  if (process.env.UPLOAD_TO_GITHUB.toLocaleLowerCase() === 'yes') gitUpload(savePath, savedFile);
});

