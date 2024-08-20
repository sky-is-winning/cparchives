import http from "http";
import https from "https"; // To make HTTPS requests
import fs from "fs"; // To write to disk
import { EventEmitter } from "events";
import mime from "mime-types";

const PORT = process.argv[2] || 80;
const ARCHIVES_WIKI_URL = "https://archives-mw.skyiswinni.ng/";
const ARCHIVES_API_URL = `${ARCHIVES_WIKI_URL}api.php`;
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
];

export default class WebServer {
    constructor() {
        this.server = http.createServer();
        this.events = new EventEmitter();
        this.cache = {};
    }

    async start() {
        this.server.listen(PORT);

        console.info("Server running on port " + PORT);

        this.grabAllPages();

        this.server.on("request", async (request, response) => {
            try {
                if (request.url === "/") {
                    request.url = "/Main_Page";
                }

                if (request.url.includes("wiki/")) {
                    request.url = request.url.replace("wiki/", "");
                }

                let contentType = mime.lookup(request.url) || "text/html";

                if (request.url.startsWith("/static") || (request.url.startsWith("/images") && !request.url.includes("thumb"))) {
                    response.writeHead(302, {
                        "Content-Type": contentType,
                        Location: "https://archives-mw.skyiswinni.ng" + request.url.replaceAll("/static", "").replaceAll("/archives", ""),
                    });
                    response.end();
                } else {

                    let url = request.url.startsWith("/archives") ? request.url.substring(1) : "archives" + request.url
                    SPECIAL_CHAR_REPLACERS.forEach(([char, replacer]) => {
                        url = url.replaceAll(char, replacer);
                    });

                    if (!url.split("/").pop().includes(".")) {
                        url += ".html";
                    }

                    console.info(`Request for ${request.url} (file: ${url})`);

                    if (this.cache[request.url]) {
                        response.writeHead(200, { "Content-Type": "text/html" });
                        response.end(this.cache[request.url]);

                        this.checkForStalePage(request.url);
                    } else if (fs.existsSync(url)) {
                        fs.readFile(url, (err, data) => {
                            if (err) {
                                response.writeHead(500);
                                response.end("Sorry, check with the site admin for error: " + err.code + " ..\n");
                            } else {
                                response.writeHead(200, { "Content-Type": "text/html" });
                                response.end(data);
                            }
                        });

                        this.checkForStalePage(request.url);
                    } else {
                        // Try to fetch the page from the wiki
                        let title = url.split("/").pop().replace(".html", "");
                        await this.savePageToDisk(title);

                        if (this.cache[title]) {
                            response.writeHead(200, { "Content-Type": "text/html" });
                            response.end(this.cache[title]);
                        } else {
                            response.writeHead(404);
                            response.end("404 Not Found");
                        }
                    }
                }

            } catch (error) {
                console.error(error);
                response.writeHead(500);
                response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
            }
        });
    }

    async grabAllPages() {
        let url = `${ARCHIVES_API_URL}?action=query&list=allpages&aplimit=500&format=json`;
        let allPages = [];
        let continueToken = true;

        while (continueToken) {
            let result = await this.fetchFromAPI(url);
            if (result && result.query && result.query.allpages) {
                allPages.push(...result.query.allpages.map(page => page.title));
            }

            if (result && result.continue) {
                const { apcontinue, continue: cont } = result.continue;
                url = `${ARCHIVES_API_URL}?action=query&list=allpages&aplimit=500&format=json&apcontinue=${apcontinue}&continue=${cont}`;
            } else {
                continueToken = false;
            }
        }

        for (let page of allPages) {
            await this.savePageToDisk(page);
        }
    }

