#!/usr/bin/env node

import EPUBMagazineGenerator from './epub_generator.js';

class KindleEPUBMagazineGenerator extends EPUBMagazineGenerator {
    constructor(kindleOptimized) {
        super();
        this.kindleOptimized = kindleOptimized !== undefined ? kindleOptimized : true;
    }

    // Returns the appropriate CSS file name based on kindleOptimized setting
    getCSSFileName() {
        return this.kindleOptimized ? "kindle_epub_styles.css" : "epub_styles.css";
    }

    // Get default CSS if the file is not found
    getDefaultCSS() {
        return `
        body {
            font-family: "Bookerly", "Palatino", "Georgia", "Times New Roman", serif;
            font-size: 1em;
            line-height: 1.5;
            color: #000000;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0.75em 0.75em 1em 0.75em;
        }

        h1, h2, h3, h4, h5, h6 {
            color: #000000;
            font-weight: bold;
            margin-top: 1.2em;
            margin-bottom: 0.6em;
        }

        p {
            margin-top: 0;
            margin-bottom: 0.75em;
        }

        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0.5em auto;
        }

        .cover {
            text-align: center;
            padding-top: 20%;
            padding-left: 1em;
            padding-right: 1em;
            padding-bottom: 1em;
            background-color: #FFFFFF;
            color: #000000;
        }

        .magazine-title {
            font-size: 1.8em;
            font-weight: bold;
            margin-bottom: 0.8em;
        }

        .subtitle {
            font-size: 1.1em;
            margin-bottom: 1.2em;
        }
        `;
    }
}

// Export for use as a module
export default KindleEPUBMagazineGenerator;