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

const getFavoriteRecipes = async (req, res) => {
    try {
        const userId = req.params.userId

        if (!userId) {
            throw new Error("Missing required parameters")
        }

        const { favorited_recipes } = await db.oneOrNone(`SELECT favorited_recipes FROM preferences WHERE user_id=$1`, [userId])

        res.status(200).json(favorited_recipes || [])
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const updateFavoriteRecipes = async (req, res) => {
    try {
        const { recipe, userId } = req.body

        if (!userId || !recipe) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone(`SELECT * FROM users WHERE id=$1`, [userId])
        if (!user) {
            return res.status(400).json({ msg: "No such user" })
        }

        await db.tx(async (t) => {
            const result = await t.oneOrNone(`SELECT favorited_recipes FROM preferences WHERE user_id=$1 FOR UPDATE`, [userId])

            let { favorited_recipes } = result || { favorited_recipes: [] }
            const alreadyFavorited = favorited_recipes.find((rec) => `${rec.id}_${rec.title}` === `${recipe.id}_${recipe.title}`)

            let newFavorited

            if (recipe.isFavorited) {
                if (!alreadyFavorited) {
                    newFavorited = [...favorited_recipes, recipe]
                } else {
                    newFavorited = favorited_recipes
                }
            } else {
                newFavorited = favorited_recipes.filter((rec) => `${rec.id}_${rec.title}` !== `${recipe.id}_${recipe.title}`)
            }

            const jsonNewFavorited = JSON.stringify(newFavorited)
            await t.none(`UPDATE preferences SET favorited_recipes = $2::jsonb WHERE user_id=$1`, [userId, jsonNewFavorited])
        })

        return res.status(201).json({ msg: "Favorited updated" })
    } catch (error) {
        console.error("Error in favorited_recipes:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const getRecipesHistory = async (req, res) => {
    try {
        const userId = req.params.userId

        if (!userId) {
            throw new Error("Missing required parameters")
        }

        const { recipes_history } = await db.oneOrNone(`SELECT recipes_history FROM preferences WHERE user_id=$1`, [userId])

        res.status(200).json(recipes_history || [])
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const updateRecipesHistory = async (req, res) => {
    try {
        const { recipe, userId } = req.body

        if (!userId || !recipe) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone(`SELECT * FROM users WHERE id=$1`, [userId])
        if (!user) {
            return res.status(400).json({ msg: "User not found" })
        }

        await db.tx(async (t) => {
            const result = await t.oneOrNone(`SELECT recipes_history FROM preferences WHERE user_id=$1 FOR UPDATE`, [userId])

            let { recipes_history } = result || { recipes_history: [] }
            const alreadyInHistory = recipes_history.find((rec) => `${rec.id}_${rec.title}` === `${recipe.id}_${recipe.title}`)

            let newHistory
            if (!alreadyInHistory) {
                newHistory = [recipe, ...recipes_history]
            } else {
                if (alreadyInHistory.isFavorited !== recipe.isFavorited) {
                    newHistory = recipes_history.map((rec) =>
                        `${rec.id}_${rec.title}` === `${recipe.id}_${recipe.title}` ? { ...rec, isFavorited: recipe.isFavorited } : rec
                    )
                } else {
                    newHistory = recipes_history.filter((rec) => `${rec.id}_${rec.title}` !== `${recipe.id}_${recipe.title}`)
                    newHistory = [recipe, ...newHistory]
                }
            }

            const jsonNewHistory = JSON.stringify(newHistory)
            await t.none(`UPDATE preferences SET recipes_history = $2::jsonb WHERE user_id=$1`, [userId, jsonNewHistory])
        })

        return res.status(201).json({ msg: "History updated" })
    } catch (error) {
        console.error("Error in favorited_recipes:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

export {
    getFoodPref,
    updateFoodPref,
    getBlacklist,
    updateBlacklist,
    getFavoriteRecipes,
    updateFavoriteRecipes,
    getRecipesHistory,
    updateRecipesHistory,
}
