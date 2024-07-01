import { db } from "../utils/DBhelpers.mjs"

const blacklistIngredient = async (req, res) => {
    try {
        const { ingredientId, isBlacklisted, userId } = req.body

        // Verifica che tutti i parametri necessari siano presenti
        if (!ingredientId || !userId || isBlacklisted === undefined) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        // Controlla che l'ingrediente e l'utente esistano nel database
        const ingredient = await db.oneOrNone(`SELECT * FROM ingredients WHERE id=$1`, [ingredientId])
        const user = await db.oneOrNone(`SELECT * FROM users WHERE id=$1`, [userId])

        if (!ingredient || !user) {
            return res.status(400).json({ msg: "Ingredient or user not found" })
        }

        // Ottieni l'elenco degli ingredienti blacklisted dell'utente
        const { blacklisted_ingredients } = await db.oneOrNone(
            `SELECT blacklisted_ingredients FROM preferences WHERE user_id=$1`,
            [userId]
        )
        // Se l'array blacklisted_ingredients esiste, isBlacklisted è true, e l'ingrediente non si trova già in blacklisted_ingredients, lo aggiungo alla lista
        if (isBlacklisted) {
            const alreadyBlacklisted = blacklisted_ingredients.includes(ingredientId)

            if (!alreadyBlacklisted) {
                await db.none(`UPDATE preferences SET blacklisted_ingredients = blacklisted_ingredients || $2 WHERE user_id=$1`, [
                    userId,
                    [ingredientId],
                ])
            }
        } else {
            await db.none(
                `UPDATE preferences SET blacklisted_ingredients = array_remove(blacklisted_ingredients, $2) WHERE user_id=$1`,
                [userId, ingredientId]
            )
        }

        return res.status(200).json({ msg: "Blacklist updated" })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const setPreferredPrepTime = async (req, res) => {
    try {
        const { prepTime, userId } = req.body

        // Verifica che tutti i parametri necessari siano presenti
        if (!prepTime || !userId) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const { preferred_preparation_times } = await db.one(
            `UPDATE preferences SET preferred_preparation_times=$2 WHERE user_id=$1 RETURNING preferred_preparation_times`,
            [userId, prepTime]
        )

        return res.status(200).json({ msg: "Preferences preferred_preparation_time updated", preferred_preparation_times })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const setPreferredCaloricApport = async (req, res) => {
    try {
        const { caloricApport, userId } = req.body

        // Verifica che tutti i parametri necessari siano presenti
        if (!caloricApport || !userId) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const { preferred_caloric_apport } = await db.one(
            `UPDATE preferences SET preferred_caloric_apport=$2 WHERE user_id=$1 RETURNING preferred_caloric_apport `,
            [userId, caloricApport]
        )

        return res.status(200).json({ msg: "Preferences preparation_time updated", preferred_caloric_apport })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

const setPreferredCuisines = async () => {
    try {
        const cuisines = req.body
        if (cuisines) {
            const { preferred_cuisines } = await db.one(
                `UPDATE preferences set preferred_cuisines=$2 where id=$1 RETURNING preferred_cuisines`,
                [cuisines]
            )
            return res.status(200).json({ msg: "Preferences preparation_time updated", preferred_cuisines })
        } else {
            return res.status(400).json({ msg: "Missing required parameters" })
        }
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

//unica functione che riceve le preferenze e le imposta

const setPreferences = async (req, res) => {
    try {
        const { reqPreferences, userId } = req.body
        console.log("preferences", reqPreferences)

        if (reqPreferences && userId) {
            const { preferences } = await db.one(`UPDATE preferences SET preferences=$2 WHERE user_id=$1 RETURNING preferences`, [
                userId,
                reqPreferences,
            ])
            return res.status(200).json({ msg: "Preferences updated successfully", preferences })
        } else {
            return res.status(400).json({ msg: "Missing required parameters" })
        }
    } catch (error) {
        console.error("Error:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

export { blacklistIngredient, setPreferredCaloricApport, setPreferredPrepTime, setPreferences, setPreferredCuisines }
