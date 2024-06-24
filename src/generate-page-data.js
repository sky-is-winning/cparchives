import { promises as fs } from "fs";

export default class GeneratePageData {
    constructor(webserver) {
        this.webserver = webserver;
        this.cache = new Map();
    }

    async generatePageData(page) {
        if (this.cache.has(page)) {
            return this.cache.get(page);
        }

        let headData = await this.getHeadData(page);
        let body = await this.getBody(page);

        let pageData = `<html>
            <head>
                ${headData}
            </head>
            <body>
                ${body}
            </body>
        </html>`;

        // this.cache.set(page, pageData);
        return pageData;
    }

    async getHeadData(page) {
    page = page.split("/").pop();
    return `
    <meta charset="UTF-8">
    <title>${page} - Club Penguin Archives Wiki</title>
    <link rel="stylesheet" href="/w/load.php?lang=en&amp;modules=codex-search-styles%7Cext.DarkMode.styles%7Cext.MobileDetect.nomobile%7Cskins.vector.icons%2Cstyles&amp;only=styles&amp;skin=vector-2022">
    <script async="" src="/w/load.php?lang=en&amp;modules=startup&amp;only=scripts&amp;raw=1&amp;skin=vector-2022" type="text/javascript"></script>
    <meta name="ResourceLoaderDynamicStyles" content="">
    <link rel="stylesheet" href="/w/load.php?lang=en&amp;modules=site.styles&amp;only=styles&amp;skin=vector-2022">
    <meta name="generator" content="Sky's Wikitext Parser">
    <meta name="referrer" content="origin">
    <meta name="referrer" content="origin-when-cross-origin">
    <meta name="robots" content="max-image-preview:standard">
    <meta name="format-detection" content="telephone=no">
    <meta name="twitter:site" content="">
    <meta name="twitter:card" content="summary">
    <meta name="viewport" content="width=1000">
    <meta property="og:title" content="${page} - Club Penguin Archives Wiki">
    <meta property="og:type" content="website">
    <link rel="apple-touch-icon" href="/Wiki.png">
    <link rel="icon" href="/favicon.ico">
    <link rel="canonical" href="/wiki/${page}">
    <link rel="alternate" type="application/atom+xml" title="Club Penguin Archives Wiki Atom feed" href="/wiki/Special:RecentChanges?feed=atom">
    <meta property="og:title" content="${page}">
    <meta property="og:site_name" content="Club Penguin Archives Wiki">
    <meta property="og:url" content="/wiki/${page}">
    <meta property="og:image" content="/Wiki.png">
        `
    }

    async getWikiText(title) {
        return await fs.readFile(`./data/${title}.wikitext`, "utf-8")
    }

    async getBody(page) {
        return await this.getWikiText(page);
    }
}