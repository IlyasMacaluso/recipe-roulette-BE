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

        res.status(200).json({ msg: "Blacklist updated" })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const setPreferredPrepTime = async (req, res) => {
    try {
        const { prepTime, userId } = req.body

        // Verifica che tutti i parametri necessari siano presenti
        if (!prepTime || !userId) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const { preferred_preparation_times } = await db.one(`UPDATE preferences SET preferred_preparation_times=$2 WHERE user_id=$1 RETURNING preferred_preparation_times`, [
            userId,
            prepTime,
        ])

        res.status(200).json({ msg: "Preferences preferred_preparation_time updated", preferred_preparation_times })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        res.status(500).json({ msg: "Internal server error" })
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

        res.status(200).json({ msg: "Preferences preparation_time updated", preferred_caloric_apport })
    } catch (error) {
        console.error("Error in blacklistIngredient:", error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

export { blacklistIngredient, setPreferredCaloricApport, setPreferredPrepTime }
