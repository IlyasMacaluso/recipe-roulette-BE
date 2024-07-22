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
        console.log(error)
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

        console.log(preferences)
        res.status(200).json(preferences)
    } catch (error) {
        console.log(error)
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

        console.log(userId)

        if (!userId) {
            throw new Error("Missing required parameters")
        }

        const { favorited_recipes } = await db.oneOrNone(`SELECT favorited_recipes FROM preferences WHERE user_id=$1`, [userId])

        console.log(favorited_recipes)
        res.status(200).json(favorited_recipes || [])
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const updateFavoriteRecipes = async (req, res) => {
    try {
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
        const { favorited_recipes } = (await db.oneOrNone(`SELECT favorited_recipes FROM preferences WHERE user_id=$1`, [userId])) || {
            favorited_recipes: [],
        }

        let newFavorited

        if (recipe.isFavorited) {
            // Controlla se la ricetta è già nei preferiti
            const alreadyFavorited = favorited_recipes.find((rec) => String(rec.id) + rec.title === String(recipe.id) + rec.title)

            if (!alreadyFavorited) {
                newFavorited = [...favorited_recipes, recipe]
            } else {
                newFavorited = favorited_recipes
            }
        } else {
            // Rimuovi la ricetta dai preferiti (usando solo l'id per il confronto)
            newFavorited = favorited_recipes.filter((rec) => String(rec.id) + rec.title !== String(recipe.id) + rec.title)
        }

        // Serializza l'array aggiornato in JSON prima di passarlo alla query
        const jsonNewFavorited = JSON.stringify(newFavorited)

        // Esegui l'aggiornamento nel database
        await db.none(`UPDATE preferences SET favorited_recipes = $2::jsonb WHERE user_id=$1`, [userId, jsonNewFavorited])

        return res.status(201).json({ msg: "Favorited updated", newFavorited })
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
        console.log(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const updateRecipesHistory = async (req, res) => {
    try {
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

        // Ottieni la cronologia dall'utente
        const { recipes_history } = (await db.oneOrNone(`SELECT recipes_history FROM preferences WHERE user_id=$1`, [userId])) || {
            recipes_history: [],
        }

        // Controlla se la ricetta è già nella cronologia
        const alreadyInHistory = recipes_history.find((rec) => String(rec.id) + rec.title === String(recipe.id) + recipe.title)

        let newHistory // inizializzo una variabile in cui salvare i nuovi dati

        if (!alreadyInHistory) {
            newHistory = [recipe, ...recipes_history]
        } else {
            //se è già nella cronologia la spostiamo in cima (la rimuoviamo e poi la riaggiungiamo all'inizio dell array)
            newHistory = recipes_history.filter((rec) => String(rec.id) + rec.title !== String(recipe.id) + recipe.title)
            newHistory = [recipe, ...newHistory]
        }

        // Serializza l'array aggiornato in JSON prima di passarlo alla query
        const jsonNewHistory = JSON.stringify(newHistory)

        // Esegui l'aggiornamento nel database
        await db.none(`UPDATE preferences SET recipes_history = $2::jsonb WHERE user_id=$1`, [userId, jsonNewHistory])

        return res.status(201).json({ msg: "History updated", newHistory })
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
