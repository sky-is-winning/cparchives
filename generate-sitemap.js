import fs from "fs/promises";
import path from "path";

async function getFiles(dir) {
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const dirent of list) {
        const filePath = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            const res = await getFiles(filePath);
            results = results.concat(res);
        } else {
            results.push(filePath);
        }
    }

    return results;
}

async function createSitemap(dir, baseURL) {
    try {
        const files = await getFiles(dir);
        const sitemap = await Promise.all(
            files.map(async (file) => {
                const stats = await fs.stat(file);
                return {
                    loc: new URL(path.relative(dir, file).replace(/\\/g, "/"), baseURL).href,
                    lastmod: stats.mtime.toISOString()
                };
            })
        );

        const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${sitemap
            .map(
                (entry) => `
            <url>
                <loc>${entry.loc}</loc>
                <lastmod>${entry.lastmod}</lastmod>
            </url>
        `
            )
            .join("")}
    </urlset>`;

        await fs.writeFile("archives.clubpenguinwiki.info/sitemap.xml", sitemapXML);
        console.log("Sitemap created successfully!");
    } catch (err) {
        console.error("Error creating sitemap:", err);
    }
}

createSitemap("archives.clubpenguinwiki.info", "https://archives.skyiswinni.ng/");
