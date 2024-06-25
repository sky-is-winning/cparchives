import { promises as fs } from "fs";
const ROOT_PATH = "";

export default class GenerateTemplate {
    constructor(wikiParser) {
        this.wikiParser = wikiParser;
        this.webserver = wikiParser.webserver;
    }

    generateAmbox(wt) {
        let boxContent = this.extractTemplate(wt, 'Ambox')[0];
    
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
    
        let ambox = `<table class="metadata plainlinks ambox ambox-content" style="">`;
        ambox += `<tbody><tr>`;
        ambox += `<td class="mbox-image><div style="width:${boxData.image.size}"><span typeof="mw:File"><span><img src="${boxData.image.link}" width="${boxData.image.size}" height="auto" class="mw-file-element"/></span></span></span></div></td>`;
        ambox += `<td class="mbox-text" style="">${boxData.text}</td>`;
        ambox += `</tr></tbody></table>`;
        return ambox;
    }
    
    generateImage(imageData) {
        let image = {
            "file": "",
            "size": "",
            "link": "",
            "alt": "",
        };
        // Regular expression to match [[File:...|...|link=...|alt=...]]
        const imageRegex = /\[\[File:([^|\]]+)\|([^|\]]*)(?:\|link=([^|\]]*))?(?:\|alt=([^|\]]+))*\]\]/;
        let match = imageData.match(imageRegex);
    
        if (match) {
            // Assign values if match is found
            image.file = match[1] || "";
            image.size = match[2] || "";
            image.link = match[3] || "";
            image.alt = match[4] || "";
        } else {
            // Handle case where no match is found
            console.error(`No match found for imageData: ${imageData}`);
            // Provide default values or handle the error as appropriate
            // For example, you might set default values or throw an error
        }
    
        // Handle link fallback if not provided or empty
        if (!image.link || image.link === "") {
            image.link = `${ROOT_PATH}/${image.file}`;
        }
    
        return image;
    }
    
    

    findMatchingBrace(str, start) {
        let stack = [];
        for (let i = start; i < str.length; i++) {
            if (str[i] === '{' && str[i + 1] === '{') {
                stack.push('{{');
                i++; // Skip the next character
            } else if (str[i] === '}' && str[i + 1] === '}') {
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
        const regex = new RegExp(`\\{\\{${templateName}`, 'g');
        let match;
        let results = [];
        while ((match = regex.exec(content)) !== null) {
            let start = match.index;
            let end = this.findMatchingBrace(content, start + 2);
            results.push(content.substring(start, end - 1));
        }
        return results;
    }

    async generateTemplate(template) {
        const templateName = template.split('|')[0];
        let wikitext;
        try {
            wikitext = await fs.readFile(`./data/templates/${templateName}.wikitext`, "utf-8");
        } catch (error) {
            return `Template:${templateName}`;
        }
        if (wikitext.includes("{{Ambox")) {
            return this.generateAmbox(wikitext);
        }

        return await this.wikiParser.getContentFromWikiText(wikitext);
    }
}