import { db } from "../utils/DBhelpers.mjs"

import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import bcrypt from "bcrypt"
import nodemailer from "nodemailer"

dotenv.config()
const mailPass = process.env.MAIL_PASS
const secretKey = process.env.SECRET_KEY

// transporter config
const transporter = nodemailer.createTransport({
    service: "gmail", // o il servizio che preferisci
    auth: {
        user: "ilyas.macaluso@gmail.com",
        pass: mailPass, // Utilizza variabili d'ambiente per la sicurezza
    },
})

const getUser = async (req, res) => {
    try {
        const { userId } = req.params // Estrai l'ID da req.params

        if (!userId) {
            return res.status(400).json({ msg: "Id is required" }) // Usa 404 per utente non trovato
        }

        const user = await db.oneOrNone(`SELECT username, email, token, is_verified FROM users WHERE id=$1`, [userId])

        if (!user) {
            return res.status(404).json({ msg: "User not ???found" }) // Usa 404 per utente non trovato
        }

        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ msg: error.message || "Internal server error" })
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

        return res.status(201).json({ msg: "Valid token", token: decoded }) // Token valido
    } catch (err) {
        console.log(err)
        return res.status(401).json({ msg: `Invalid token! ${err.message}`, token: null }) // Token valido
    }
}

const signup = async (req, res) => {
    try {
        const { email, username, password } = req.body
        const emailExists = await db.oneOrNone(`SELECT email FROM users WHERE email=$1`, [email])
        const usernameExists = await db.oneOrNone(`SELECT username FROM users WHERE username=$1`, [username.toLowerCase()])

        if (emailExists && usernameExists) {
            return res.status(400).json({ msg: "A user with this email or username already exists" })
        }

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

        // assegno un token e lo imposto per l'utente registrato
        const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: "7d" })
        await db.none(`UPDATE users SET token=$2 WHERE username=$1`, [username, token])

        let base64Image

        if (user.avatar) {
            base64Image = user.avatar.toString("base64")
        }

        sendVerificationEmail(user.email, token)

        return res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            token,
            avatar: user?.avatar,
            msg: "User created successfully",
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

const login = async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(401).json({ msg: "Missing required parameters (username or password)" })
        }

        const user = await db.oneOrNone(`SELECT * FROM users WHERE username=$1`, [username.toLowerCase()])

        if (!user) {
            return res.status(400).json({ msg: "User not found" })
        }

        if (!user.is_verified) {
            return res.status(400).json({ msg: "User email not verified, please verify your email." })
        }

        const validCredentials = await bcrypt.compare(password, user.password)

        if (!validCredentials) {
            return res.status(401).json({ msg: "Invalid credentials" })
        }

        // user exists, email is verified, credentials are valid => we create a token
        const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: "7d" })
        await db.none(`UPDATE users SET token=$2 WHERE username=$1`, [username, token])

        // we convert user profile image to base64 to reduce its size
        let base64Image

        if (user.avatar) {
            base64Image = user.avatar.toString("base64")
        }

        return res
            .status(201)
            .json({ msg: "Logged in", id: user.id, username: user.username, email: user.email, token, avatar: base64Image })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

const logout = async (req, res) => {
    try {
        const user = req.user

        if (!user) {
            return res.status(400).json({ msg: "User not authenticated" })
        }

        await db.none(`UPDATE users SET token=$2 WHERE id=$1`, [user.id, null])
        return res.status(201).json({ msg: "User logged out" })
    } catch (error) {
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id // Estrai l'ID utente da req.user
        const { oldPassword, newPassword } = req.body

        // checks for required parameters
        if (!userId || !newPassword || !oldPassword) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone("SELECT password FROM users WHERE id=$1", [userId])
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
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

// Funzione per inviare l'email di verifica
const sendVerificationEmail = (email, token) => {
    const mailOptions = {
        from: "ilyas.macaluso@gmail.com",
        to: email,
        subject: "RecipeRoulette: Verify your email",
        text: `Click the link to verify your email: http://localhost:3000/api/users/verify-email?token=${token}`,
    }
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Errore nell'invio dell'email:", error)
        } else {
            console.log("Email inviata:", info.response)
        }
    })
}

const sendResetPassEmail = (email, token) => {
    const mailOptions = {
        from: "ilyas.macaluso@gmail.com",
        to: email,
        subject: "RecipeRoulette: Reset password",
        text: `Click the link to reset your password: http://localhost:5173/reset-password?token=${token}`,
    }
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Errore nell'invio dell'email:", error)
        } else {
            console.log("Email inviata:", info.response)
        }
    })
}

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query

        if (!token) {
            return res.status(400).send("Missing Token.")
        }

        // Verifica il token e decodifica
        let decoded
        try {
            decoded = jwt.verify(token, secretKey)
        } catch (err) {
            return res.status(401).send("Invalid token.")
        }

        // Recupera l'ID dell'utente dal token decodificato
        const userId = decoded.id

        // Trova l'utente nel database
        const user = await db.oneOrNone("SELECT id FROM users WHERE id=$1", [userId])

        if (!user) {
            return res.status(404).send("User not found.")
        }

        // Aggiorna il flag isVerified
        await db.none("UPDATE users SET is_verified=$1 WHERE id=$2", [true, userId])

        return res.status(200).json({ msg: "Email successfully verified!" })
    } catch (error) {
        return res.status(500).json({ msg: error.message || "Internal server error." })
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { emailOrUsername } = req.body
        console.log(emailOrUsername)

        if (!emailOrUsername) {
            return
        }

        const user = await db.oneOrNone("SELECT id, email, username FROM users WHERE email = $1 OR username = $1", [emailOrUsername])

        if (!user) {
            return res.status(404).json({ msg: "Email sent successfully" }) // users should not know which emails or usernames are in the database
        }

        const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: "1h" })
        sendResetPassEmail(user.email, token)
        return res.status(201).json({ msg: "Email sent successfully" })
    } catch (error) {
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

const resetPassword = async (req, res) => {
    try {
        const userId = req.user.id // Estrai l'ID utente da req.user
        const { password } = req.body

        // checks for required parameters
        if (!userId || !password) {
            return res.status(400).json({ msg: "Missing required parameters" })
        }

        const user = await db.oneOrNone("SELECT id FROM users WHERE id=$1", [userId])

        // checks that the user exists
        if (!user) {
            return res.status(400).json({ msg: "User not found" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        await db.none("UPDATE users SET password=$2 WHERE id=$1", [userId, hashedPassword]) // update pass
        return res.status(201).json({ msg: "Your password was successfully updated" })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: error.message || "Internal server error" })
    }
}

export { getUser, signup, login, logout, changePassword, updateUserData, verifyToken, verifyEmail, forgotPassword, resetPassword }
