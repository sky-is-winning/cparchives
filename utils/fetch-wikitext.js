import fs from 'fs';

const fetchWikitext = async (pageTitle) => {
    const apiUrl = `https://cparchives.miraheze.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(pageTitle)}&origin=*`;
  
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        // Extract the page ID (since MediaWiki API responses are dynamic)
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pages[pageId].revisions && pages[pageId].revisions[0]) {
            const wikitext = pages[pageId].revisions[0]['*'];
            return wikitext;
        } else {
            console.error(`No revisions found for page: ${pageTitle}`);
            return null;
        }
    } catch (error) {
        console.error(`Fetching wikitext failed for page: ${pageTitle}`, error);
        return null;
    }
  };

let pagestoGrab = [];
let files = fs.readdirSync('./archives.clubpenguinwiki.info/wiki/');
files.forEach(file => {
    if (fs.lstatSync(`./archives.clubpenguinwiki.info/wiki/${file}`).isDirectory()) {
        fs.readdirSync(`./archives.clubpenguinwiki.info/wiki/${file}`).forEach(file2 => {
            pagestoGrab.push(file + "/" + file2);
        });
    }
    pagestoGrab.push(file);
});

pagestoGrab.forEach(async (page) => {
    const replacers = [
        [":", "%3A"],
        ["?", "%3F"],
        ["#", "%23"],
        ["[", "%5B"],
        ["]", "%5D"],
        ["@", "%40"],
        ["!", "%21"],
        ["$", "%24"],
        ["&", "%26"],
        ["'", "%27"],
        ["(", "%28"],
        [")", "%29"],
        ["*", "%2A"],
        ["+", "%2B"],
        [",", "%2C"],
        [";", "%3B"],
        ["=", "%3D"],
        [" ", "%20"],
        [".", "%2E"],
        ["<", "%3C"],
        [">", "%3E"],
        ["^", "%5E"],
        ["`", "%60"],
        ["{", "%7B"],
        ["|", "%7C"],
        ["}", "%7D"],
        ["~", "%7E"]
    ];
    let originalPage = `${page}`
    for (const replacer of replacers) {
        page = page.replaceAll(replacer[1], replacer[0]);
    }

    const windowsFileReplacers = [
        ["<", "%3C"],
        [">", "%3E"],
        [":", "%3A"],
        ["\"", "%22"],
        ["\\", "%5C"],
        ["|", "%7C"],
        ["?", "%3F"],
        ["*", "%2A"]
    ];

    for (const replacer of windowsFileReplacers) {
        originalPage = originalPage.replaceAll(replacer[0], replacer[1]);
    }

    if (fs.existsSync(`./data/${page}.wikitext`)) return;
    let wikitext = await fetchWikitext(page);
    if (!wikitext) return;
    let pageDir = originalPage.split("/");
    pageDir.pop();
    pageDir = pageDir.join("/");
    if (!fs.existsSync(`./data/${pageDir}`)) {
        fs.mkdirSync(`./data/${pageDir}`, { recursive: true });
    }
    fs.writeFileSync(`./data/${originalPage}.wikitext`, wikitext);
});