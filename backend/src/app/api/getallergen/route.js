import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


//Extract base64 format from image and process it with Gemini
//also takes in restaurantName, latitude and longitude to store in database.
export async function POST(request){
    try{
        const {image, restaurantName, latitude, longitude, source } = await request.json();

        if(!image || !restaurantName || latitude == undefined || longitude==undefined || !source){
            return NextResponse.json(
                {error: "Missing required fields (image, restaurantName, latitude, longitude, source)"},
                {status: 400}
            )
        }

        const base64Image = await image.split(",")[1];
        const result = await processImage(base64Image);

        return NextResponse.json({
            success: true,
            message: 'Menu captured successfully',
            restaurantName: restaurantName,
            location: {latitude,longitude},
            menu: result,
            source: source
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
                        text: `You are analyzing an image of a restaurant menu.
                                Your job is to extract each **menu item** as an object with two fields:
                                1. "name": the name of the menu item
                                2. "allergens": an array of allergens (like gluten, egg, soy, etc.)

                                Output must be a **valid JSON array** like:
                                [
                                    {
                                        "name": "Whopper",
                                        "allergens": ["gluten", "soy", "egg"],
                                        "certainty": 0.95
                                    },
                                    {
                                        "name": "French Fries",
                                        "allergens": [],
                                        "certainty": 0.7
                                    }
                                ]

                                Rules:
                                - If ingredients are visible, extract allergens from them and assign a high certainty
                                - If ingredients are not visible, use YOUR food knowledge of fast food items (like those from Burger King, McDonald's, Chick-fil-A) 
                                to infer allergens and assign a moderate certainty. Assign high certainty if very sure it includes those allergens.
                                - If you make an educated guess or are unsure, assign a lower certainty
                                - If you still can't infer allergens, return an empty array []
                                - Accuracy is critical for allergic individuals. Be as precise as possible.
                                - If there are any typos of general food items from the common restaurants then you can use your general knowledge to correct it,
                                (eg. use "Hamburger" for burger king if theres a processing error of "Hashburger" or "Hanburger")
                                - No markdown, no extra text — just raw JSON`,
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