    async savePageToDisk(title) {
        return new Promise((resolve, reject) => {
            let url = `${ARCHIVES_WIKI_URL}index.php?title=${title}`.replaceAll(" ", "_");
            SPECIAL_CHAR_REPLACERS.forEach(([char, replacer]) => {
                        title = title.replaceAll(char, replacer);
            });
            if (fs.existsSync(`archives/${title}.html`)) {
                console.info(`Skipping ${title}.html, already exists.`);
                return resolve();
            }
            https.get(url, (res) => {
                console.info(`Fetching ${url}...`);
                let data = '';

                // Accumulate the data chunks
                res.on('data', (chunk) => {
                    data += chunk;
                });

                // Once the response is complete
                res.on('end', async () => {
                    this.cache[title] = data;

                    // Ensure the directory exists
                    const rootFolder = `archives/${title}`.split("/").slice(0, -1).join("/");
                    if (!fs.existsSync(rootFolder)) {
                        fs.mkdirSync(rootFolder, { recursive: true });
                    }

                    data = await this.replaceLinks(data);

                    // Write the data to a file
                    fs.writeFile(`archives/${title}.html`, data, (err) => {
                        if (err) {
                            console.error(`Error saving ${title}:`, err);
                            return reject(err);
                        } else {
                            console.info(`Saved ${title}.html successfully.`);
                            resolve(); // Resolve the promise when the file is written
                        }
                    });
                });

                // Handle request errors
                res.on('error', (err) => {
                    console.error(`Error fetching ${url}:`, err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(`HTTPS request error for ${url}:`, err);
                reject(err);
            });
        });
    }

    async replaceLinks(data) {
        const linkRegex = /(?:href|src)="([^"]+)"/g;
        let match;
        let updatedData = data;

        while ((match = linkRegex.exec(data)) !== null) {
            let originalLink = match[1];
            let newLink = originalLink;

            // Determine if the link is in a src or href attribute
            if (/src="/.test(match[0])) {
                // Handle src attributes (e.g., images, scripts)
                if (originalLink.startsWith('/')) {
                    if (originalLink.includes('.php')) {
                        // PHP files in src attributes should point to the original server
                        newLink = `${ARCHIVES_WIKI_URL}${originalLink}`;
                    } else {
                        // Download and save the file locally
                        newLink = await this.downloadAndSaveFile(originalLink);
                    }
                } else if (originalLink.startsWith('http')) {
                    // External resources, leave as is
                    newLink = originalLink;
                }
            } else if (/href="/.test(match[0])) {
                // Handle href attributes (e.g., internal links, external links)
                if (originalLink.startsWith('/')) {
                    if (originalLink.includes('.php')) {
                        // PHP files or API calls should point to the original server
                        newLink = `${ARCHIVES_WIKI_URL}${originalLink}`;
                    } else {
                        // Internal wiki page links should remain as is
                        newLink = originalLink;
                    }
                } else if (originalLink.startsWith('http')) {
                    // External links, leave as is
                    newLink = originalLink;
                }
            }

            // Replace the original link in the HTML content with the updated link
            updatedData = updatedData.replace(originalLink, newLink);
        }

        return updatedData;
    }

    async downloadAndSaveFile(originalLink) {
        return new Promise((resolve, reject) => {
            const fileUrl = `${ARCHIVES_WIKI_URL}${originalLink}`;
            let localPath = `archives${originalLink}`;
            SPECIAL_CHAR_REPLACERS.forEach(([char, replacer]) => {
                localPath = localPath.replaceAll(char, replacer);
            });

            // Ensure the directory exists
            const rootFolder = localPath.split("/").slice(0, -1).join("/");
            if (!fs.existsSync(rootFolder)) {
                fs.mkdirSync(rootFolder, { recursive: true });
            }

            const file = fs.createWriteStream(localPath);

            https.get(fileUrl, (res) => {
                res.pipe(file);

                file.on('finish', () => {
                    file.close(async () => {
                        // After saving the file, check if it's a JS file and process it
                        if (localPath.endsWith('.js')) {
                            try {
                                const jsData = fs.readFileSync(localPath, 'utf8');
                                const updatedJsData = await this.replaceLinks(jsData, true);
                                fs.writeFileSync(localPath, updatedJsData, 'utf8');
                                console.info(`Updated JS file ${localPath}`);
                            } catch (err) {
                                console.error(`Error processing JS file ${localPath}:`, err);
                                reject(err);
                            }
                        }
                        resolve(localPath); // Resolve with the local path
                    });
                });
            }).on('error', (err) => {
                fs.unlink(localPath); // Delete the file if there's an error
                console.error(`Error downloading ${fileUrl}:`, err);
                reject(err);
            });
        });
    }

    fetchFromAPI(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';

                // A chunk of data has been received.
                res.on('data', (chunk) => {
                    data += chunk;
                });

                // The whole response has been received. Print out the result.
                res.on('end', () => {
                    resolve(JSON.parse(data));
                });

            }).on("error", (err) => {
                reject(err);
            });
        });
    }

    checkForStalePage(title) {
        if (title.startsWith("/")) {
            title = title.substring(1);
        }

        let url = `${ARCHIVES_API_URL}?action=query&prop=revisions&titles=${title}&rvprop=timestamp&format=json`;
        this.fetchFromAPI(url).then((result) => {
            if (result && result.query && result.query.pages) {
                try {
                    let page = Object.values(result.query.pages)[0];
                    if (!page.revisions || !page.revisions[0]) {
                        return;
                    }
                    let timestamp = page.revisions[0].timestamp;
                    let lastModified = new Date(timestamp);

                    if (lastModified > new Date()) {
                        console.info(`${title} has been updated since last fetched. Updating...`);
                        this.savePageToDisk(title);
                    }
                } catch (error) {
                    console.error("Error checking for stale page:", error);
                }
            }
        });
    }
}
