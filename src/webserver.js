import http from "http";
import fs from "fs";
import {EventEmitter} from "events";
import mime from "mime-types";
import CryptoJS from "crypto-js";
import GeneratePageData from "./generate-page-data.js";

const PORT = process.argv[2] || 80;
const ROOT_PATH = "./archives.clubpenguinwiki.info";
const SPECIAL_CHAR_REPLACERS = [
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
const IMAGE_FORMATS = [".png", ".jpg", ".jpeg", ".svg", ".xml", ".ico"];
const REDIRECT_DOMAINS = {
    "/static/": "archives.clubpenguinwiki.info",
    "/media1/": "media1.clubpenguin.com",
    "/swf.cpcheats.info/": "swf.cpcheats.info"
};

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

        console.log("Server running on port " + PORT);

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
    }

    serveFromCache(request, response) {
        const cacheEntry = this.cache[request.url];
        console.log("Served from cache: " + request.url);
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
        const url = request.url.split(domainKey)[1];
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

        const ignoreLastPeriod = IMAGE_FORMATS.some((format) => filePath.toLowerCase().includes(format));

        if (ignoreLastPeriod) {
            const extension = filePath.slice(filePath.lastIndexOf("."));
            filePath = filePath.split(extension)[0] + extension;
        }

        for (const replacer of SPECIAL_CHAR_REPLACERS) {
            const tempPath = filePath.split("/");
            for (let i = 2; i < (replacer[0] === "." && ignoreLastPeriod ? tempPath.length - 1 : tempPath.length); i++) {
                tempPath[i] = tempPath[i].replaceAll(replacer[0], replacer[1]);
            }
            filePath = tempPath.join("/");
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
            filePath += "/index";
        }

        return filePath;
    }

    async processFilePath(filePath, contentType, request, response) {
        console.log("Serving: " + filePath);

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
                console.log("Error: " + filePath + " not found in file structure");
                return null;
            }
            if (!jsonObject.children) return jsonObject.id;
            jsonObject = jsonObject.children[fileArr[i]];
        }
        if (!jsonObject) {
            console.log("Error: " + filePath + " not found in file structure");
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
