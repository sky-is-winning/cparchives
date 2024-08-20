import {promises as fs} from "fs";
const ROOT_PATH = "";

export default class GenerateTemplate {
    constructor(wikiParser) {
        this.wikiParser = wikiParser;
        this.webserver = wikiParser.webserver;
    }

    setPageName(pageName) {
        this.pageName = pageName;
    }
    
    getPageName() {
        return this.pageName;
    }

    async generateAmbox(wt) {
        let boxContent = this.extractTemplate(wt, "Ambox")[0];

        // Use a regex to split the content into key-value pairs
        let boxData = {};
        const keyValueRegex = /\|([^=|]+)=((?:\[\[.*?\]\]|.)*?)(?=\||$)/g;
        let match;
        while ((match = keyValueRegex.exec(boxContent)) !== null) {
            let key = match[1].trim();
            let value = match[2].trim();
            boxData[key] = value;
        }
        if (boxData.image) {
            boxData.image = this.generateImage(boxData.image);
        }

        let ambox = `<table class="metadata plainlinks ambox ambox-${boxData.type}" style="">`;
        ambox += `<tbody><tr>`;
        ambox += `<td class="mbox-image><div style="width:${boxData.image.size}"><span typeof="mw:File"><span><img src="${boxData.image.address}" width="${boxData.image.size}" height="auto" class="mw-file-element"/></span></span></span></div></td>`;
        ambox += `<td class="mbox-text" style="">${await this.parseLine(boxData.text)}</td>`;
        ambox += `</tr></tbody></table>`;
        return ambox;
    }

    generateNavbox(wt) {
        let boxContent = this.extractTemplate(wt, "Navbox")[0];

        // Use a regex to split the content into key-value pairs
        let boxData = {};
        const keyValueRegex = /\|\s*([^=|\n\r]+)\s*=\s*((?:\[\[.*?\]\]|(?:[^[\]\n\r]|\[\[[^\]]*\]\])*)*)/g;
        let match;
        while ((match = keyValueRegex.exec(boxContent)) !== null) {
            let key = match[1].trim();
            let value = match[2].trim();

            // Handle separators like {{·}} by splitting and parsing
            let values = value.split(/{{·}}/).map((item) => item.trim());

            // Remove empty strings from split
            values = values.filter((item) => item !== "");

            // Join back with separators if there are multiple values
            value = values.join(" {{·}} ");

            boxData[key] = value;
        }

        let navbox = `<table class="navbox" cellspacing="0" style=""><tbody><tr><td style="padding:2px;"><table cellspacing="0" class="nowraplinks collapsible autocollapse" style="width:100%;background:transparent;color:inherit;;"><tbody>`;
        navbox += `<tr><th style=";" colspan="2" class="color1"><div class="navbox-title-x"><span class="" style="font-size:110%;">${boxData.title}<span></div></th></tr>`;
        for (let list of Object.keys(boxData).filter((key) => key.startsWith("list"))) {
            let id = parseInt(list.replace("list", ""));
            navbox += `<tr style="height:2px;"><td></td></tr>`;
            navbox += `<td class="navbox-group accent" style=";;">${boxData["group" + id]}</td>`;
            let listContent = boxData[list];
            navbox += `<td style="text-align:left;border-left-width:2px;border-left-style:solid;width:100%;padding:0px;;;" class="navbox-list navbox-${id % 2 == 0 ? "even" : "odd"}"><div style="padding:0em 0.25em">${listContent}</div></td>`;
        }
        navbox += `</tbody></table></td></tr></tbody></table>`;

