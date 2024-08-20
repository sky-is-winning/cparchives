import {promises as fs} from "fs";
import CryptoJS from "crypto-js";
import GenerateTemplate from "./generate-template.js";

const REPLACERS = [
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

const INTERWIKI_LINKS = [
    ["archives", "http://archives.clubpenguinwiki.info/wiki/$1"],
    ["central", "http://central.clubpenguinwiki.info/wiki/$1"],
    ["clubpenguinarchives", "http://archives.clubpenguinwiki.info/wiki/$1"],
    ["clubpenguinfanon", "http://fanon.clubpenguinwiki.info/wiki/$1"],
    ["clubpenguinshops", "http://shops.clubpenguinwiki.info/wiki/$1"],
    ["clubpenguinwiki", "http://clubpenguinwiki.info/wiki/$1"],
    ["fanon", "http://fanon.clubpenguinwiki.info/wiki/$1"],
    ["hewikisource", "http://he.wikisource.org/wiki/$1"],
    ["mediazilla", "https://bugzilla.media.org/$1"],
    ["oldwiki", "http://clubpenguin.wikia.com/wiki/$1"],
    ["ptwiki", "http://pt.clubpenguinwiki.info/wiki/$1"],
    ["shops", "http://shops.clubpenguinwiki.info/wiki/$1"],
    ["uncp", "http://humor.clubpenguinwiki.info/wiki/$1"],
    ["wikibooks", "http://en.wikibooks.org/wiki/$1"],
    ["wikinews", "http://en.wikinews.org/wiki/$1"],
    ["wikipedia", "http://en.wikipedia.org/wiki/$1"],
    ["wikiquote", "http://en.wikiquote.org/wiki/$1"],
    ["wikisource", "http://wikisource.org/wiki/$1"],
    ["wikispecies", "http://species.wikimedia.org/wiki/$1"],
    ["wikiversity", "http://en.wikiversity.org/wiki/$1"],
    ["wikt", "http://en.wiktionary.org/wiki/$1"],
    ["wiktionary", "http://en.wiktionary.org/wiki/$1"],
    ["www", "http://clubpenguinwiki.info/wiki/$1"]
];

export default class GeneratePageData {
    constructor(webserver) {
        this.webserver = webserver;
        this.wikitextCache = new Map();
        this.cache = new Map();
        this.templateGenerator = new GenerateTemplate(this);
    }

    async generatePageData(page) {
        if (page.startsWith("/wiki/")) {
            page = page.replace("/wiki/", "/");
        }

        let wikitext = await this.getWikiText(page);
        if (this.wikitextCache.has(page)) {
            if (this.wikitextCache.get(page) === wikitext) {
                if (this.cache.has(page)) {
                    console.info("Cache hit for", page);
                    return this.cache.get(page);
                }
            }
        }

        let truePageName = page.slice(1)
        let pageName = truePageName.replaceAll("_", " ");
        this.templateGenerator.setPageName(pageName);
        for (const replacer of REPLACERS) {
            pageName = pageName.replaceAll(replacer[1], replacer[0]);
        }

        let headData = await this.getHeadData(page, pageName);
        let body = await this.getBody(page, pageName, truePageName);

        let pageData = `<html>
            <head>
                ${headData}
            </head>
            <body class="skin-vector skin-vector-search-vue mediawiki ltr sitedir-ltr mw-hide-empty-elt ns-0 ns-subject page-${pageName} rootpage-${pageName} skin-vector-2022 action-view">
                ${body}
            </body>
        </html>`;

        this.cache.set(page, pageData);
        return pageData;
    }

    async getHeadData(page, pageName) {
        return `
    <head>
<meta charset="UTF-8">
<title>${pageName} - Club Penguin Archives</title>
<meta name="generator" content="Sky's Wikitext Parser">
<meta name="description" content="The Club Penguin Archives is the most comprehensive archive of Club Penguin, including SWFs and more.">
<link rel="shortcut icon" href="/Favicon.ico">
<link rel="search" type="application/opensearchdescription+xml" href="/w/opensearch_desc.php" title="Club Penguin Archives (en)">
<link rel="alternate" hreflang="x-default" href="/wiki/Main_Page">
<link rel="alternate" type="application/atom+xml" title="Club Penguin Archives Atom feed" href="/w/index.php?title=Special:RecentChanges&amp;feed=atom">
<link rel="stylesheet" href="/styles.css">
<style>
.mw-collapsible-toggle{float:right;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;user-select:none}  .mw-content-ltr .mw-collapsible-toggle,.mw-content-rtl .mw-content-ltr .mw-collapsible-toggle{float:right} .mw-content-rtl .mw-collapsible-toggle,.mw-content-ltr .mw-content-rtl .mw-collapsible-toggle{float:left}.mw-customtoggle,.mw-collapsible-toggle{cursor:pointer} caption .mw-collapsible-toggle,.mw-content-ltr caption .mw-collapsible-toggle,.mw-content-rtl caption .mw-collapsible-toggle,.mw-content-rtl .mw-content-ltr caption .mw-collapsible-toggle,.mw-content-ltr .mw-content-rtl caption .mw-collapsible-toggle{float:none} li .mw-collapsible-toggle,.mw-content-ltr li .mw-collapsible-toggle,.mw-content-rtl li .mw-collapsible-toggle,.mw-content-rtl .mw-content-ltr li .mw-collapsible-toggle,.mw-content-ltr .mw-content-rtl li .mw-collapsible-toggle{float:none} .mw-collapsible-toggle-li{list-style:none}
/* cache key: cparchives:resourceloader:filter:minify-css:7:e1ffd603cbaaa5f1a36e0d13fe843535 */
.suggestions{overflow:hidden;position:absolute;top:0;left:0;width:0;border:none;z-index:1099;padding:0;margin:-1px 0 0 0}.suggestions-special{position:relative;background-color:white;cursor:pointer;border:solid 1px #aaaaaa;padding:0;margin:0;margin-top:-2px;display:none;padding:0.25em 0.25em;line-height:1.25em}.suggestions-results{background-color:white;cursor:pointer;border:solid 1px #aaaaaa;padding:0;margin:0}.suggestions-result{color:black;margin:0;line-height:1.5em;padding:0.01em 0.25em;text-align:left; overflow:hidden;-o-text-overflow:ellipsis; text-overflow:ellipsis;white-space:nowrap}.suggestions-result-current{background-color:#4C59A6;color:white}.suggestions-special .special-label{color:gray;text-align:left}.suggestions-special .special-query{color:black;font-style:italic;text-align:left}.suggestions-special .special-hover{background-color:silver}.suggestions-result-current .special-label,.suggestions-result-current .special-query{color:white}.highlight{font-weight:bold}
/* cache key: cparchives:resourceloader:filter:minify-css:7:f8d0c6895ce3ae14434c16b8fca59432 */
.postedit-container{margin:0 auto;position:fixed;top:0;height:0;left:50%;z-index:1000;font-size:13px}.postedit-container:hover{cursor:pointer}.postedit{position:relative;top:0.6em;left:-50%;padding:.6em 3.6em .6em 1.1em;line-height:1.5625em;color:#626465;background-color:#f4f4f4;border:1px solid #dcd9d9;text-shadow:0 0.0625em 0 rgba(255,255,255,0.5);border-radius:5px;box-shadow:0 2px 5px 0 #ccc;-webkit-transition:all 0.25s ease-in-out;-moz-transition:all 0.25s ease-in-out;-ms-transition:all 0.25s ease-in-out;-o-transition:all 0.25s ease-in-out;transition:all 0.25s ease-in-out}.skin-monobook .postedit{top:6em !important}.postedit-faded{opacity:0}.postedit-icon{padding-left:41px;  line-height:25px;background-repeat:no-repeat;background-position:8px 50%}.postedit-icon-checkmark{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABblBMVEUAAAD///////9PfTf///80aRdTgjn///9Feij///////////9Rfzf///////////9PfjZRgDh1o1xOfTb///////+bwYqLtnj///////9PfTa82K////9WhT6YxIL///9QgDdTgzr////////j7uDl7eLq8efi693k7OH///////9UhjuBr2rp9uRUhjr///9YljVKgir///9WiTlYjT3////9/v57vFlbkT5PjC9dlD/5/fhuq09stUTs9uhxuElctCpfnT1huDFloEZloUZmpENmvDZpvDxpvTxqvjxrvT5rvT9rwTxsqktswD5uwkBvuUdxw0NztFBztU9ztVBzwkp0tlJ1xkd2t1R3uVR4w1F4xk54x014yE15uVZ5v1R5xVB6v1R7yFJ8wVh9xVl9yFR9yVd9ylN+xVh+yFd/x1l/yFeAylmEx1+Ny2uY0Hqe04Wj1Ymv3Ze33qLD47TJ5L3O6cPU7Mrq9eb2+/Q4j37OAAAAQHRSTlMAAQIEBAUFBQwPFB4fJCUoKiosQEhJS01RUlZZXmdydXaChYuSlJSWmJmoq6uur8LExcvM19fg5ejt8fX2+Pr7SljgewAAAKpJREFUGBkFwQNCAwAAAMDLtl3LtrG4rWXbtvX77gAgZ6grFwC0bhwNVgKgdPZx8b0dgLi+s7Wn0VoAqpfOI9+BNADZI7fLrz2pSEwGHZuH+78lSK8ZLkLezF3ooyUG3VPXq2USei9WngeyoG195yBYWDF3E/2pAhl1e9Gr8bGT+bfOFCC2fnvh4X7rcqIAQNNu+HT6sxkAjceTL/2ZAIhv+PorBwBJxfkA//dFHSCBy/UTAAAAAElFTkSuQmCC);background-image:url(//w/resources/src/mediawiki.action/images/green-checkmark.png?2015-08-10T21:21:40Z)!ie;background-position:left}.postedit-close{position:absolute;padding:0 .8em;right:0;top:0;font-size:1.25em;font-weight:bold;line-height:2.3em;color:black;text-shadow:0 0.0625em 0 white;text-decoration:none;opacity:0.2;filter:alpha(opacity=20)}.postedit-close:hover{color:black;text-decoration:none;opacity:0.4;filter:alpha(opacity=40)}
/* cache key: cparchives:resourceloader:filter:minify-css:7:3a3b3749ce25c0b902a79b1a6f2e0e23 */</style><style>
.suggestions a.mw-searchSuggest-link,.suggestions a.mw-searchSuggest-link:hover,.suggestions a.mw-searchSuggest-link:active,.suggestions a.mw-searchSuggest-link:focus{color:black;text-decoration:none}.suggestions-result-current a.mw-searchSuggest-link,.suggestions-result-current a.mw-searchSuggest-link:hover,.suggestions-result-current a.mw-searchSuggest-link:active,.suggestions-result-current a.mw-searchSuggest-link:focus{color:white}.suggestions a.mw-searchSuggest-link .special-query{ overflow:hidden;-o-text-overflow:ellipsis; text-overflow:ellipsis;white-space:nowrap}
/* cache key: cparchives:resourceloader:filter:minify-css:7:ae3fa4570b5ac0c6cf7b3776c8ae4d6f */</style><meta name="ResourceLoaderDynamicStyles" content="">
<style>a:lang(ar),a:lang(kk-arab),a:lang(mzn),a:lang(ps),a:lang(ur){text-decoration:none}
/* cache key: cparchives:resourceloader:filter:minify-css:7:89f66f7f9d0045713185cf069001a483 */</style>
<script>if(window.mw){
mw.config.set({"wgCanonicalNamespace":"","wgCanonicalSpecialPageName":false,"wgNamespaceNumber":0,"wgPageName":"Main_Page","wgTitle":"Main Page","wgCurRevisionId":96218,"wgRevisionId":96218,"wgArticleId":1,"wgIsArticle":true,"wgIsRedirect":false,"wgAction":"view","wgUserName":null,"wgUserGroups":["*"],"wgCategories":[],"wgBreakFrames":false,"wgPageContentLanguage":"en","wgPageContentModel":"wikitext","wgSeparatorTransformTable":["",""],"wgDigitTransformTable":["",""],"wgDefaultDateFormat":"dmy","wgMonthNames":["","January","February","March","April","May","June","July","August","September","October","November","December"],"wgMonthNamesShort":["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"wgRelevantPageName":"Main_Page","wgRelevantArticleId":1,"wgIsProbablyEditable":false,"wgRestrictionEdit":["sysop"],"wgRestrictionMove":["sysop"],"wgIsMainPage":true,"wgWikiEditorEnabledModules":{"toolbar":true,"dialogs":true,"hidesig":true,"preview":false,"publish":false}});
}</script><script>if(window.mw){
mw.loader.implement("user.options",function($,jQuery){mw.user.options.set({"variant":"en"});});mw.loader.implement("user.tokens",function($,jQuery){mw.user.tokens.set({"editToken":"+\\","patrolToken":"+\\","watchToken":"+\\"});});
/* cache key: cparchives:resourceloader:filter:minify-js:7:a5c52c063dc436c1ca7c9f456936a5e9 */
}</script>
<script>if(window.mw){
mw.loader.load(["mediawiki.page.startup","mediawiki.legacy.wikibits","mediawiki.legacy.ajax","skins.vector.js"]);
}</script><script src="/w/load.php?debug=false&amp;lang=en&amp;modules=jquery.accessKeyLabel%2Cclient%2CmwExtension%2CtabIndex%2Cthrottle-debounce%7Cmediawiki.legacy.ajax%2Cwikibits%7Cmediawiki.notify%2Cutil%7Cmediawiki.page.startup%7Cskins.vector.js&amp;skin=vector&amp;version=20240816T202117Z&amp;*"></script>
<!--[if lt IE 7]><style type="text/css">body{behavior:url("/w/skins/Vector/csshover.min.htc")}</style><![endif]-->
<script>
function hideNav() {
    document.getElementById("mw-panel-toc").style.display = "none";
}
</script>
</head>
        `;
    }

    getHeader(truePageName) {
        return `
<div id="mw-head">
  <div id="p-personal" role="navigation" class="" aria-labelledby="p-personal-label">
    <h3 id="p-personal-label">Personal tools</h3>
    <ul>
    </ul>
  </div>
  <div id="left-navigation">
    <div id="p-namespaces" role="navigation" class="vectorTabs" aria-labelledby="p-namespaces-label">
      <h3 id="p-namespaces-label">Namespaces</h3>
      <ul>
        <li id="ca-nstab-main" class="selected">
          <span>
            <a href="/wiki/${truePageName}" title="View the content page [alt-shift-c]" accesskey="c">Page</a>
          </span>
        </li>
        <li id="ca-talk">
          <span>
            <a href="/wiki/Talk:${truePageName}" title="Discussion about the content page [alt-shift-t]" accesskey="t">Discussion</a>
          </span>
        </li>
      </ul>
    </div>
    <div id="p-variants" role="navigation" class="vectorMenu emptyPortlet" aria-labelledby="p-variants-label">
      <h3 id="p-variants-label" tabindex="0">
        <span>Variants</span>
        <a href="#" tabindex="-1"></a>
      </h3>
      <div class="menu">
        <ul></ul>
      </div>
    </div>
  </div>
  <div id="right-navigation">
    <div id="p-views" role="navigation" class="vectorTabs" aria-labelledby="p-views-label">
      <h3 id="p-views-label">Views</h3>
      <ul>
        <li id="ca-view" class="selected">
          <span>
            <a href="/wiki/Zootopia_Party">Read</a>
          </span>
        </li>
        <li id="ca-viewsource"><span><a href="https://raw.githubusercontent.com/sky-is-winning/cparchives/master/data/${truePageName}.wikitext" title="View page source" accesskey="v">View source</a></span></li>
        <li id="ca-edit"><span><a href="https://github.com/sky-is-winning/cparchives/edit/master/data/${truePageName}.wikitext" title="Suggest page edit" accesskey="e">Suggest edit</a></span></li>
      </ul>
    </div>
    
    <div id="p-search" role="search">
      <h3>
        <label for="searchInput">Search</label>
      </h3>
      <form action="/w/index.php" id="searchform">
        <div id="simpleSearch">
          <input type="search" name="search" placeholder="Search" title="Search Club Penguin Archives [alt-shift-f]" accesskey="f" id="searchInput" tabindex="1" autocomplete="off">
          <input type="hidden" value="Special:Search" name="title">
          <input type="submit" name="go" value="Go" title="Go to a page with this exact name if exists" id="searchButton" class="searchButton">
        </div>
      </form>
    </div>
  </div>
</div>
    `;
    }

    getNavPanel() {
        return `
        <div id="mw-panel">
				<div id="p-logo" role="banner"><a class="mw-wiki-logo" href="/wiki/Main_Page" title="Visit the main page"></a></div>
						<div class="portal" role="navigation" id="p-navigation" aria-labelledby="p-navigation-label">
			<h3 id="p-navigation-label">Navigation</h3>

			<div class="body">
									<ul>
													<li id="n-mainpage-description"><a href="/wiki/Main_Page" title="Visit the main page [alt-shift-z]" accesskey="z">Main page</a></li>
													<li id="n-recentchanges"><a href="/wiki/Special:RecentChanges" title="A list of recent changes in the wiki [alt-shift-r]" accesskey="r">Recent changes</a></li>
													<li id="n-randompage"><a href="/wiki/Special:Random" title="Load a random page [alt-shift-x]" accesskey="x">Random page</a></li>
													<li id="n-help"><a href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Contents" title="The place to find out">Help</a></li>
											</ul>
							</div>
		</div>
			<div class="portal" role="navigation" id="p-tb" aria-labelledby="p-tb-label">
			<h3 id="p-tb-label">Tools</h3>

			<div class="body">
									<ul>
													<li id="t-whatlinkshere"><a href="/wiki/Special:WhatLinksHere/Zootopia_Party" title="A list of all wiki pages that link here [alt-shift-j]" accesskey="j">What links here</a></li>
													<li id="t-recentchangeslinked"><a href="/wiki/Special:RecentChangesLinked/Zootopia_Party" title="Recent changes in pages linked from this page [alt-shift-k]" accesskey="k">Related changes</a></li>
													<li id="t-specialpages"><a href="/wiki/Special:SpecialPages" title="A list of all special pages [alt-shift-q]" accesskey="q">Special pages</a></li>
													<li id="t-print"><a href="/w/index.php?title=Zootopia_Party&amp;printable=yes" rel="alternate" title="Printable version of this page [alt-shift-p]" accesskey="p">Printable version</a></li>
													<li id="t-permalink"><a href="/w/index.php?title=Zootopia_Party&amp;oldid=85661" title="Permanent link to this revision of the page">Permanent link</a></li>
													<li id="t-info"><a href="/w/index.php?title=Zootopia_Party&amp;action=info" title="More information about this page">Page information</a></li>
											</ul>
							</div>
		</div>
				</div>
                `;
    }

    getSiteNotice() {
        return `
        <div class="vector-sitenotice-container">
            <div id="siteNotice"></div>
        </div>
        `;
    }

    getNavigation(wt) {
        let headers = [];
        let nav = `
    <div id="toc" class="toc"><div id="toctitle"><h2>Contents</h2><span class="toctoggle">&nbsp;[<a href="#" id="togglelink">hide</a>]&nbsp;</span></div><ul><ul>
    `;

        let h2Count = 0;
        let h3Count = 0;
        let currentH2Index = 0;

        for (let line of wt.split("\n")) {
            if (line.startsWith("===")) {  // h3
                h3Count++;
                let header = line.replace(/=/g, "").trim();
                headers.push({ level: 3, text: header });
                let headerId = header.replace(/ /g, "_");
                nav += `
            <li class="toclevel-2 tocsection-${currentH2Index}.${h3Count}"><a href="#${headerId}"><span class="tocnumber">${currentH2Index}.${h3Count}</span> <span class="toctext">${header}</span></a></li>
            `;
            } else if (line.startsWith("==")) {  // h2
                h2Count++;
                let header = line.replace(/=/g, "").trim();
                headers.push({ level: 2, text: header });
                let headerId = header.replace(/ /g, "_");
                nav += `
            </ul><li class="toclevel-1 tocsection-${h2Count}"><a href="#${headerId}"><span class="tocnumber">${h2Count}</span> <span class="toctext">${header}</span></a><ul>
            `;
                currentH2Index = h2Count;
            }
        }

        // Close any remaining open tags
        nav += `
        </ul>
        </li>
        </ul>
        </div>
    `;

        return { "nav": nav.trim(), "headers": headers };
    }

    getFooter() {
        return `
        <div id="footer" role="contentinfo">
							<ul id="footer-info">
<li id="footer-info-lastmod"> This site is a mirror of the original Club Penguin Archives Wiki. Hosted and maintained by <a href="https://github.com/sky-is-winning/">sky</a>.</li>
</ul>
<ul id="footer-places">
<li id="footer-places-coffee"><a href="https://buymeacoffee.com/sky.is.winning">Buy me a coffee &lt;3</a></li>
<li id="footer-spacer">&nbsp;</li>
<li id="footer-places-repo"><a href="https://github.com/sky-is-winning/cparchives">View source on GitHub</a></li>
</ul>
<ul id="footer-icons" class="noprint"></ul>
						<div style="clear:both"></div>
		</div>
`;
    }

    getPageContainer(wt, pageName) {
        let pageContainer = "";
        pageContainer += `<div id="mw-page-base" class="noprint"></div>`;
        pageContainer += `<div id="mw-head-base" class="noprint"></div>`;
        pageContainer += `<div id="content" class="mw-body" role="main">`;
        pageContainer += this.getSiteNotice();
        return pageContainer;
    }

    getFileURI(file) {
        let md5hash = CryptoJS.MD5(file).toString();
        return `/static/images/archives/${md5hash[0]}/${md5hash[0]}${md5hash[1]}/${file}`;
    }

    async getContentFromWikiText(wt, pageName) {
        let content = "";
        let inTable = false;
        let inTemplate = false;
        let tableLines = "";
        let templateLines = "";
        let hadFirstHeading = false;
        for (let line of wt.split("\n")) {
            line = line.trim();
            if (inTable) {
                tableLines += `\n${line}`;
                if (line.endsWith("|}")) {
                    inTable = false;
                    let wikitable = await this.templateGenerator.generateWikitable(tableLines);
                    content += wikitable;
                    tableLines = "";
                }
            } else if (inTemplate) {
                templateLines += `\n${line}`;
                if (line.endsWith("}}")) {
                    inTemplate = false;
                    let template = await this.templateGenerator.generateTemplate(templateLines);
                    content += template;
                    templateLines = "";
                }
            } else {
                if (line.startsWith(`{|`)) {
                    inTable = true;
                    tableLines += line;
                    continue;
                } else if (line.startsWith(`{{`) && !line.startsWith("{{#") && !line.includes("}}")) {
                    inTemplate = true;
                    templateLines += line.replace("{{", "");
                    continue;
                } else if (line.startsWith("===")) {
                    if (!hadFirstHeading) {
                        hadFirstHeading = true;
                        const nav = this.getNavigation(wt);
                        if ((nav.headers.length > 3 && !wt.includes("__NOTOC__")) || wt.includes("__FORCETOC__")) {
                            if (content.includes("__TOC__")) {
                                content = content.replace("__TOC__", nav.nav);
                            } else if (wt.includes("__TOC__")) {
                                wt = wt.replace("__TOC__", nav.nav);
                            } else {
                                content += nav.nav;
                            }
                        }
                    }
                    content += `<h3 id="${line.replace(/ /g, "_").replace(/=/g, "").trim()}">${line.replace(/=/g, "").trim()}</h3>`;
                } else if (line.startsWith("==")) {
                    if (!hadFirstHeading) {
                        hadFirstHeading = true;
                        const nav = this.getNavigation(wt);
                        if ((nav.headers.length > 3 && !wt.includes("__NOTOC__")) || wt.includes("__FORCETOC__")) {
                            if (content.includes("__TOC__")) {
                                content = content.replace("__TOC__", nav.nav);
                            } else if (wt.includes("__TOC__")) {
                                wt = wt.replace("__TOC__", nav.nav);
                            } else {
                                content += nav.nav;
                            }
                        }
                        
                    }
                    content += `<h2 id="${line.replace(/ /g, "_").replace(/=/g, "").trim()}">${line.replace(/=/g, "").trim()}</h2>`;
                } else {
                    const templateRegex = /\{\{(?!#)([^{}]*?)\}\}(?!\})/g;
                    let match;
                    while ((match = templateRegex.exec(line)) !== null) {
                        const replacement = await this.getTemplate(match[1], pageName);
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
                                return this.templateGenerator.getMWImageElement(match);
                            }
                            if (urlText.startsWith("Media:")) {
                                return `<a href="${this.getFileURI(urlText.split(":")[1])}" title="${url}">${text}</a>`;
                            }
                            for (const interwikiLink of INTERWIKI_LINKS) {
                                if (urlText.startsWith(interwikiLink[0])) {
                                    return `<a href="${interwikiLink[1].replace("$1", urlText.split(":")[1])}" title="${url}">${text}</a>`;
                                }
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

                    content += line;
                }
            }
        }
        return content;
    }

    async getContentContainer(wt, pageName) {
        let contentContainer = "";
        if (pageName !== "Main Page")
            contentContainer += `
        <header class="mw-body-header vector-page-titlebar">
                    <h1 id="firstHeading" class="firstHeading mw-first-heading">
                        <span class="mw-page-title-main">${pageName}</span>
                    </h1>
                </header>
        `;
        contentContainer += `
        <div id="bodyContent" class="mw-body-content">
									<div id="siteSub">From Club Penguin Archives</div>
								<div id="contentSub"></div>
												<div id="jump-to-nav" class="mw-jump">
					Jump to:					<a href="#mw-head">navigation</a>, 					<a href="#p-search">search</a>
				</div>
				<div id="mw-content-text" lang="en" dir="ltr" class="mw-content-ltr">
                `;
        contentContainer += pageName.startsWith("templates/") ? await this.getTemplate(pageName.split("templates/")[1], pageName, true) : await this.getContentFromWikiText(wt, pageName);
        contentContainer += `</div></main>`;
        contentContainer += `</div></div></div>`;
        return contentContainer;
    }

    async getWikiText(title) {
        let wikitext;

        if (title.includes("templates/")) {
            title = title.replace("templates/", "");
            return `{{${title}}}`;
        }

        try {
            wikitext = await fs.readFile(`./data/${title}.wikitext`, "utf-8");
        } catch (error) {
            wikitext = await fs.readFile(`./data/404.wikitext`, "utf-8");
        }

        this.wikitextCache.set(title, wikitext);
        return wikitext;
    }

    async getBody(page, pageName, truePageName) {
        let wt = await this.getWikiText(page);
        let body = "";
        body += this.getPageContainer(wt, pageName);
        body += await this.getContentContainer(wt, pageName);
        body += `<div id="mw-navigation">`
        body += this.getHeader(truePageName);
        body += this.getNavPanel();
        body += `</div></div>`;
        body += this.getFooter();
        body += `</div>`;
        body = body.replaceAll("__NOTOC__", "").replaceAll("__FORCETOC__", "").replaceAll("__TOC__", "");
        return body;
    }

    async getTemplate(template, pageName, bypassNoInclude = false) {
        if (template == "BASEPAGENAME") {
            return pageName;
        }
        return await this.templateGenerator.generateTemplate(template, bypassNoInclude);
    }
}
