import http from "http";
import fs from "fs";
import { EventEmitter } from "events";
import { JSDOM } from "jsdom";
import mime from "mime-types";
import CryptoJS from "crypto-js";

export default class WebServer {
    constructor() {
        this.server = http.createServer();
        this.events = new EventEmitter();
        this.fileStructure = this.getFileStructure();
        this.cache = {};
    }

    getFileStructure(){
        let file = fs.readFileSync("drive_structure.json");
        return JSON.parse(file);
    }

    get indexhtml() {
        return "<html><head><script>window.location.href = '/wiki/Main_Page';</script></head></html>"
    }

    get html404() {
        return fs.readFileSync("./archives.clubpenguinwiki.info/404.html").toString();
    }

    get loadPhpCss() {
        return fs.readFileSync("./archives.clubpenguinwiki.info/styles.css").toString();
    }

    filterContent(content) {
        var dom = new JSDOM(content)
        var doc = dom.window.document;

        const elementsToRemove = ['vector-header-end', 'vector-page-toolbar-container', 'mw-data-after-content', 'mw-footer-container', 'ambox-content', 'catlinks', 'mainpage-footer'];

        for (let element of elementsToRemove) {
            // Find the div with the class 'vector-header-end'
            var headerEndDiv = doc.querySelector("." + element) || doc.getElementById(element);

            // Check if the div exists
            if (headerEndDiv) {
                headerEndDiv.remove();
            }
        }

        // Remove red links
        var redLinks = doc.querySelectorAll(".new");
        for (let redLink of redLinks) {
            if (!redLink.href.includes("Special:Upload")) {
                redLink.remove();
                continue;
            }

            redLink.href = this.getDriveURLFromRedLink(redLink.href);
            redLink.className = "internal";
        }

        // Serialize the DOM structure back to a string
        let filteredText = dom.serialize();
        filteredText = filteredText.replaceAll("https://static.miraheze.org/cparchiveswiki/", "/static/images/archives/");
        filteredText = filteredText.replaceAll("//static.miraheze.org/cparchiveswiki/", "/static/images/archives/");
        filteredText = filteredText.replaceAll("https://cparchives.miraheze.org/", "/");
        filteredText = filteredText.replaceAll("/static/images/archives/b/bc/Wiki.png", "/Wiki.png");
        filteredText = filteredText.replaceAll("<dl><dd><i>Club Penguin Wiki articles:  <b><big>·</big></b> </i></dd></dl>", "");
        return filteredText
    }

