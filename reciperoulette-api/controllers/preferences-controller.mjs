import { db } from "../utils/DBhelpers.mjs"

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

        // console.log(blacklisted_ingredients)
        return res.status(201).json({ msg: "Blacklist updated", blacklisted_ingredients })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        return res.status(500).json({ msg: "Internal server error" })
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

const updateFavoriteRecipes = async (req, res) => {
    try {
        console.log(req.body)
        const { recipe, userId } = req.body

        // Verifica che tutti i parametri necessari siano presenti
        if (!userId || !recipe) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        // Controlla che l'utente esista nel database
        const user = await db.oneOrNone(`SELECT * FROM users WHERE id=$1`, [userId])

        if (!user) {
            return res.status(400).json({ msg: "No such user" })
        }

        // Ottieni l'elenco delle ricette aggiunte ai preferiti dall'utente
        const { favorited_recipes } = await db.oneOrNone(`SELECT favorited_recipes FROM preferences WHERE user_id=$1`, [userId])

        if (recipe.isFavorited) {
            const alreadyFavorited = favorited_recipes.find((rec) => rec.id + rec.title == recipe.id + rec.title)
            console.log(!!alreadyFavorited);

            if (!alreadyFavorited) {
                //aggiungo se non è già nei preferiti
                await db.none(`UPDATE preferences SET favorited_recipes = favorited_recipes || $2 WHERE user_id=$1`, [userId, recipe])
            }
        } else {
            //se è nei preferiti la rimuovo
            const newFavorited = favorited_recipes.filter((rec) => rec.id + rec.title !== recipe.id + recipe.title)
            const jsonNewFavorited = JSON.stringify(newFavorited)
            await db.none(`UPDATE preferences SET favorited_recipes = $2 WHERE user_id=$1`, [userId, jsonNewFavorited])
        }
        const newFavorited = await db.one("SELECT favorited_recipes FROM preferences WHERE user_id=$1", [userId])
        return res.status(201).json({ msg: "Favorited updated", favorites: newFavorited })
    } catch (error) {
        console.error("Error in favorited_recipes:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

export { updateFoodPref, updateBlacklist, updateFavoriteRecipes }
