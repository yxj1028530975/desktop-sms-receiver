const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const toIco = require("to-ico");

const assetDir = path.join(__dirname, "../assets");
const svgPath = path.join(assetDir, "app-icon.svg");
const pngPath = path.join(assetDir, "app-icon.png");
const icoPath = path.join(assetDir, "app-icon.ico");
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
    const svg = fs.readFileSync(svgPath);

    await sharp(svg, { density: 1200 })
        .resize(512, 512)
        .png()
        .toFile(pngPath);

    const buffers = await Promise.all(
        icoSizes.map((size) =>
            sharp(svg, { density: 1200 })
                .resize(size, size)
                .png()
                .toBuffer(),
        ),
    );

    const icoBuffer = await toIco(buffers);
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`Generated ${path.basename(pngPath)} and ${path.basename(icoPath)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