    start() {
        let port = 3000;
        for (let i = 0; i < process.argv.length; i++) {
            if (process.argv[i] == "--port" || process.argv[i] == "-p") {
                port = process.argv[i + 1];
                return;
            }
        }
        this.server.listen(port);

        this.server.on("request", async (request, response) => {
            try {
            if (this.cache[request.url]) {
                let cacheEntry = this.cache[request.url];
                console.log("Served from cache: " + request.url)
                if (cacheEntry.status == 302) {
                    response.writeHead(302, {
                        "Location": cacheEntry.location,
                    });
                    response.end();
                    return;
                }
                response.writeHead(cacheEntry.status, { "Content-Type": cacheEntry.contentType });
                response.end(cacheEntry.content, "utf-8");
                return;
            }

            if (request.url == "/") {
                this.cache[request.url] = {
                    status: 200,
                    contentType: "text/html",
                    content: this.indexhtml,
                };

                response.writeHead(200, { "Content-Type": "text/html" });
                response.write(this.indexhtml);
                response.end();
                return;
            } else if (request.url.includes("load.php")) { 
                this.cache[request.url] = {
                    status: 200,
                    contentType: "text/css",
                    content: this.loadPhpCss,
                };
                
                response.writeHead(200, { "Content-Type": "text/css" });
                response.write(this.loadPhpCss);
                response.end();
                return;
            } else {
                var filePath;
                var contentType = mime.lookup(request.url) || "text/html";
                if (request.url.startsWith("/static/")) {
                    let gdriveUrl = this.getFileURLFromGDrive(request.url);
                    let responseHtml = `<meta http-equiv="refresh" content="0; url=${gdriveUrl}">`;
                    let contentType = mime.lookup(filePath);
                    this.cache[request.url] = {
                        status: 302,
                        location: gdriveUrl,
                    };
                    response.writeHead(302, {
                        "Content-Type": contentType,
                        "Location": gdriveUrl
                    });
                    response.end();
                    return;
                } else {
                    filePath = "./archives.clubpenguinwiki.info" + request.url;
                }

                if (filePath.includes("/thumb")) {
                    filePath = filePath.replace("/thumb", "");
                }

                const formats = [".png", ".jpg", ".jpeg", ".svg"];
                let ignoreLastPeriod = false;

                for (const format of formats) {
                    if (filePath.toLowerCase().includes(format)) {
                        ignoreLastPeriod = true;
                        const extension = filePath.slice(filePath.lastIndexOf('.'));
                        if (extension.toLowerCase() === format) {
                            filePath = filePath.split(extension)[0] + extension;
                            break;
                        }
                    }
                }

                const replacers = [[":", "%3A"], ["?", "%3F"], ["#", "%23"], ["[", "%5B"], ["]", "%5D"], ["@", "%40"], ["!", "%21"], ["$", "%24"], ["&", "%26"], ["'", "%27"], ["(", "%28"], [")", "%29"], ["*", "%2A"], ["+", "%2B"], [",", "%2C"], [";", "%3B"], ["=", "%3D"], [" ", "%20"], [".", "%2E"], ["<", "%3C"], [">", "%3E"], ["^", "%5E"], ["`", "%60"], ["{", "%7B"], ["|", "%7C"], ["}", "%7D"], ["~", "%7E"]];
                for (const replacer of replacers) {
                    let tempPath = filePath.split("/");
                    for (let i = 2; i < ((replacer[0] == "." && ignoreLastPeriod) ? tempPath.length - 1 : tempPath.length); i++) {
                        tempPath[i] = tempPath[i].replaceAll(replacer[0], replacer[1]);
                    }
                    filePath = tempPath.join("/");
                }

                if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
                    filePath = filePath + "/index";
                }

                console.log("Serving: " + filePath);

                fs.readFile(filePath, (error, content) => {
                    if (error) {
                        if (error.code == "ENOENT") {
                            fs.readFile(
                                "./html/404.html",
                                function (error, content) {
                                    response.writeHead(200, {
                                        "Content-Type": contentType,
                                    });
                                    response.end(content, "utf-8");
                                }
                            );
                        } else {
                            response.writeHead(500);
                            response.end(
                                "Sorry, check with the site admin for error: " +
                                    error.code +
                                    " ..\n"
                            );
                            response.end();
                        }
                    } else {
                        let data = content;
                        if (contentType == "text/html") {
                            data = this.filterContent(content);
                            this.cache[request.url] = {
                                status: 200,
                                contentType: contentType,
                                content: data,
                            };
                        }
                        response.writeHead(200, {
                            "Content-Type": contentType,
                        });
                        response.end(data, "utf-8");
                    }
                });
            }
        } catch (error) {
            console.error(error);
            response.writeHead(500);
            response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
        }
        });
    }

    getFileURLFromGDrive(filePath) {
        let fileArr = filePath.split("/");
        let jsonObject = this.fileStructure["archives.clubpenguinwiki.info"];
        for (let i = 0; i < fileArr.length; i++) {
            if (fileArr[i] == ""){
                continue;
            }

            if (!jsonObject){
                return console.log("Error: " + filePath + " not found in file structure")
            }

            if (!jsonObject.children){
                return jsonObject.id
            }
            jsonObject = jsonObject.children[fileArr[i]];
        }
        if (!jsonObject){
            return console.log("Error: " + filePath + " not found in file structure")
        }
        return `https://drive.usercontent.google.com/download?id=${jsonObject.id}&export=download&authuser=0`;
    }

    getDriveURLFromRedLink(redLink) {
        let fileArr = redLink.split("=");
        let fileName = fileArr[fileArr.length - 1];
        let md5hash = CryptoJS.MD5(fileName).toString();
        return this.getFileURLFromGDrive(`/static/images/archives/${md5hash[0]}/${md5hash[0]}${md5hash[1]}/${fileName}`);
    }
}
