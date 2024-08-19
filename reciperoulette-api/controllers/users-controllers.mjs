import { db } from "../utils/DBhelpers.mjs"

import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import bcrypt from "bcrypt"

dotenv.config()

const secretKey = process.env.SECRET_KEY

const getUsers = async (req, res) => {
    try {
        const users = await db.manyOrNone(`SELECT * FROM users`)
        res.status(200).json(users)
    } catch (error) {
        res.status(500).json({ msg: "internal server error" })
    }
}

const verifyToken = (req, res) => {
    try {
        const { user } = req.body
        console.log("user:", user)

        if (!user?.token) {
            return res.status(400).json({ msg: "Token missing" })
        }

        const decoded = jwt.verify(user.token, secretKey)
        res.status(201).json({ msg: "Valid token", token: decoded }) // Token valido
    } catch (err) {
        console.log(err)
        res.status(401).json({ msg: `Error while valdiating token: ${err.message}`, token: null }) // Token valido
    }
}

const signup = async (req, res) => {
    try {
        const { email, username, password } = req.body
        const emailExists = await db.oneOrNone(`SELECT email FROM users WHERE email=$1`, [email])
        const usernameExists = await db.oneOrNone(`SELECT username FROM users WHERE username=$1`, [username.toLowerCase()])

        if (!emailExists && !usernameExists) {
            const hashedPassword = await bcrypt.hash(password, 10)

            //creo il nuovo utente utilizzando i dati ricevuti
            const user = await db.one(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *;`, [
                username.toLowerCase(),
                email,
                hashedPassword,
            ])

            //assegno una riga di preferences, favorited, e inizializzo le colonne
            await db.none(
                `INSERT INTO preferences (user_id, recipes_history, blacklisted_ingredients, favorited_recipes) 
                VALUES ($1,json_build_array(), json_build_array(), json_build_array());`,
                [user.id]
            )
            await db.none(`INSERT INTO favorited (user_id, favorite_recipes ) VALUES ($1, $2);`, [user.id, []])

            // assegno un token e lo imposto per l'utente registrato
            const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: "7d" })
            await db.none(`UPDATE users SET token=$2 WHERE username=$1`, [username, token])

            let base64Image

            if (user.avatar) {
                base64Image = user.avatar.toString("base64")
            }

            res.status(201).json({
                id: user.id,
                username: user.username,
                email: user.email,
                token,
                avatar: user?.avatar,
                msg: "User created successfully",
            })
        } else {
            res.status(400).json({ msg: "A user with this email or username already exists" })
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Internal server error" })
    }
}

const login = async (req, res) => {
    try {
        const { username, password } = req.body
        let user = null

        if (username && password) {
            user = await db.oneOrNone(`SELECT * FROM users WHERE username=$1`, [username.toLowerCase()])
        }

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: "1m" })
            await db.none(`UPDATE users SET token=$2 WHERE username=$1`, [username, token])

            let base64Image

            if (user.avatar) {
                base64Image = user.avatar.toString("base64")
            }

            res.status(201).json({ msg: "Logged in", id: user.id, username: user.username, email: user.email, token, avatar: base64Image })
        } else {
            res.status(401).json({ msg: "Invalid credentials" })
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: error || "Internal server error" })
    }
}

const logout = async (req, res) => {
    try {
        const user = req.user

        if (!user) {
            return res.status(400).json({ msg: "User not authenticated" })
        }

        await db.none(`UPDATE users SET token=$2 WHERE id=$1`, [user.id, null])
        res.status(201).json({ msg: "User logged out" })
    } catch (error) {
        res.status(500).json({ msg: "Internal server error" })
    }
}

const changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body

        // checks for required parameters
        if (!userId || !newPassword || !oldPassword) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone("SELECT * FROM users WHERE id=$1", [userId])
        // checks that the user exists
        if (!user) {
            return res.status(400).json({ msg: "User not found" })
        }

        const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password)
        //checks that the oldPassword is correct before updating
        if (!isOldPasswordCorrect) {
            return res.status(403).json({ msg: "Old password is incorrect, please retry" })
        }

        const isNewPasswordDifferent = await bcrypt.compare(oldPassword, newPassword)
        //checks that the new and old passwords are different
        if (!isNewPasswordDifferent) {
            return res.status(409).json({ msg: "The new password must be different from the previous one" })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await db.none("UPDATE users SET password=$2 WHERE id=$1", [userId, hashedPassword]) // update pass
        return res.status(201).json({ msg: "Your password was successfully updated" })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

const updateUserData = async (req, res) => {
    try {
        const { userId, newAvatar, oldPassword, newPassword, newEmail, newUsername } = req.body

        if (!userId || (!newAvatar && !newPassword && !newEmail && !newUsername)) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone("SELECT * FROM users WHERE id=$1", [userId])

        if (!user) {
            return res.status(400).json({ msg: "User not found" })
        }

        if (newAvatar) {
            // Decodifica la stringa base64
            const avatarBuffer = Buffer.from(newAvatar, "base64")
            await db.none("UPDATE users SET avatar = $2 WHERE id = $1", [userId, avatarBuffer])
        }

        if (newPassword) {
            const oldPWCorrect = await bcrypt.compare(oldPassword, user.password)

            if (!oldPassword || !oldPWCorrect) {
                return res.status(400).json({ msg: "The old password is incorrect" })
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10)
            await db.none("UPDATE users SET password = $2 WHERE id = $1", [userId, hashedPassword])
        }

        if (newUsername) {
            await db.none("UPDATE users SET username = $2 WHERE id = $1", [userId, newUsername])
        }

        if (newEmail) {
            await db.none("UPDATE users SET email = $2 WHERE id = $1", [userId, newEmail])
        }

        return res.status(201).json({ msg: "User data updated successfully" })
    } catch (error) {
        console.error("Error updating user data:", error)
        return res.status(500).json({ msg: "Internal server error" })
    }
}

export { getUsers, signup, login, logout, changePassword, updateUserData, verifyToken }
