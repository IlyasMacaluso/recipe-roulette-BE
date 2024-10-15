import { db } from "../utils/DBhelpers.mjs"

const getBlacklist = async (req, res) => {
    try {
        const userId = req.params.userId

        if (!userId) {
            throw new Error("Missing required parameters")
        }

        const { blacklisted_ingredients } = await db.oneOrNone(`SELECT blacklisted_ingredients FROM preferences WHERE user_id=$1`, [userId])

        res.status(200).json(blacklisted_ingredients || [])
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const updateBlacklist = async (req, res) => {
    try {
        const { newBlacklist, userId } = req.body

        if (!newBlacklist || !userId) {
            return res.status(400).json({ msg: "Missing or invalid parameters" })
        }
        const blacklistJSON = JSON.stringify(newBlacklist)

        const blacklisted_ingredients = await db.one(
            `UPDATE preferences SET blacklisted_ingredients=$2 WHERE user_id=$1 RETURNING blacklisted_ingredients`,
            [userId, blacklistJSON]
        )

        return res.status(201).json({ msg: "Blacklist updated", blacklisted_ingredients })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const getFoodPref = async (req, res) => {
    try {
        const userId = req.params.userId

        if (!userId) {
            throw new Error("Missing required parameters")
        }

        const { preferences } = await db.oneOrNone(`SELECT preferences FROM preferences WHERE user_id=$1`, [userId])

        res.status(200).json(preferences)
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const updateFoodPref = async (req, res) => {
    try {
        const { newPreferences, userId } = req.body

        if (newPreferences && userId) {
            const { preferences } = await db.one(`UPDATE preferences SET preferences=$2 WHERE user_id=$1 RETURNING preferences`, [
                userId,
                newPreferences,
            ])
            return res.status(201).json({ msg: "Preferences updated successfully", preferences })
        } else {
            return res.status(400).json({ msg: "Missing required parameters" })
        }
    } catch (error) {
        console.error("Error:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const updateUserRecipes = async (req, res) => {
    try {
        const { recipe, userId } = req.body

        if (!userId || !recipe) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone(`SELECT username FROM users WHERE id=$1`, [userId])

        if (!user) {
            return res.status(400).json({ msg: "No such user" })
        }

        console.log(recipe)

        // begin the transaction if we have all the required parameters
        await db.tx(async (t) => {
            const isRecipeStored = await t.oneOrNone(`SELECT title FROM history WHERE user_id=$1 AND recipe_id=$2`, [
                userId,
                recipe.recipe_id,
            ])
            const isRecipeFavorited = recipe.is_favorited

            console.log(isRecipeStored)

            // Se la ricetta è già nel database, aggiorna solo la colonna is_favorited e favorited_at
            if (isRecipeStored) {
                await t.none(
                    `UPDATE history 
                    SET is_favorited=$1, favorited_at=$2, visited_at=NOW() 
                    WHERE recipe_id=$3 AND user_id=$4`,
                    [
                        isRecipeFavorited, // 1
                        isRecipeFavorited ? new Date() : null, // 2
                        recipe.recipe_id, // 3
                        userId, // 4
                    ]
                )
            } else {
                // Se non è nel database, aggiungila
                const preparationJson = JSON.stringify(recipe.preparation) // Convert the array of arrays to JSON
                await t.none(
                    `
                    INSERT INTO history (
                        user_id,
                        recipe_id,
                        title,
                        is_vegan,
                        attributes,
                        difficulty,
                        ingredients,
                        is_favorited,
                        preparation,
                        caloric_apport,
                        ing_quantities,
                        is_vegetarian,
                        is_gluten_free,
                        preparation_time,
                        cuisine_ethnicity,
                        visited_at,
                        favorited_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16
                    )`,
                    [
                        userId, // 1
                        recipe.recipe_id, // 2
                        recipe.title, // 3
                        recipe.is_vegan, // 4
                        recipe.attributes, // 5
                        recipe.difficulty, // 6
                        recipe.ingredients, // 7
                        recipe.is_favorited, // 8
                        preparationJson, // 9
                        recipe.caloric_apport, // 10
                        recipe.ing_quantities, // 11
                        recipe.is_vegetarian, // 12
                        recipe.is_gluten_free, // 13
                        recipe.preparation_time, // 14
                        recipe.cuisine_ethnicity, // 15
                        isRecipeFavorited ? new Date() : null, // 16
                    ]
                )
            }
        })

        return res.status(201).json({ msg: "Favorited updated" })
    } catch (error) {
        console.error("Error in updateUserRecipes:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const getHistory = async (req, res) => {
    try {
        const userId = req.params.userId

        // Controllo che userId sia presente
        if (!userId) {
            throw new Error("Missing required parameters")
        }

        // Recupero della cronologia delle ricette per l'utente
        const history = await db.manyOrNone(`SELECT * FROM history WHERE user_id=$1 ORDER BY visited_at DESC`, [userId])

        // Restituzione della cronologia come risposta
        res.status(200).json(history)
    } catch (error) {
        console.error("Error in getHistory:", error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const getFavorites = async (req, res) => {
    try {
        const userId = req.params.userId

        // Controllo che userId sia presente
        if (!userId) {
            throw new Error("Missing required parameters")
        }

        // Recupero delle ricette preferite per l'utente
        const favorites = await db.manyOrNone(`SELECT * FROM history WHERE user_id=$1 AND is_favorited=$2 ORDER BY visited_at DESC`, [
            userId,
            true,
        ])

        // Restituzione delle ricette preferite come risposta
        res.status(200).json(favorites)
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

// const updateRecipesHistory = async (req, res) => {
//     try {
//         const { recipe, userId } = req.body

//         if (!userId || !recipe) {
//             return res.status(400).json({ msg: "Missing required parameters" })
//         }

//         const user = await db.oneOrNone(`SELECT username FROM users WHERE id=$1`, [userId])
//         if (!user) {
//             return res.status(400).json({ msg: "User not found" })
//         }

//         await db.tx(async (t) => {
//             const result = await t.oneOrNone(`SELECT recipes_history FROM preferences WHERE user_id=$1 FOR UPDATE`, [userId])

//             let { recipes_history } = result || { recipes_history: [] }
//             const alreadyInHistory = recipes_history.some((rec) => `${rec.id}_${rec.title}` === `${recipe.recipe_id}_${recipe.title}`)

//             let newHistory
//             if (!alreadyInHistory) {
//                 newHistory = [recipe, ...recipes_history]
//             } else {
//                 if (alreadyInHistory.isFavorited !== recipe.isFavorited) {
//                     newHistory = recipes_history.map((rec) =>
//                         `${rec.id}_${rec.title}` === `${recipe.recipe_id}_${recipe.title}` ? { ...rec, isFavorited: recipe.isFavorited } : rec
//                     )
//                 } else {
//                     newHistory = recipes_history.filter((rec) => `${rec.id}_${rec.title}` !== `${recipe.recipe_id}_${recipe.title}`)
//                     newHistory = [recipe, ...newHistory]
//                 }
//             }

//             const jsonNewHistory = JSON.stringify(newHistory)
//             await t.none(`UPDATE preferences SET recipes_history = $2::jsonb WHERE user_id=$1`, [userId, jsonNewHistory])
//         })

//         return res.status(201).json({ msg: "History updated" })
//     } catch (error) {
//         console.error("Error in favorited_recipes:", error)
//         return res.status(500).json({ msg: "Internal server error" })
//     }
// }

export { getFoodPref, updateFoodPref, getBlacklist, updateBlacklist, getFavorites, getHistory, updateUserRecipes }
