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
        ambox += `<td class="mbox-image><div style="width:${boxData.image.size}"><span typeof="mw:File"><span><img src="${boxData.image.address}" width="${boxData.image.size}" height="auto" class="mw-file-element"/></span></span></span></div></td>`;
        ambox += `<td class="mbox-text" style="">${boxData.text}</td>`;
        ambox += `</tr></tbody></table>`;
        return ambox;
    }

    generateNavbox(wt) {
        let boxContent = this.extractTemplate(wt, 'Navbox')[0];
    
        // Use a regex to split the content into key-value pairs
        let boxData = {};
        const keyValueRegex = /\|\s*([^=|\n\r]+)\s*=\s*((?:\[\[.*?\]\]|(?:[^[\]\n\r]|\[\[[^\]]*\]\])*)*)/g;
        let match;
        while ((match = keyValueRegex.exec(boxContent)) !== null) {
            let key = match[1].trim();
            let value = match[2].trim();
            
            // Handle separators like {{·}} by splitting and parsing
            let values = value.split(/{{·}}/).map(item => item.trim());
    
            // Remove empty strings from split
            values = values.filter(item => item !== '');
    
            // Join back with separators if there are multiple values
            value = values.join(' {{·}} ');
    
            boxData[key] = value;
        }

        let navbox = `<table class="navbox" cellspacing="0" style=""><tbody><tr><td style="padding:2px;"><table cellspacing="0" class="nowraplinks collapsible autocollapse" style="width:100%;background:transparent;color:inherit;;"><tbody>`;
        navbox += `<tr><th style=";" colspan="2" class="color1"><div class="navbox-title-x"><span class="" style="font-size:110%;">${boxData.title}<span></div></th></tr>`
        for (let list of Object.keys(boxData).filter(key => key.startsWith('list'))) {
            let id = parseInt(list.replace('list', ''));
            navbox += `<tr style="height:2px;"><td></td></tr>`
            navbox += `<td class="navbox-group accent" style=";;">${boxData["group" + id]}</td>`;
            let listContent = boxData[list];
            navbox += `<td style="text-align:left;border-left-width:2px;border-left-style:solid;width:100%;padding:0px;;;" class="navbox-list navbox-${id % 2 == 0 ? "even" : "odd" }"><div style="padding:0em 0.25em">${listContent}</div></td>`;
        }
    
        return navbox;
    }
    
    
    generateImage(imageData) {
        let image = {
            "file": "",
            "size": "",
            "link": "",
            "alt": "",
        };
    
        const imageRegex = /\[\[File:([^|\]]+)(?:\|([^|\]]+))?(?:\|link=([^|\]]*))?(?:\|alt=([^|\]]*))?\]\]/;
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
    
        image.address = `${ROOT_PATH}/${image.file}`;
    
        return image;
    }

    getMWImageElement(imageData) {
        let image = this.generateImage(imageData);
        return `<figure class="mw-halign-center" typeof="mw:File"><p><a href="${image.link}" title="${image.alt}"><span style="font-family:trebuchet ms;"><img class="mw-file-element" src="${image.address}" width="${image.size}" height="auto" decoding="async"></span></a></p><figcaption>&nbsp;</figcaption></figure>`;
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

        if (wikitext.includes("{{Navbox")) {
            return this.generateNavbox(wikitext);
        }

        return await this.wikiParser.getContentFromWikiText(wikitext);
    }
}