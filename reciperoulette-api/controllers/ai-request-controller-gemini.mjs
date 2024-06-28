import { config } from "dotenv"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { response } from "express"

config()

const Gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = Gemini.getGenerativeModel({ model: "gemini-1.0-pro" })

const generateRecipe = async (req) => {
    try {
        const prompt = `Make an array of objects containing meals and image descriptions I can prepare with these ingredients: ${req.body}, and with this structure:
{
    id: 12345678, //randomly generated 8 digit number
    title: "Greek Spanakopita (Spinach Pie)",
    attributes: [
        "easy", // difficulty
        "appetizer", // type of dish
        "60m", //prep time
        "6 servings", // n of servings
    ],
    ingredients: ["spinach", "onion" /*other ingredients...*/],
    ingQuantities: [
        "500g fresh spinach, chopped",
        "200g onion, chopped",
        //other ingredient quantities...
    ],
    preparation: [
        [
            "Prepare spinach filling:", //step title
            "In a skillet, heat olive oil over medium heat. Saute chopped onion and minced garlic until softened.", //sub steps (can be more than one string)
        ],
        [
            "Add spinach:", //step title
            "Add chopped spinach and cook until wilted. Remove from heat and let cool.", // sub steps
        ],
        //other arrays of steps and substeps
    ],
    isFavorited: false,
    isVegan: false,
    isGlutenFree: false,
    isVegetarian: true,
    cuisineEthnicity: "Greek",
    caloricApport: 280,
    preparationTime: 60,
}
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        console.log(text)
    } catch (error) {
        console.log(error)
        response.status(500).json({ msg: "Something went wrong" })
    }
}

export { generateRecipe }
