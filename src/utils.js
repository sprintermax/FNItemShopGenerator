"use strict";

import config from "./config.js";

class shopItem {
    constructor(itemName, sectionName, mainType, series, rarity, image, isSpecial) {
        this.itemName = itemName;
        this.sectionName = sectionName;
        this.mainType = mainType;
        this.isSpecial = isSpecial ? true : false;
        // this.series = series ? series.toLowerCase() : null;
        // this.rarity = rarity.toLowerCase();
        this.sortPoints = this.calcSortPoints();
        this.image = image;
    }
    
    calcSortPoints() {
        let points = 0;
        
        if (this.isSpecial) points += 10000 * config.sortpoints.special;
        // if (this.mainType === "bundle") points += 1000 * config.sortpoints.bundle;
        if (["sparksjamloop", "sparks_song"].includes(this.mainType)) points -= 10000; // why people hate songs hahaha
        if (this.series)
            points +=
        50 *
        (config.sortpoints.series[this.series] ||
            config.sortpoints.series.otherseries);
            if (this.rarity)
                points +=
            10 *
            (config.sortpoints.rarities[this.rarity] ||
                config.sortpoints.series.otherrarity);
                
                return points;
            }
        }
        
        async function finishProgram(message) {
            if (message) console.log(message);
            console.log("\nPressione alguma tecla para finalizar");
            process.stdin.setRawMode(true);
            return new Promise(() =>
                process.stdin.once("data", () => {
                process.stdin.setRawMode(false);
                process.exit();
            })
        );
    }
    
    export { shopItem, finishProgram };
    