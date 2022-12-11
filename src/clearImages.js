"use strict";

import fs from "fs";

if (fs.existsSync(`./imagensGeradas`)) fs.rmdirSync(`./imagensGeradas`, { recursive: true });
console.log('Pasta excluída')
