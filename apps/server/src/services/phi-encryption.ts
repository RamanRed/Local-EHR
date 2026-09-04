import crypto from "crypto";

export class PHIEncryption {
    private static algorithm = "aes-256-cbc";
    // The key must be exactly 32 bytes for aes-256
    private static key = crypto.createHash('sha256').update(process.env.PHI_ENCRYPTION_KEY || "YOUR_STRONG_32_BYTE_SECRET_KEYYY").digest();

    /**
     * Encrypts a piece of PHI (Protected Health Information).
     * Generates a random initialization vector (IV) for each encryption,
     * making the output non-deterministic.
     */
    static encrypt(text: string | null | undefined): string | null {
        if (!text) return null;

        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            let encrypted = cipher.update(text, "utf8", "hex");
            encrypted += cipher.final("hex");

            // Format is IV:EncryptedData
            return `${iv.toString("hex")}:${encrypted}`;
        } catch (error) {
            console.error("Encryption failed:", error);
            throw new Error("Encryption failed");
        }
    }

    /**
     * Decrypts previously encrypted PHI.
     */
    static decrypt(encryptedText: string | null | undefined): string | null {
        if (!encryptedText) return null;

        try {
            // It might be a plain string if it wasn't encrypted right,
            // but in real world we'd ensure strict checking.
            const parts = encryptedText.split(":");
            if (parts.length !== 2) {
                // Return original text if it doesn't match our IV:Data pattern
                // (helpful when migrating existing unencrypted data).
                return encryptedText;
            }

            const iv = Buffer.from(parts[0], "hex");
            const encryptedData = parts[1];

            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            let decrypted = decipher.update(encryptedData, "hex", "utf8");
            decrypted += decipher.final("utf8");

            return decrypted;
        } catch (error) {
            console.error("Decryption failed:", error);
            // In production it's safer to not return the original string,
            // but if a string wasn't encrypted, decrypting fails.
            return encryptedText;
        }
    }

    /**
     * Generates a deterministic hash of an identifier (like SSN or Aadhaar)
     * for de-identified lookup purposes.
     */
    static hashIdentifier(identifier: string): string {
        return crypto.createHash("sha256").update(identifier).digest("hex");
    }
}
