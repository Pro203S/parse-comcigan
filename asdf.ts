import axios from "axios";
import { load } from 'cheerio';

function decodeHex(encoded: string, key: number = 100): string {
    if (encoded.length % 4 !== 0 || /[^0-9a-f]/i.test(encoded)) {
        throw new Error("Expected a hexadecimal string in groups of four characters");
    }

    let decoded = "";

    for (let offset = 0; offset < encoded.length; offset += 4) {
        const value = parseInt(encoded.slice(offset, offset + 4), 16);
        const mask = (key + (offset / 4) * 13) & 255;
        decoded += String.fromCharCode(value ^ mask);
    }

    return decoded;
}

const obfuscatedScriptRegex = /\}\)\(\[\[0,\s*"([0-9a-f]+)"\]\],\s*(\d+)\s*\)\s*;?\s*$/i;

function extractHourAjaxScripts(source: string): string[] {
    const pattern =
        /\/\*\s*hour-ajax-obfuscated-v1\s*\*\/[\s\S]*?\}\)\(\[\[0,\s*"([0-9a-f]+)"\]\],\s*(\d+)\s*\)\s*;?/gi;

    return Array.from(source.matchAll(pattern), match =>
        decodeHex(match[1]!, Number(match[2]))
    );
}

(async () => {
    const r = await axios("http://comci.net:4082/st");
    const $ = load(r.data);

    const scripts = $("script").map(function () { return $(this).text(); }).get();

    const tokenscript = scripts.find(v => v.toLowerCase().includes("token"));
    if (!tokenscript) throw new Error("tokenscript not found");

    const token = tokenscript.split("=")[1].replaceAll("'", "").replaceAll(";", "");

    const obfuscateds = scripts.filter(v => v.includes("hour-obfuscated-v2"));

    const script = obfuscateds[0]
    const match = script.match(obfuscatedScriptRegex);

    if (!match) throw new Error("인코딩된 문자열과 키를 찾을 수 없습니다.");

    const decoded = decodeHex(match[1]!, Number(match[2]));
    console.log(extractHourAjaxScripts(decoded));
})();
