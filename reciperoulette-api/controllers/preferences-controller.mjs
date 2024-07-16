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

const setPreferences = async (req, res) => {
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

export { setPreferences, updateBlacklist }
