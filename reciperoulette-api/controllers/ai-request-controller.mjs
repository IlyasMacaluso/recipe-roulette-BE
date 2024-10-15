import OpenAI from "openai";
import { config } from "dotenv";

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateRecipe = async (req, res) => {
  const {
    ingredients,
    prep_time,
    caloric_apport,
    cuisine_ethnicity,
    preferences,
    difficulty,
  } = req.body;

  if (
    !ingredients ||
    !prep_time ||
    !caloric_apport ||
    !cuisine_ethnicity ||
    !difficulty
  ) {
    return res
      .status(400)
      .json({ error: "Missing required parameters" });
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `you are a helpful assistant designed to output JSON of fancy recipes`,
        },
        {
          role: "user",
          content: `make an array of objects containing meals I can prepare with:
                    -all of these ingredients: ${ingredients},
                    -a maximum preparation time of ${prep_time} minutes,
                    -with a meximum of ${caloric_apport} calories,
                    -follow these preferences ${preferences},
                    -the max preparation difficulty level should be ${difficulty}
                    -each meals should be inspired by one of these cuisines ${cuisine_ethnicity}.
                    -assume that all ingredients are not cooked yet,
                    -quantities should be for 4 servings,
                    -The objects should have this props and format:
                        {
                            recipe_id: n, //8 digit number: MUST be RANDOMLY generated!
                            title: "Greek Spanakopita (Spinach Pie)",
                            attributes: [ /*first latter upper case*/
                                "Easy", // difficulty
                                "Appetizer", // type of dish
                                "60m", //prep time
                                "4 Servings",
                            ],
                            ingredients: ["spinach", "onion" /*other ingredients...*/],
                            ing_quantities: [
                                "500g fresh spinach, chopped",
                                "200g onion, chopped",
                                //other ingredient quantities...
                            ],
                            preparation: [
                                ["steps 1 title:", "detailed sub step 1", "other steps..."],
                                ["step 2 title", "detailed sub step 1", "other steps"],
                                //other arrays of steps and substeps
                            ],
                            is_favorited: false,
                            is_gluten_free: bool,
                            is_vegetarian: bool,
                            is_vegan: bool,
                            cuisine_ethnicity: "Greek",
                            caloric_apport: 280,
                            preparation_time: 60,
                            difficulty: easy // hard /medium /easy
                        }
                    `,
        },
      ],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });
    console.log(completion.choices[0].message.content);
    
    return res.json(completion.choices[0].message.content);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
};

export { generateRecipe };
