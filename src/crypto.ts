import { createDecipheriv, createHash, createHmac, timingSafeEqual } from "node:crypto";
import ComciganError from "./error.js";

// 컴시간 학생용 웹페이지에서 사용하는 응답 복호화 키입니다.
const KEY = Buffer.from("6f428ea903c751d0b82f649d1e703ac5d4892fb601e8c347a5d09b2cf316784e", "hex");
const MAC_KEY = createHash("sha256").update(KEY).digest();

export function decryptResponse(data: string): string {
    data = data.replace(/\x00+$/, "");
    if (!data.startsWith("enc1:") && !data.startsWith("enc2:")) return data;

    const parts = data.split(":");
    if (parts.length !== 4) throw new ComciganError("암호화된 응답 형식이 올바르지 않아요.");

    const encoding = parts[0] === "enc2" ? "base64" : "hex";
    const pattern = encoding === "base64"
        ? /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
        : /^(?:[0-9a-f]{2})+$/;
    const binary = parts.slice(1).map(part => {
        const bytes = Buffer.from(part, encoding);
        if (!part || !pattern.test(part) || bytes.toString(encoding) !== part) {
            throw new ComciganError("암호화된 응답 인코딩이 올바르지 않아요.");
        }
        return bytes;
    });
    const [iv, ciphertext, tag] = binary;
    if (iv.length !== 16 || tag.length !== 32 || ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
        throw new ComciganError("암호화된 응답 크기가 올바르지 않아요.");
    }

    const expected = createHmac("sha256", MAC_KEY).update(parts.slice(0, 3).join(":")).digest();
    if (!timingSafeEqual(expected, tag)) throw new ComciganError("응답 무결성 검증에 실패했어요.");

    try {
        const decipher = createDecipheriv("aes-256-cbc", KEY, iv);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return new TextDecoder("utf-8", { fatal: true }).decode(plaintext).replace(/\x00+$/, "");
    } catch {
        throw new ComciganError("응답 복호화에 실패했어요.");
    }
}
