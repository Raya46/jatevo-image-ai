import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
if (!API_KEY) {
  console.warn(
    "API Key for Gemini is not set. Please create a .env file with EXPO_PUBLIC_GEMINI_API_KEY."
  );
}

interface ImageAsset {
  uri: string;
  width: number;
  height: number;
}

const uriToBase64 = async (uri: string): Promise<string> => {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

const resizeImageWithPadding = async (
  image: ImageAsset,
  targetDimension: number
): Promise<ImageAsset> => {
  const resized = await manipulateAsync(
    image.uri,
    [{ resize: { width: targetDimension, height: targetDimension } }],
    { format: SaveFormat.JPEG, compress: 0.95, base64: false }
  );
  return { uri: resized.uri, width: resized.width, height: resized.height };
};

const cropToOriginalAspectRatio = async (
  imageUri: string,
  originalWidth: number,
  originalHeight: number,
  targetDimension: number
): Promise<string> => {
  const aspectRatio = originalWidth / originalHeight;
  let contentWidth, contentHeight;

  if (aspectRatio > 1) {
    // Landscape
    contentWidth = targetDimension;
    contentHeight = targetDimension / aspectRatio;
  } else {
    // Portrait atau square
    contentHeight = targetDimension;
    contentWidth = targetDimension * aspectRatio;
  }

  const x = (targetDimension - contentWidth) / 2;
  const y = (targetDimension - contentHeight) / 2;

  const cropResult = await manipulateAsync(
    imageUri,
    [
      {
        crop: {
          originX: x,
          originY: y,
          width: contentWidth,
          height: contentHeight,
        },
      },
    ],
    { format: SaveFormat.JPEG, compress: 0.95 }
  );

  return cropResult.uri;
};

export const generateCompositeImage = async (
  objectImage: ImageAsset,
  environmentImage: ImageAsset,
  dropPosition: { xPercent: number; yPercent: number },
  onProgress?: (progress: number) => void
): Promise<{ finalImageUrl: string; finalPrompt: string }> => {
  const MAX_DIMENSION = 1024;

  onProgress?.(10); // Progress: 10% - Starting resize
  const resizedObjectImage = await resizeImageWithPadding(
    objectImage,
    MAX_DIMENSION
  );
  onProgress?.(25); // Progress: 25% - Object image resized
  const resizedEnvironmentImage = await resizeImageWithPadding(
    environmentImage,
    MAX_DIMENSION
  );
  onProgress?.(35); // Progress: 35% - Both images resized

  onProgress?.(40); // Progress: 40% - Starting semantic description
  const resizedEnvBase64 = await uriToBase64(resizedEnvironmentImage.uri);
  onProgress?.(45); // Progress: 45% - Base64 conversion complete

  // --- PERBAIKAN: Prompt yang jauh lebih detail untuk deskripsi lokasi ---
  const descriptionPrompt = `
You are an expert scene analyst. I will provide you with an image and a relative coordinate (x%, y%).
Your task is to provide a very dense, semantic description of what is at that exact location.
Be specific about surfaces, objects, and spatial relationships. This description will be used to guide another AI in placing a new object.

The location is at x=${dropPosition.xPercent.toFixed(1)}%, y=${dropPosition.yPercent.toFixed(1)}%.

Example semantic descriptions:
- "The product location is on the dark grey fabric of the sofa cushion, in the middle section, slightly to the left of the white throw pillow."
- "The product location is on the light-colored wooden floor, in the patch of sunlight coming from the window, about a foot away from the leg of the brown leather armchair."
- "The product location is on the white marble countertop, just to the right of the stainless steel sink and behind the green potted plant."

On top of the semantic description above, give a rough relative-to-image description.

Example relative-to-image descriptions:
- "The product location is about 10% away from the bottom-left of the image."
- "The product location is about 20% away from the right of the image."

Provide only the two descriptions concatenated in a few sentences.
`;

  let semanticLocationDescription = "";
  try {
    onProgress?.(50); // Progress: 50% - Sending semantic description request
    const descApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    const descResponse = await fetch(descApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: descriptionPrompt },
              {
                inlineData: { mimeType: "image/jpeg", data: resizedEnvBase64 },
              },
            ],
          },
        ],
      }),
    });
    if (!descResponse.ok) {
      const errorBody = await descResponse.text();
      console.error("Description model failed:", errorBody);
      throw new Error("Description model failed");
    }
    const descData = await descResponse.json();
    semanticLocationDescription = descData.candidates[0].content.parts[0].text;
    onProgress?.(60); // Progress: 60% - Semantic description generated
  } catch (error) {
    console.error("Failed to generate semantic description:", error);
    semanticLocationDescription = `at the specified location.`; // Fallback
  }

  // STEP 3: Hasilkan gambar komposit dengan prompt yang sudah diperkaya
  onProgress?.(65); // Progress: 65% - Preparing final generation
  const objectBase64 = await uriToBase64(resizedObjectImage.uri);
  onProgress?.(70); // Progress: 70% - Object base64 ready

  const finalPrompt = `
**Role:**
You are a visual composition expert. Your task is to take a 'product' image and seamlessly integrate it into a 'scene' image, adjusting for perspective, lighting, and scale.

**Specifications:**
-   **Product to add:**
    The first image provided. It may be surrounded by black padding or background, which you should ignore and treat as transparent and only keep the product.
-   **Scene to use:**
    The second image provided. It may also be surrounded by black padding, which you should ignore.
-   **Placement Instruction (Crucial):**
    -   You must place the product at the location described below exactly. You should only place the product once. Use this dense, semantic description to find the exact spot in the scene.
    -   **Product location Description:** "${semanticLocationDescription}"
-   **Final Image Requirements:**
    -   The output image's style, lighting, shadows, reflections, and camera perspective must exactly match the original scene.
    -   Do not just copy and paste the product. You must intelligently re-render it to fit the context. Adjust the product's perspective and orientation to its most natural position, scale it appropriately, and ensure it casts realistic shadows according to the scene's light sources.
    -   The product must have proportional realism. For example, a lamp product can't be bigger than a sofa in scene.
    -   You must not return the original scene image without product placement. The product must be always present in the composite image.

The output should ONLY be the final, composed image. Do not add any text or explanation.
`;

  const parts = [
    { inlineData: { mimeType: "image/jpeg", data: objectBase64 } },
    { inlineData: { mimeType: "image/jpeg", data: resizedEnvBase64 } }, // Gunakan kembali base64 dari scene
    { text: finalPrompt },
  ];

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${API_KEY}`;

  onProgress?.(75); // Progress: 75% - Sending final generation request
  const apiResponse = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!apiResponse.ok) {
    const errorBody = await apiResponse.text();
    console.error("API Error:", errorBody);
    throw new Error(`API request failed with status ${apiResponse.status}`);
  }

  const responseData = await apiResponse.json();
  onProgress?.(85); // Progress: 85% - Response received

  const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (imagePart?.inlineData) {
    const { data } = imagePart.inlineData;
    const tempUri = FileSystem.cacheDirectory + `generated_${Date.now()}.jpeg`;
    await FileSystem.writeAsStringAsync(tempUri, data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(90); // Progress: 90% - Processing final image
    const finalImageUri = await cropToOriginalAspectRatio(
      tempUri,
      environmentImage.width,
      environmentImage.height,
      MAX_DIMENSION
    );

    onProgress?.(95); // Progress: 95% - Final processing complete
    return { finalImageUrl: finalImageUri, finalPrompt: finalPrompt };
  }

  console.error("Model response did not contain an image part.", responseData);
  throw new Error("The AI model did not return an image. Please try again.");
};
