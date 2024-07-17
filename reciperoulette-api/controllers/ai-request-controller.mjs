import OpenAI from "openai"
import { config } from "dotenv"

config()

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const generateRecipe = async (req, res) => {
    const { ingredients, prepTime, caloricApport, cuisineEthnicity, preferences, difficulty } = req.body
    console.log(preferences, caloricApport, prepTime,cuisineEthnicity, difficulty)
    if (!ingredients || !prepTime || !caloricApport || !cuisineEthnicity || !difficulty) {
        return res.status(400).json({ error: "Some required parameters are missing" })
    }

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: `you are a helpful assistant designed to output JSON` },
                {
                    role: "user",
                    content: `make an array of objects containing meals I can prepare with:
                    -all of these ingredients: ${ingredients}, 
                    -a maximum preparation time of ${prepTime} minutes,
                    -with a meximum of ${caloricApport} calories,
                    -follow these preferences ${preferences},
                    -the max preparation difficulty level should be ${difficulty}
                    -each meals should be inspired by one of these cuisines ${cuisineEthnicity}. 
                    -assume that all ingredients are not cooked yet,
                    -quantities should be for 4 servings,
                    -The objects should have this props and format:
                        {
                            id: n, //8 digit number: MUST be RANDOMLY generated! 
                            title: "Greek Spanakopita (Spinach Pie)",
                            attributes: [ /*first latter upper case*/
                                "Easy", // difficulty
                                "Appetizer", // type of dish
                                "60m", //prep time
                                "4 servings", // n of servings
                            ],
                            ingredients: ["spinach", "onion" /*other ingredients...*/],
                            ingQuantities: [
                                "500g fresh spinach, chopped",
                                "200g onion, chopped",
                                //other ingredient quantities...
                            ],
                            preparation: [
                                ["steps 1 title:", "detailed sub step 1", "other steps..."],
                                ["step 2 title", "detailed sub step 1", "other steps"],
                                //other arrays of steps and substeps
                            ],
                            isFavorited: false,
                            isVegan: false,
                            isGlutenFree: false,
                            isVegetarian: true,
                            cuisineEthnicity: "Greek",
                            caloricApport: 280,
                            preparationTime: 60,
                            difficulty: easy // hard /medium /easy
                        }
                    `,
                },
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        })
        console.log(completion.choices[0].message.content)
        return res.json(completion.choices[0].message.content)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "An error occurred while processing your request" })
    }
}

export { generateRecipe }
