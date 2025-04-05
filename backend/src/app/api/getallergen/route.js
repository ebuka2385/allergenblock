import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


//Extract base64 format from image and process it with Gemini
export async function POST(request){
    try{
        const image = await request.json();

        if(!image.image){
            return NextResponse.json(
                {error: "No image provided"},
                {status: 400}
            )
        }
        const base64Image = await image.image.split(",")[1];

        const result = await processImage(base64Image);

        return NextResponse.json({
            message: "success",
            body: result
        })

    }
    catch(error){
        console.log("[POST/allergen] Request failed", error);
        return NextResponse.json(
            {message: "error"}, 
            {status: 500}
        );
    };
};

//Ensuring API key loads properly and initialization of AI model
if(!process.env.GEMINI_API_KEY){
    throw new Error("GEMINI_API_KEY not found in environment variables")
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model:"gemini-1.5-flash"});


async function processImage(base64Image) {
    try{
        if(!base64Image) throw new Error("No image provided");

        const response = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    {
                        text: `Analyze the attached image of a restaurant menu.  
                            Return a JSON array of food items, where each item has two fields: 
                            "name": the name of the menu item
                            "allergens": an array of allergens found in the item
                            Format each item like this:
                            {
                                "name": "Grilled Chicken",
                                "allergens": ["gluten", "dairy"]
                            }
                            If ingredients are not listed, infer general knowledge for allergens, If still no allergens found return empty array.
                            There should be no markdowns and it should be plain text`,
                    }, 
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }]
            }]
        })

        // Extract Gemini response and parse the JSON data safely
        const rawText = await response.response.text();
        const cleanText = rawText.replace(/```json|```/g, '').trim();

        try{
            const allergenData = JSON.parse(cleanText);
            if(!allergenData) throw new Error("Could not generate json form of allergen")

            console.log(allergenData)
            return allergenData;
        }

        //Error if problem with JSON/file parsing
        catch(error){
            console.log("Error in processing:", error)
            return{
                error: true,
                message: "Error in processing file"
            }
        }
    }

    // Error if problem with Gemini
    catch(error){
        console.log("Error in Gemini", error);
        return{
            error: true,
            message: "Gemini failed"
        }
    }
}