        return navbox;
    }

    async parseLine(line) {
        const templateRegex = /\{\{([^{}]*?)\}\}(?!\})/g;
        let match;
        while ((match = templateRegex.exec(line)) !== null) {
            const replacement = await this.generateTemplate(match[1]);
            line = line.replace(match[0], replacement);
        }

        if (line.startsWith("*")) {
            line = `<li>${line.replace("*", "").trim()}</li>`;
        }

        let localLinkRegex = /\[\[(.*?)\]\]/g;
        line = line.replace(localLinkRegex, (match, p1) => {
            if (p1.includes("|")) {
                let [url, text] = p1.split("|");
                let urlText = url.replace(/ /g, "_"); // Replace spaces with underscores for the URL
                if (urlText.startsWith("File:")) {
                    return this.getMWImageElement(match);
                }
                if (urlText.startsWith("Media:")) {
                    return `<a href="${this.wikiParser.getFileURI(urlText.split(":")[1])}" title="${url}">${text}</a>`;
                }
                return `<a href="/wiki/${urlText}" title="${url}">${text}</a>`;
            }
            let urlText = p1.replace(/ /g, "_"); // Replace spaces with underscores for the URL
            return `<a href="/wiki/${urlText}" title="${p1}">${p1}</a>`;
        });

        let externalLinkRegex = /\[(.*?)\]/g;
        line = line.replace(externalLinkRegex, (match, p1) => {
            if (p1.includes(" ")) {
                let url = p1.split(" ")[0];
                let text = p1.split(" ").slice(1).join(" ");
                return `<a href="${url}">${text}</a>`;
            }
            return `<a href="${p1}">${p1}</a>`;
        });

        line = line.replace(/'''(.*?)'''/g, "<strong>$1</strong>");
        line = line.replace(/''(.*?)''/g, "<i>$1</i>");

        //line = line.replaceAll("|", "");
        return line;
    }

    async generateWikitable(wt) {
        function containsPipeOutsideBrackets(inputString) {
            // Step 1: Remove all content within square brackets along with the brackets
            const stringWithoutBrackets = inputString.replace(/\[[^\]]*\]/g, "").replace(/\{\{[^\}]*\}\}/g, "");

            // Step 2: Test for presence of | in the remaining string
            return /\|/.test(stringWithoutBrackets);
        }

        let wikitable = "";
        let headerLines = "";
        for (let line of wt.split("\n")) {
            if (line.startsWith("{|")) {
                wikitable += `<table ${line.substring(2)}><tbody>`;
            } else if (line.startsWith("|}")) {
            } else if (line.startsWith("!")) {
                if (line.endsWith("!")) {
                    wikitable += "<tr>";
                    let headers = line.split("!");
                    for (let header of headers) {
                        if (header == "" || header == "<") {
                            continue;
                        }
                        if (header == "--Blank-->") {
                            header = "";
                        }

                        if (containsPipeOutsideBrackets(header)) {
                            let parts = splitString(header);
                            let filteredParts = parts.filter(Boolean);

                            let rowspan = filteredParts.shift();
                            let data = filteredParts.join("");
                            let parsedLine = await this.parseLine(data);
                            wikitable += `<th ${rowspan}>${parsedLine}</th>`;
                        } else {
                            let parsedLine = await this.parseLine(header);
                            if (parsedLine.includes("</th>")) {
                                parsedLine = parsedLine.replace("</th>", "</th><th>");
                                wikitable += `${parsedLine}</th>`;
                            } else {
                                wikitable += `<th>${parsedLine}</th>`;
                            }
                        }
                    }
                } else {
                    headerLines += line;
                }
            } else if (line.startsWith("|-")) {
                if (headerLines !== "") {
                    wikitable += "<tr>";
                    let headers = headerLines.split("!");
                    for (let header of headers) {
                        if (header == "" || header == "<") {
                            continue;
                        }
                        if (header == "--Blank-->") {
                            header = "";
                        }

                        if (containsPipeOutsideBrackets(header)) {
                            let parts = splitString(header);
                            let filteredParts = parts.filter(Boolean);

                            let rowspan = filteredParts.shift();
                            let data = filteredParts.join("");
                            let parsedLine = await this.parseLine(data);
                            wikitable += `<th ${rowspan}>${parsedLine}</th>`;
                        } else {
                            let parsedLine = await this.parseLine(header);
                            if (parsedLine.includes("</th>")) {
                                parsedLine = parsedLine.replace("</th>", "</th><th>");
                                wikitable += `${parsedLine}</th>`;
                            } else {
                                wikitable += `<th>${parsedLine}</th>`;
                            }
                        }
                    }
                    headerLines = "";
                }
                wikitable += "</tr><tr>";
            } else if (line.startsWith("|")) {
                line = line.substring(1);
                let cells = line.split("||");
                for (let cell of cells) {
                    cell = cell.trim();
                    if (containsPipeOutsideBrackets(cell)) {
                        let wikiCell = await parseStyledWikicell(cell, this);
                        wikitable += wikiCell;
                    } else {
                        let parsedLine = await this.parseLine(cell);

                        if (containsPipeOutsideBrackets(parsedLine)) {
                            let wikiCell = await parseStyledWikicell(parsedLine, this);
                            wikitable += wikiCell;
                        } else if (parsedLine.includes("</td>")) {
                            parsedLine = parsedLine.replace("</td>", "</td><td>");
                            wikitable += `${parsedLine}</td>`;
                        } else {
                            wikitable += `<td>${parsedLine}</td>`;
                        }
                    }
                }
            }
            wikitable += "\n";
        }
        wikitable += "</tbody></table>";
        return wikitable;

        async function parseStyledWikicell(cell, scope) {
            let parts = splitString(cell);
            let filteredParts = parts.filter((part) => part !== undefined && part !== "" && part !== "|");
            let rowspan = filteredParts.shift();
            let data = filteredParts.join("");
            let parsedLine = await scope.parseLine(data);
            return `<td ${rowspan}>${parsedLine}</td>`;
        }

        function splitString(cell) {
            let result = [];
            let temp = "";
            let curlyBraceLevel = 0;
            let squareBracketLevel = 0;

            for (let i = 0; i < cell.length; i++) {
                let char = cell[i];

                if (char === "{" && cell[i + 1] === "{") {
                    curlyBraceLevel++;
                    temp += char;
                } else if (char === "}" && cell[i + 1] === "}") {
                    curlyBraceLevel--;
                    temp += char;
                } else if (char === "[" && cell[i + 1] === "[") {
                    squareBracketLevel++;
                    temp += char;
                } else if (char === "]" && cell[i + 1] === "]") {
                    squareBracketLevel--;
                    temp += char;
                } else if (char === "|" && curlyBraceLevel === 0 && squareBracketLevel === 0) {
                    result.push(temp);
                    temp = "";
                } else {
                    temp += char;
                }
            }

            if (temp) {
                result.push(temp);
            }

            return result;
        }
    }

    generateImage(imageData) {
        let image = {
            file: "",
            size: "",
            link: "",
            alt: ""
        };

        const imageRegex = /\[\[File:([^|\]]+)(?:\|([^|\]]+))?(?:\|link=([^|\]]*))?(?:\|alt=([^|\]]*))?(?:\|align=([^|\]]*))?\]\]/;
        let match = imageData.match(imageRegex);

        if (match) {
            // Assign values if match is found
            image.file = match[1] || "";
            image.size = match[2] || "";
            image.link = match[3] || "";
            image.alt = match[4] || "";
            image.alignment = match[5] || "center";
        } else {
            // Handle case where no match is found
            console.error(`No match found for imageData: ${imageData}`);
            // Provide default values or handle the error as appropriate
            // For example, you might set default values or throw an error
        }

        image.address = `${ROOT_PATH}/${image.file}`;

        return image;
    }

    getMWImageElement(imageData) {
        let image = this.generateImage(imageData);
        return `<figure class="mw-halign-${image.alignment}" typeof="mw:File"><p><a href="${image.link}" title="${image.alt}"><span style="font-family:trebuchet ms;"><img class="mw-file-element" src="${image.address}" width="${image.size}" height="auto" decoding="async"></span></a></p><figcaption>&nbsp;</figcaption></figure>`;
    }

    findMatchingBrace(str, start) {
        let stack = [];
        for (let i = start; i < str.length; i++) {
            if (str[i] === "{" && str[i + 1] === "{") {
                stack.push("{{");
                i++; // Skip the next character
            } else if (str[i] === "}" && str[i + 1] === "}") {
                if (stack.length === 0) {
                    return i + 1; // Return the position just after the closing braces
                }
                stack.pop();
                i++; // Skip the next character
            }
        }
        throw new Error("No matching closing braces found");
    }

    extractTemplate(content, templateName) {
        const regex = new RegExp(`\\{\\{${templateName}`, "g");
        let match;
        let results = [];
        while ((match = regex.exec(content)) !== null) {
            let start = match.index;
            let end = this.findMatchingBrace(content, start + 2);
            results.push(content.substring(start, end - 1));
        }
        return results;
    }

    async generateTemplate(template, bypassNoInclude = false) {
        // Enforce capitilisation of first letter
        let templateArr = template.split("")
        templateArr[0] = templateArr[0].toUpperCase();
        template = templateArr.join("")

        if (template === "BASEPAGENAME") {
            return this.getPageName();
        }

        let templateName = template.split("|")[0];
        const templateData = template.split("|").slice(1);

        templateName = templateName.replace("\n", "").trim();

        let wikitext;
        try {
            wikitext = await fs.readFile(`./data/templates/${templateName}.wikitext`, "utf-8");
        } catch (error) {
            console.error(`Error reading template file: ${templateName}${error}`);
            ``;
            return `Template:${templateName}`;
        }

        return await this.generateTemplateFromWikitext(wikitext, templateData, bypassNoInclude);
    }

    async generateTemplateFromWikitext(wikitext, data, bypassNoInclude) {
        if (!bypassNoInclude) wikitext = wikitext.replace(/<noinclude>[\s\S]*?<\/noinclude>|<noinclude>[\s\S]*?(?=<\/noinclude>|$)/g, "");

        var dataSwappers = {};
        data.forEach((item, index) => {
            item = item.replaceAll("\n", "").trim();
            if (item.includes("=")) {
                let [key, value] = item.split("=");
                dataSwappers[key] = value.replaceAll("}}", "").trim();
            } else {
                dataSwappers[index + 1] = item;
            }
        });

        let ifStatement = this.parseIfStatement(wikitext);
        if (ifStatement) {
            let match = ifStatement.condition.match(/\{\{\{([^|}]+)(?:\|(.*?))?\}\}\}/);
            if (match) {
                const dataIndex = match[1];

                if (!dataSwappers[dataIndex]) {
                    wikitext = wikitext.replace(ifStatement.statement, ifStatement.falsePart);
                } else {
                    wikitext = wikitext.replace(ifStatement.statement, ifStatement.truePart);
                }
            } else {
                wikitext = wikitext.replace(ifStatement.statement, ifStatement.falsePart);
            }
        }

        while (wikitext.includes("{{{")) {
            let match = wikitext.match(/\{\{\{([^|}]+)(?:\|(.*?))?\}\}\}/);
            if (match) {
                const wholeMatch = match[0];
                const dataIndex = match[1];
                const defaultValue = match[2];

                if (!dataSwappers[dataIndex]) {
                    wikitext = wikitext.replace(wholeMatch, defaultValue);
                } else {
                    wikitext = wikitext.replace(wholeMatch, dataSwappers[dataIndex]);
                }
            } else {
                break; // Break the loop if no match is found to avoid an infinite loop
            }
        }
        
        let template;
        if (wikitext.includes("{{Ambox")) {
            template = this.generateAmbox(wikitext);
        } else if (wikitext.includes("{{Navbox")) {
            template = this.generateNavbox(wikitext);
        } else {
            template = await this.wikiParser.getContentFromWikiText(wikitext);
        }

        return template;
    }

    parseIfStatement(wikitext) {
        if (wikitext.includes("{{#if")) {
            let openDoubleCurlyBrackets = 0;
            let openTripleCurlyBrackets = 0;
            let openSquareBrackets = 0;
            let startIndex = wikitext.indexOf("{{#if");
        
            // Object to hold condition, truePart, and falsePart
            let parts = {
                condition: "",
                truePart: "",
                falsePart: ""
            };
            let currentPart = "condition"; // Start by capturing the condition part

            for (let i = startIndex; i < wikitext.length; i++) {
                // Handle triple curly braces
                if (wikitext.substr(i, 3) === "{{{") {
                    openTripleCurlyBrackets++;
                    parts[currentPart] += "{{{";
                    i += 2; // Move the index to skip the extra characters of triple braces
                }
                // Handle triple closing curly braces
                else if (wikitext.substr(i, 3) === "}}}") {
                    openTripleCurlyBrackets--;
                    parts[currentPart] += "}}}";
                    i += 2; // Move the index to skip the extra characters of triple braces
                }
                // Handle double curly braces
                else if (wikitext.substr(i, 2) === "{{") {
                    openDoubleCurlyBrackets++;
                    parts[currentPart] += "{{";
                    i += 1; // Move the index to skip the extra characters of double braces
                }
                // Handle double closing curly braces
                else if (wikitext.substr(i, 2) === "}}") {
                    openDoubleCurlyBrackets--;
                    parts[currentPart] += "}}";
                    i += 1; // Move the index to skip the extra characters of double braces
                }
                // Handle square brackets
                else if (wikitext[i] === "[") {
                    openSquareBrackets++;
                    parts[currentPart] += "[";
                } else if (wikitext[i] === "]") {
                    openSquareBrackets--;
                    parts[currentPart] += "]";
                }
                // Handle the first '|' that is not inside other brackets
                else if (wikitext[i] === "|" && openDoubleCurlyBrackets === 1 && openTripleCurlyBrackets === 0 && openSquareBrackets === 0) {
                    if (currentPart === "condition") {
                        currentPart = "truePart";
                    } else if (currentPart === "truePart") {
                        currentPart = "falsePart";
                    }
                } else {
                    // Capture other characters
                    parts[currentPart] += wikitext[i];
                }

                // If all curly brackets are closed, return the result
                if (openDoubleCurlyBrackets === 0 && openTripleCurlyBrackets === 0) {
                    return {
                        statement: wikitext.slice(startIndex, i + 1),
                        condition: parts.condition.trim().slice(5),
                        truePart: parts.truePart.trim(),
                        falsePart: parts.falsePart.trim().substring(0, -2)
                    };
                }
            }
        }
        // Return null if no valid if statement is found
        return null;
    }

}
