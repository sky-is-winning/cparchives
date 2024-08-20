import http from "http";
import fs from "fs";
import {EventEmitter} from "events";
import mime from "mime-types";
import CryptoJS from "crypto-js";
import GeneratePageData from "./generate-page-data.js";

const PORT = process.argv[2] || 80;
const ROOT_PATH = "./archives.clubpenguinwiki.info";
const SPECIAL_CHAR_REPLACERS = [
    ["<", "%3C"],
    [">", "%3E"],
    [":", "%3A"],
    ["\"", "%22"],
    ["\\", "%5C"],
    ["|", "%7C"],
    ["?", "%3F"],
    ["*", "%2A"],
    ["_", " "],
    ["%20", " "]
];
const NAMESPACE_REPLACERS = [
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
];
const REDIRECT_DOMAINS = {
    "/static/": "archives.clubpenguinwiki.info",
    "/media1/": "media1.clubpenguin.com",
    "/swf.cpcheats.info/": "swf.cpcheats.info"
};
const PRERENDER_PAGES = true;

export default class WebServer {
    constructor() {
        this.server = http.createServer();
        this.events = new EventEmitter();
        this.fileStructure = this.getFileStructure();
        this.cache = {};
        this.wikiParser = new GeneratePageData(this);

        this.ROOT_PATH = ROOT_PATH;
    }

    getFileStructure() {
        const file = fs.readFileSync("drive_structure.json");
        return JSON.parse(file);
    }

    get indexhtml() {
        return "<html><head><script>window.location.href = '/wiki/Main_Page';</script></head></html>";
    }

    get html404() {
        return fs.readFileSync(`${ROOT_PATH}/404.html`).toString();
    }

    get loadPhpCss() {
        return fs.readFileSync(`${ROOT_PATH}/styles.css`).toString();
    }

    start() {
        this.server.listen(PORT);

        console.info("Server running on port " + PORT);

        this.server.on("request", async (request, response) => {
            try {
                if (this.cache[request.url]) {
                    this.serveFromCache(request, response);
                    return;
                }

                if (request.url === "/") {
                    this.serveIndex(response);
                } else if (request.url.includes("load.php")) {
                    this.serveCss(response);
                } else {
                    this.handleRequest(request, response);
                }
            } catch (error) {
                console.error(error);
                response.writeHead(500);
                response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
            }
        });

        if (PRERENDER_PAGES) {
            setTimeout(() => {
                this.prerenderPages("./data");
            }, 3000);
        }
    }

    serveFromCache(request, response) {
        const cacheEntry = this.cache[request.url];
        console.info("Served from cache: " + request.url);
        if (cacheEntry.status === 302) {
            response.writeHead(302, {Location: cacheEntry.location});
        } else {
            response.writeHead(cacheEntry.status, {
                "Content-Type": cacheEntry.contentType
            });
        }
        response.end(cacheEntry.content, "utf-8");
    }

    serveIndex(response) {
        this.cache["/"] = {
            status: 200,
            contentType: "text/html",
            content: this.indexhtml
        };
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write(this.indexhtml);
        response.end();
    }

    serveCss(response) {
        this.cache["/load.php"] = {
            status: 200,
            contentType: "text/css",
            content: this.loadPhpCss
        };
        response.writeHead(200, {"Content-Type": "text/css"});
        response.write(this.loadPhpCss);
        response.end();
    }

    async handleRequest(request, response) {
        let filePath;
        const contentType = mime.lookup(request.url) || "text/html";

        if (request.url.startsWith("/static/") || request.url.startsWith("/media1/") || request.url.startsWith("/swf.cpcheats.info/")) {
            this.handleRedirect(request, response, contentType);
        } else {
            filePath = this.constructFilePath(request.url);
            this.processFilePath(filePath, contentType, request, response);
        }
    }

    handleRedirect(request, response, contentType) {
        const domainKey = Object.keys(REDIRECT_DOMAINS).find((key) => request.url.startsWith(key));
        const url = domainKey == "/static/" ? request.url : request.url.split(domainKey)[1];
        const gdriveUrl = this.getFileURLFromGDrive(url, REDIRECT_DOMAINS[domainKey]);

        if (!gdriveUrl) {
            response.writeHead(404, {"Content-Type": "text/html"});
            response.end("File not found", "utf-8");
            return;
        }

        this.cache[request.url] = {status: 302, location: gdriveUrl};
        response.writeHead(302, {
            "Content-Type": contentType,
            Location: gdriveUrl
        });
        response.end();
    }

    constructFilePath(url) {
        let filePath = url.includes(".") ? `${ROOT_PATH}${url}` : url;
        if (filePath.includes("/thumb")) filePath = filePath.replace("/thumb", "");

        for (const replacer of NAMESPACE_REPLACERS) {
            filePath = filePath.replaceAll(replacer[0], replacer[1]);
        }

        for (const replacer of SPECIAL_CHAR_REPLACERS) {
            filePath = filePath.replaceAll(replacer[0], replacer[1]);
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
            filePath += "/index";
        }

        return filePath;
    }

    async processFilePath(filePath, contentType, request, response) {
        console.info("Serving: " + filePath);

        if (!filePath.includes(".")) {
            const pageData = await this.wikiParser.generatePageData(filePath);
            response.writeHead(200, {"Content-Type": "text/html"});
            response.end(pageData, "utf-8");
        } else {
            fs.readFile(filePath, (error, content) => {
                if (error) {
                    this.handleError(error, contentType, response);
                } else {
                    response.writeHead(200, {"Content-Type": contentType});
                    response.end(content, "utf-8");
                }
            });
        }
    }

    async prerenderPages(directory) {
        const pages = fs.readdirSync(directory);
        for (const page of pages) {
            if (fs.lstatSync(`${directory}/${page}`).isDirectory()) {
                if (page !== page.toLowerCase()) {
                    this.prerenderPages(`${directory}/${page}`);
                }
                continue;
            }
            let pagePath = directory + "/" + page;
            pagePath = pagePath.replace("./data/", "/wiki/").replace(".wikitext", "");
            await this.wikiParser.generatePageData(pagePath);
        }
    }

    handleError(error, contentType, response) {
        if (error.code === "ENOENT") {
            fs.readFile("${ROOT_PATH}/404.html", (error, content) => {
                response.writeHead(404, {"Content-Type": contentType});
                response.end(content, "utf-8");
            });
        } else {
            response.writeHead(500);
            response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
        }
    }

    getFileURLFromGDrive(filePath, originalDomain = "archives.clubpenguinwiki.info") {
        let fileArr = filePath.split("/");
        let jsonObject = this.fileStructure[originalDomain];
        for (let i = 0; i < fileArr.length; i++) {
            if (!fileArr[i]) continue;
            if (!jsonObject) {
                console.warn("Error: " + filePath + " not found in file structure");
                return null;
            }
            if (!jsonObject.children) return jsonObject.id;
            jsonObject = jsonObject.children[fileArr[i]];
        }
        if (!jsonObject) {
            console.warn("Error: " + filePath + " not found in file structure");
            return null;
        }
        return `https://drive.usercontent.google.com/download?id=${jsonObject.id}&export=download&authuser=0`;
    }

    getDriveURLFromRedLink(redLink) {
        const fileArr = redLink.split("=");
        const fileName = fileArr[fileArr.length - 1];
        const md5hash = CryptoJS.MD5(fileName).toString();
        return this.getFileURLFromGDrive(`/static/images/archives/${md5hash[0]}/${md5hash[0]}${md5hash[1]}/${fileName}`);
    }
}
