import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyD7h1MyO5tpBXB7FkPue2DxHlVKcAxmZS8";

async function main() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    const models = data.models.map(m => ({ name: m.name, methods: m.supportedGenerationMethods }));
    console.log(JSON.stringify(models, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
