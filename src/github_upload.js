"use strict";

import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config";

export default async function upload(savePath, fileName) {
    const { GITHUB_TOKEN, UPLOAD_TO_GITHUB, GIT_OWNER, GIT_REPO, GIT_PATH, GIT_BRANCH } = process.env;
    if (!GITHUB_TOKEN || !UPLOAD_TO_GITHUB.toLocaleLowerCase() === 'yes') return;
    if (!GIT_OWNER || !GIT_REPO) throw new Error("Missing required GIT_OWNER and GIT_REPO from env");
    if (!fs.existsSync(savePath + fileName)) throw new Error(`Missing generated image on "${savePath + fileName}"`);

    const baseURL = `https://api.github.com/repos/${GIT_OWNER}/${GIT_REPO}/contents/${GIT_PATH ? GIT_PATH + fileName : fileName}`;

    const requestBody = {
        message: `Uploaded ${fileName}`,
        content: fs.readFileSync(savePath + fileName, { encoding: 'base64' })
    }

    if (GIT_BRANCH) requestBody.branch = GIT_BRANCH;

    const uploadResponse = await fetch(baseURL, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const resData = await uploadResponse.json();

    if (uploadResponse.status === 201) {
        console.log(`Uploaded ${fileName} to GitHub${resData?.content?.url ? ' - ' + resData.content.html_url : ''}`)
    } else {
        console.log(uploadResponse, resData);
    }
}
