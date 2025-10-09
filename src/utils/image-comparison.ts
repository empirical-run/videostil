import pixelmatch from "pixelmatch";
import sharp from "sharp";

const PIXELMATCH_THRESHOLD = 0.1;

export async function compareImageBuffers(
  buffer1: Buffer,
  buffer2: Buffer,
  pixelmatchThreshold: number,
): Promise<{ diffPixels: number; totalPixels: number; diffFraction: number }> {
  const metadata1 = await sharp(buffer1).metadata();
  const metadata2 = await sharp(buffer2).metadata();

  const width = metadata1.width || 0;
  const height = metadata1.height || 0;

  if (width !== (metadata2.width || 0) || height !== (metadata2.height || 0)) {
    throw new Error("Images must have the same dimensions for comparison");
  }

  const { data: data1 } = await sharp(buffer1)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: data2 } = await sharp(buffer2)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const diffPixels = pixelmatch(data1, data2, null, width, height, {
    threshold: pixelmatchThreshold,
  });

  const totalPixels = width * height;
  const diffFraction = diffPixels / totalPixels;

  return { diffPixels, totalPixels, diffFraction };
}

export async function areImagesDuplicate(
  buffer1: Buffer,
  buffer2: Buffer,
  threshold: number,
): Promise<boolean> {
  try {
    const { diffFraction } = await compareImageBuffers(
      buffer1,
      buffer2,
      PIXELMATCH_THRESHOLD,
    );
    return diffFraction <= threshold;
  } catch (error) {
    console.error("Error comparing images for duplication:", error);
    return false;
  }
}
