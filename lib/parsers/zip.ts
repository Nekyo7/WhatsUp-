import JSZip from "jszip";
import { parseWhatsAppExport, type ParsedChatResult } from "./whatsapp";

const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB safety cap
const MAX_FILE_COUNT = 500; // Cap total files in archive to prevent zip bombs

/**
 * Extracts and parses a WhatsApp .zip export safely.
 * Detects _chat.txt or any primary .txt file in the archive,
 * counts attached media without loading them into memory, and applies zip-bomb guards.
 */
export async function parseWhatsAppZip(
  zipBuffer: ArrayBuffer | Uint8Array,
  zipFileName: string
): Promise<ParsedChatResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBuffer);

  const fileEntries = Object.keys(loadedZip.files);
  if (fileEntries.length > MAX_FILE_COUNT) {
    throw new Error(`Zip archive contains too many files (${fileEntries.length}). Maximum allowed is ${MAX_FILE_COUNT}.`);
  }

  let chatTxtFile: JSZip.JSZipObject | null = null;
  let chatTxtName = "";
  let mediaFileCount = 0;
  let totalUncompressedSize = 0;

  for (const relativePath of fileEntries) {
    // Path traversal check
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      throw new Error(`Suspicious path detected in zip archive: ${relativePath}`);
    }

    const lower = relativePath.toLowerCase();
    // Reject nested archives (zip bomb amplification vector)
    if (
      lower.endsWith(".zip") ||
      lower.endsWith(".tar") ||
      lower.endsWith(".gz") ||
      lower.endsWith(".7z") ||
      lower.endsWith(".rar")
    ) {
      throw new Error(`Nested archive detected in zip archive: ${relativePath}`);
    }

    const entry = loadedZip.files[relativePath];
    if (entry.dir) continue;

    // Check media file extension
    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".mp4") ||
      lower.endsWith(".opus") ||
      lower.endsWith(".m4a") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".pdf") ||
      lower.endsWith(".vcf")
    ) {
      mediaFileCount++;
    }

    // Locate _chat.txt (standard iOS) or any root .txt file
    if (lower.endsWith("_chat.txt") || lower.endsWith(".txt")) {
      if (!chatTxtFile || lower.endsWith("_chat.txt")) {
        chatTxtFile = entry;
        chatTxtName = relativePath;
      }
    }
  }

  if (!chatTxtFile) {
    throw new Error("No chat text file (_chat.txt or .txt) found inside the zip archive.");
  }

  const content = await chatTxtFile.async("string");
  totalUncompressedSize += content.length;

  if (totalUncompressedSize > MAX_UNCOMPRESSED_BYTES) {
    throw new Error("Uncompressed chat file exceeds maximum safe limit (50MB).");
  }

  const cleanTitle = zipFileName.replace(/\.zip$/i, "").replace(/^WhatsApp Chat - /i, "");
  const parsed = parseWhatsAppExport(content, cleanTitle || chatTxtName);

  if (parsed.report) {
    parsed.report.mediaCount += mediaFileCount;
    if (mediaFileCount > 0) {
      parsed.report.warnings.push(`${mediaFileCount} media attachments found in archive (omitted locally for privacy).`);
    }
  }

  return parsed;
}
