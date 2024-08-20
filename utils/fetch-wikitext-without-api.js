import fs from 'fs';
import jsdom from 'jsdom';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWikitext = async (pageTitle) => {
    const url = `http://archives.clubpenguinwiki.info/w/index.php?title=${encodeURIComponent(pageTitle)}&action=edit`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        const dom = new jsdom.JSDOM(data);
        const textarea = dom.window.document.querySelector('textarea');
        if (!textarea) {
            throw new Error('Textarea not found');
        }
        return textarea.textContent;
        
    } catch (error) {
        console.error(`Fetching wikitext failed for page: ${pageTitle}`, error);
        return null;
    }
};

const grabPagesFromFile = async (file) => {
    let pagestoGrab = [];
    let pagesTxt = fs.readFileSync(file, 'utf-8');
    pagesTxt.split("\n").forEach(page => {
        pagestoGrab.push(page.trim());
    });

    pagestoGrab = pagestoGrab.filter(page => page !== "");

    for (let page of pagestoGrab) {
        const originalPage = `${page}`;
        
        let namespaceReplacers = [
            ["Talk:", "talk/"],
            ["User:", "users/"],
            ["User talk:", "users/talk/"],
            ["Club Penguin Archives:", "archives/"],
            ["Club Penguin Archives talk:", "archives/talk/"],
            ["File:", "files/"],
            ["File talk:", "files/talk/"],
            ["MediaWiki:", "mediawiki/"],
            ["MediaWiki talk:", "mediawiki/talk/"],
            ["Template:", "templates/"],
            ["Template talk:", "templates/talk/"],
            ["Help:", "help/"],
            ["Help talk:", "help/talk/"],
            ["Category:", "categories/"],
            ["Category talk:", "categories/talk/"],
            ["Widget:", "widgets/"],
            ["Widget talk:", "widgets/talk/"],
            ["Module:", "modules/"],
            ["Module talk:", "modules/talk/"]
        ]

        for (const replacer of namespaceReplacers) {
            page = page.replaceAll(replacer[0], replacer[1]);
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
            page = page.replaceAll(replacer[0], replacer[1]);
        }

        if (fs.existsSync(`./data/${page}.wikitext`)) continue;
        
        await delay(2000); // Wait for 2 seconds before making the request
        console.log(`Fetching wikitext for page: ${originalPage}`);
        let wikitext = await fetchWikitext(originalPage);
        if (!wikitext) continue;
        
        let pageDir = page.split("/");
        pageDir.pop();
        pageDir = pageDir.join("/");
        if (!fs.existsSync(`./data/${pageDir}`)) {
            fs.mkdirSync(`./data/${pageDir}`, { recursive: true });
        }
        
        fs.writeFileSync(`./data/${page}.wikitext`, wikitext);
    }
};

// Process files sequentially
const processFiles = async () => {
    const files = fs.readdirSync('./utils/namespaces');
    
    for (const file of files) {
        console.log(`Processing file: ${file}`);
        await grabPagesFromFile(`./utils/namespaces/${file}`);
    }
};

processFiles().catch(error => console.error('Error during file processing:', error));