import { promises as fs } from "fs";

export default class GeneratePageData {
    constructor(webserver) {
        this.webserver = webserver;
        this.cache = new Map();
    }

    async generatePageData(page) {
        if (page.startsWith("/wiki/")) {
            page = page.replace("/wiki/", "/");
        }

        if (this.cache.has(page)) {
            console.log("Cache hit for", page);
            return this.cache.get(page);
        }

        let pageName = page.split("/").pop();
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
        for (const replacer of replacers) {
            pageName = pageName.replaceAll(replacer[1], replacer[0]);
        }
        pageName = pageName.replaceAll("_", " ");

        let headData = await this.getHeadData(page, pageName);
        let body = await this.getBody(page, pageName);

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
<title>${pageName} - Club Penguin Archives Wiki</title>
<script async="" src="https://analytics.wikitide.net/matomo.js"></script><script type="text/javascript">(function(){var className="client-js vector-feature-language-in-header-enabled vector-feature-language-in-main-page-header-disabled vector-feature-sticky-header-disabled vector-feature-page-tools-pinned-disabled vector-feature-toc-pinned-clientpref-1 vector-feature-main-menu-pinned-disabled vector-feature-limited-width-clientpref-1 vector-feature-limited-width-content-enabled vector-feature-zebra-design-disabled vector-feature-custom-font-size-clientpref-disabled vector-feature-client-preferences-disabled vector-feature-typography-survey-disabled vector-toc-available";var cookie=document.cookie.match(/(?:^|; )cparchiveswikimwclientpreferences=([^;]+)/);if(cookie){cookie[1].split('%2C').forEach(function(pref){className=className.replace(new RegExp('(^| )'+pref.replace(/-clientpref-\w+$|[^\w-]+/g,'')+'-clientpref-\\w+( |$)'),'$1'+pref+'$2');});}document.documentElement.className=className;}());RLCONF={"wgBreakFrames":false,"wgSeparatorTransformTable":["",""],"wgDigitTransformTable":["",
""],"wgDefaultDateFormat":"dmy","wgMonthNames":["","January","February","March","April","May","June","July","August","September","October","November","December"],"wgRequestId":"e94235174b30f05abf9ff0a5","wgCanonicalNamespace":"","wgCanonicalSpecialPageName":false,"wgNamespaceNumber":0,"wgPageName":"${pageName}","wgTitle":"${pageName}","wgCurRevisionId":49117,"wgRevisionId":49117,"wgArticleId":27525,"wgIsArticle":true,"wgIsRedirect":false,"wgAction":"view","wgUserName":null,"wgUserGroups":["*"],"wgCategories":[],"wgPageViewLanguage":"en","wgPageContentLanguage":"en","wgPageContentModel":"wikitext","wgRelevantPageName":"${pageName}","wgRelevantArticleId":27525,"wgIsProbablyEditable":false,"wgRelevantPageIsProbablyEditable":false,"wgRestrictionEdit":[],"wgRestrictionMove":[],"wgNoticeProject":"all","wgMFDisplayWikibaseDescriptions":{"search":false,"nearby":false,"watchlist":false,"tagline":false},"wgCheckUserClientHintsHeadersJsApi":["architecture","bitness","brands","fullVersionList","mobile",
"model","platform","platformVersion"],"wgIsMobile":false,"wgCentralAuthMobileDomain":false};RLSTATE={"skins.vector.user.styles":"ready","ext.globalCssJs.user.styles":"ready","site.styles":"ready","user.styles":"ready","skins.vector.user":"ready","ext.globalCssJs.user":"ready","user":"ready","user.options":"loading","codex-search-styles":"ready","skins.vector.styles":"ready","skins.vector.icons":"ready","ext.MobileDetect.nomobile":"ready","ext.DarkMode.styles":"ready"};RLPAGEMODULES=["site","mediawiki.page.ready","mediawiki.toc","skins.vector.js","ext.centralNotice.geoIP","ext.centralNotice.startUp","ext.checkUser.clientHints","ext.echo.centralauth","ext.eventLogging","ext.DarkMode","ext.urlShortener.toolbar","ext.centralauth.centralautologin","ext.purge"];</script>
<script type="text/javascript">(RLQ=window.RLQ||[]).push(function(){mw.loader.impl(function(){return["user.options@12s5i",function($,jQuery,require,module){mw.user.tokens.set({"patrolToken":"+\\","watchToken":"+\\","csrfToken":"+\\"});
}];});});</script>
<link rel="stylesheet" href="/w/load.php?lang=en&amp;modules=codex-search-styles%7Cext.DarkMode.styles%7Cext.MobileDetect.nomobile%7Cskins.vector.icons%2Cstyles&amp;only=styles&amp;skin=vector-2022">
<script async="" src="/w/load.php?lang=en&amp;modules=startup&amp;only=scripts&amp;raw=1&amp;skin=vector-2022" type="text/javascript"></script>
<meta name="ResourceLoaderDynamicStyles" content="">
<link rel="stylesheet" href="/w/load.php?lang=en&amp;modules=site.styles&amp;only=styles&amp;skin=vector-2022">
<meta name="generator" content="MediaWiki 1.41.0">
<meta name="referrer" content="origin">
<meta name="referrer" content="origin-when-cross-origin">
<meta name="robots" content="max-image-preview:standard">
<meta name="format-detection" content="telephone=no">
<meta name="twitter:site" content="">
<meta name="twitter:card" content="summary">
<meta name="viewport" content="width=1000">
<meta property="og:title" content="${pageName} - Club Penguin Archives Wiki">
<meta property="og:type" content="website">
<link rel="apple-touch-icon" href="/Wiki.png">
<link rel="icon" href="/favicon.ico">
<link rel="search" type="application/opensearchdescription+xml" href="/w/opensearch_desc.php" title="Club Penguin Archives Wiki (en)">
<link rel="EditURI" type="application/rsd+xml" href="/w/api.php?action=rsd">
<link rel="canonical" href="/wiki/${pageName}">
<link rel="alternate" type="application/atom+xml" title="Club Penguin Archives Wiki Atom feed" href="/wiki/Special:RecentChanges?feed=atom">
<link rel="dns-prefetch" href="https://meta.miraheze.org">
<meta property="og:title" content="${pageName}">
<meta property="og:site_name" content="Club Penguin Archives Wiki">
<meta property="og:url" content="/wiki/${pageName}">
<meta property="og:image" content="/Wiki.png">
<meta property="article:modified_time" content="2022-02-03T03:11:01Z">
<meta property="article:published_time" content="2022-02-03T03:11:01Z">
<script type="application/ld+json">{"@context":"http:\/\/schema.org","@type":"Article","name":"${pageName} - Club Penguin Archives Wiki","headline":"${pageName} - Club Penguin Archives Wiki","mainEntityOfPage":"${pageName}","identifier":"https:\/\/cparchives.miraheze.org\/wiki\/${pageName}","url":"https:\/\/cparchives.miraheze.org\/wiki\/${pageName}","dateModified":"2022-02-03T03:11:01Z","datePublished":"2022-02-03T03:11:01Z","image":{"@type":"ImageObject","url":"https:\/\/static.miraheze.org\/cparchiveswiki\/b\/bc\/Wiki.png"},"author":{"@type":"Organization","name":"Club Penguin Archives Wiki","url":"https:\/\/cparchives.miraheze.org","logo":{"@type":"ImageObject","url":"https:\/\/static.miraheze.org\/cparchiveswiki\/b\/bc\/Wiki.png","caption":"Club Penguin Archives Wiki"}},"publisher":{"@type":"Organization","name":"Club Penguin Archives Wiki","url":"https:\/\/cparchives.miraheze.org","logo":{"@type":"ImageObject","url":"https:\/\/static.miraheze.org\/cparchiveswiki\/b\/bc\/Wiki.png","caption":"Club Penguin Archives Wiki"}},"potentialAction":{"@type":"SearchAction","target":"https:\/\/cparchives.miraheze.org\/wiki\/Special:Search?search={search_term}","query-input":"required name=search_term"}}</script>
<link rel="dns-prefetch" href="//login.miraheze.org">
</head>
        `
    }

    getHeader() {
        return `
<div class="vector-header-container">
    <header class="vector-header mw-header">
        <div class="vector-header-start">
            <a href="/wiki/Main_Page" class="mw-logo">
                <img class="mw-logo-icon" src="/Wiki.png" alt="" aria-hidden="true" height="50" width="50">
                <span class="mw-logo-container">
                    <strong class="mw-logo-wordmark">Club Penguin Archives Wiki</strong>
                </span>
            </a>
        </div>
    </header>
</div>
    `
    }

    getSiteNotice() {
        return `
        <div class="vector-sitenotice-container">
            <div id="siteNotice"></div>
        </div>
        `
    }

    getNavigation(wt) {
        let headers = [];
        for (let line of wt.split("\n")) {
            if (line.startsWith("==")) {
                headers.push(line.replace(/=/g, "").trim());
            }
        }
        let nav = `
        <nav id="mw-panel-toc" role="navigation" aria-label="Contents" data-event-name="ui.sidebar-toc" class="mw-table-of-contents-container vector-toc-landmark vector-sticky-pinned-container">
        <div id="vector-toc-pinned-container" class="vector-pinned-container">
        <div id="vector-toc" class="vector-toc vector-pinnable-element">
        <div class="vector-pinnable-header vector-toc-pinnable-header vector-pinnable-header-pinned" data-feature-name="toc-pinned" data-pinnable-element-id="vector-toc">
                        <h2 class="vector-pinnable-header-label">Contents</h2>
                        <button class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-event-name="pinnable-header.vector-toc.pin">move to sidebar</button>
                        <button class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-event-name="pinnable-header.vector-toc.unpin">hide</button>
                    </div>
          <ul class="vector-toc-contents" id="mw-panel-toc-list">
          <li id="toc-mw-content-text" class="vector-toc-list-item vector-toc-level-1">
              <a href="#" class="vector-toc-link">
                <div class="vector-toc-text">Beginning</div>
              </a>
          </li>
        `
        for (let header of headers) {
            let headerId = header.replace(/ /g, "_");
            nav += `
            <li id="toc-${headerId}" class="vector-toc-list-item vector-toc-level-1 vector-toc-list-item-expanded">
              <a class="vector-toc-link" href="#${headerId}">
                <div class="vector-toc-text">
                  <span class="vector-toc-numb">1</span>${header}
                </div>
              </a>
              <ul id="toc-${headerId}-sublist" class="vector-toc-list"></ul>
            </li>
            `
        }
        nav += `</ul></div></div></nav>`
        return nav;
    }

    getPageContainer(wt) {
        let pageContainer = "";
        pageContainer += `<div class="mw-page-container">`;
        pageContainer += `<div class="mw-page-container-inner">`;
        pageContainer += this.getSiteNotice();
        pageContainer += this.getNavigation(wt);
        return pageContainer
    }

    getContentFromWikiText(wt) {
        let content = "";
        for (let line of wt.split("\n")) {
            if (line.startsWith("==")) {
                content += `<h2 id="${line.replace(/ /g, "_")}">${line.replace(/=/g, "").trim()}</h2>`;
            } else {
                if (line.startsWith("*")) {
                    line = `<li>${line.replace("*", "").trim()}</li>`;
                }

                let localLinkRegex = /\[\[(.*?)\]\]/g;
                line = line.replace(localLinkRegex, (match, p1) => {
                    if (p1.includes("|")) {
                        const [url, text] = p1.split("|");
                        const urlText = url.replace(/ /g, '_'); // Replace spaces with underscores for the URL
                        return `<a href="/wiki/${urlText}" title="${url}">${text}</a>`;
                    }
                    const urlText = p1.replace(/ /g, '_'); // Replace spaces with underscores for the URL
                    return `<a href="/wiki/${urlText}" title="${p1}">${p1}</a>`;
                });

                let externalLinkRegex = /\[(.*?)\]/g;
                line = line.replace(externalLinkRegex, (match, p1) => {
                    if (p1.includes(" ")) {
                        const url = p1.split(" ")[0];
                        const text = p1.split(" ").slice(1).join(" ");
                        return `<a href="${url}">${text}</a>`;
                    }
                    return `<a href="${p1}">${p1}</a>`;
                });

                line = line.replace(/'''(.*?)'''/g, "<strong>$1</strong>");
                line = line.replace(/''(.*?)''/g, "<i>$1</i>");

                content += line;
            }
        }
        return content;
    }

    getContentContainer(wt, pageName) {
        let contentContainer = "";
        contentContainer += `<div class="mw-content-container">`;
        contentContainer += `<main id="content" class="mw-body" role="main">`;
        contentContainer += `
        <header class="mw-body-header vector-page-titlebar">
                    <label id="vector-toc-collapsed-button" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet vector-button-flush-left cdx-button--icon-only" for="vector-toc-collapsed-checkbox" role="button" aria-controls="vector-toc" tabindex="0" title="Table of Contents">
                        <span class="vector-icon mw-ui-icon-wikimedia-listBullet"></span>
                        <span>Toggle the table of contents</span>
                    </label>
                    <nav role="navigation" aria-label="Contents" class="vector-toc-landmark">
                        <div id="vector-page-titlebar-toc" class="vector-dropdown vector-page-titlebar-toc vector-button-flush-left">
                            <input type="checkbox" id="vector-page-titlebar-toc-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-page-titlebar-toc" class="vector-dropdown-checkbox " aria-label="Toggle the table of contents">
                            <label id="vector-page-titlebar-toc-label" for="vector-page-titlebar-toc-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only " aria-hidden="true">
                                <span class="vector-icon mw-ui-icon-listBullet mw-ui-icon-wikimedia-listBullet"></span>
                                <span class="vector-dropdown-label-text">Toggle the table of contents</span>
                            </label>
                            <div class="vector-dropdown-content">
                                <div id="vector-page-titlebar-toc-unpinned-container" class="vector-unpinned-container"></div>
                            </div>
                        </div>
                    </nav>
                    <h1 id="firstHeading" class="firstHeading mw-first-heading">
                        <span class="mw-page-title-main">${pageName}</span>
                    </h1>
                </header>
        `;
        contentContainer += `
        <div class="vector-page-toolbar"></div>
                <div class="vector-column-end">
                    <nav class="vector-page-tools-landmark vector-sticky-pinned-container" aria-label="Page tools">
                        <div id="vector-page-tools-pinned-container" class="vector-pinned-container"></div>
                    </nav>
                </div>
                <div id="bodyContent" class="vector-body" aria-labelledby="firstHeading" data-mw-ve-target-container="">
                    <div class="vector-body-before-content">
                        <div class="mw-indicators"></div>
                        <div id="siteSub" class="noprint">From Club Penguin Archives Wiki</div>
                    </div>
                    <div id="contentSub">
                        <div id="mw-content-subtitle"></div>
                    </div>
                    <div id="mw-content-text" class="mw-body-content mw-content-ltr" lang="en" dir="ltr">
                        <div class="mw-parser-output">
                       <meta property="mw:PageProp/toc">
        `
        contentContainer += this.getContentFromWikiText(wt);
        contentContainer += `</div></main></div></div></div>`;
        return contentContainer;
    }

    async getWikiText(title) {
        return await fs.readFile(`./data/${title}.wikitext`, "utf-8")
    }

    async getBody(page, pageName) {
        let wt = await this.getWikiText(page);
        let body = "";
        body += this.getHeader();
        body += this.getPageContainer(wt);
        body += this.getContentContainer(wt, pageName);
        body += `</div></div>`;
        return body;
    }
}