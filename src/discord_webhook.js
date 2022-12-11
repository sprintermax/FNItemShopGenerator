"use strict";

import { Webhook } from 'discord-webhook-node';
import fs from "fs";
import "dotenv/config";

export default async function publish(savePath, fileName) {
    const { UPLOAD_TO_DISCORD_WEBHOOK, DISCORD_WEBHOOK_URL } = process.env;
    if (!UPLOAD_TO_DISCORD_WEBHOOK) return;
    if (!DISCORD_WEBHOOK_URL) throw new Error("Missing required DISCORD_WEBHOOK_URL from env");
    if (!fs.existsSync(savePath + fileName)) throw new Error(`Missing generated image on "${savePath + fileName}"`);

    const hook = new Webhook(DISCORD_WEBHOOK_URL);
    hook.sendFile(savePath + fileName);
}
